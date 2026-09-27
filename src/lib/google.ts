import { env } from "./env";
import { getSession, saveSession, type Session } from "./session";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.modify",
];

export const redirectUri = () => `${env.appUrl}/api/auth/callback`;

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: env.allowedEmail,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      ...body,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export function exchangeCode(code: string) {
  return tokenRequest({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
  });
}

export interface GoogleProfile {
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo error ${res.status}`);
  return res.json();
}

/** Restituisce un access token valido, rinnovandolo se sta per scadere. */
async function getAccessToken(session: Session): Promise<string> {
  if (Date.now() < session.accessTokenExpiresAt - 60_000) {
    return session.accessToken;
  }
  const token = await tokenRequest({
    refresh_token: session.refreshToken,
    grant_type: "refresh_token",
  });
  const updated: Session = {
    ...session,
    accessToken: token.access_token,
    accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
    refreshToken: token.refresh_token ?? session.refreshToken,
  };
  await saveSession(updated);
  // Aggiorna anche l'oggetto in memoria per le chiamate successive.
  Object.assign(session, updated);
  return updated.accessToken;
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Non autenticato");
  }
}

async function googleFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const session = await getSession();
  if (!session) throw new NotAuthenticatedError();
  const accessToken = await getAccessToken(session);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google API ${res.status}: ${await res.text()}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string; responseStatus?: string }[];
  hangoutLink?: string;
  colorId?: string;
}

export async function listEvents(opts: {
  timeMin: string;
  timeMax: string;
  query?: string;
  maxResults?: number;
}): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: opts.timeMin,
    timeMax: opts.timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(opts.maxResults ?? 50),
    timeZone: env.timeZone,
  });
  if (opts.query) params.set("q", opts.query);
  const data = await googleFetch<{ items?: CalendarEvent[] }>(`${CAL}?${params}`);
  return data.items ?? [];
}

export interface EventInput {
  summary?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  attendees?: string[];
}

function toEventBody(input: EventInput) {
  const time = (value: string) =>
    input.allDay ? { date: value.slice(0, 10) } : { dateTime: value, timeZone: env.timeZone };
  return {
    ...(input.summary !== undefined && { summary: input.summary }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.start && { start: time(input.start) }),
    ...(input.end && { end: time(input.end) }),
    ...(input.attendees && { attendees: input.attendees.map((email) => ({ email })) }),
  };
}

export function createEvent(input: EventInput) {
  return googleFetch<CalendarEvent>(CAL, {
    method: "POST",
    body: JSON.stringify(toEventBody(input)),
  });
}

export function updateEvent(eventId: string, input: EventInput) {
  return googleFetch<CalendarEvent>(`${CAL}/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(toEventBody(input)),
  });
}

export function deleteEvent(eventId: string) {
  return googleFetch<void>(`${CAL}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}

/* ------------------------------------------------------------------ */
/* Gmail                                                               */
/* ------------------------------------------------------------------ */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: GmailHeader[];
}

interface GmailMessageRaw {
  id: string;
  threadId: string;
  snippet: string;
  labelIds?: string[];
  internalDate: string;
  payload: GmailPart;
}

export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface EmailFull extends EmailSummary {
  body: string;
  messageId: string;
}

const header = (msg: GmailMessageRaw, name: string) =>
  msg.payload.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractBody(part: GmailPart): string {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const child of part.parts) {
      const text = extractBody(child);
      if (text) return text;
    }
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}

function toSummary(msg: GmailMessageRaw): EmailSummary {
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: header(msg, "From"),
    to: header(msg, "To"),
    subject: header(msg, "Subject"),
    date: new Date(Number(msg.internalDate)).toISOString(),
    snippet: msg.snippet,
    unread: msg.labelIds?.includes("UNREAD") ?? false,
  };
}

export async function searchEmails(query: string, maxResults = 10): Promise<EmailSummary[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const list = await googleFetch<{ messages?: { id: string }[] }>(`${GMAIL}/messages?${params}`);
  const ids = list.messages ?? [];
  const messages = await Promise.all(
    ids.map(({ id }) =>
      googleFetch<GmailMessageRaw>(
        `${GMAIL}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`,
      ),
    ),
  );
  return messages.map(toSummary);
}

export async function readEmail(id: string): Promise<EmailFull> {
  const msg = await googleFetch<GmailMessageRaw>(
    `${GMAIL}/messages/${encodeURIComponent(id)}?format=full`,
  );
  return {
    ...toSummary(msg),
    body: extractBody(msg.payload).slice(0, 20_000),
    messageId: header(msg, "Message-ID"),
  };
}

function encodeHeader(value: string): string {
  // RFC 2047 per soggetti con caratteri non ASCII (es. lettere accentate).
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  replyToMessageId?: string;
}): Promise<{ id: string; threadId: string }> {
  let threadId: string | undefined;
  let inReplyTo: string | undefined;
  if (input.replyToMessageId) {
    const original = await readEmail(input.replyToMessageId);
    threadId = original.threadId;
    inReplyTo = original.messageId;
  }
  const lines = [
    `To: ${input.to}`,
    ...(input.cc ? [`Cc: ${input.cc}`] : []),
    `Subject: ${encodeHeader(input.subject)}`,
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`] : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.body,
  ];
  const raw = Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
  return googleFetch(`${GMAIL}/messages/send`, {
    method: "POST",
    body: JSON.stringify({ raw, ...(threadId && { threadId }) }),
  });
}
