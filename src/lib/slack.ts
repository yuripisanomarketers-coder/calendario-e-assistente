import { demo } from "./demo";
import { env } from "./env";

export class SlackNotConfiguredError extends Error {
  constructor() {
    super("Slack non è configurato: imposta SLACK_USER_TOKEN.");
  }
}

export const isSlackConfigured = () => Boolean(env.demo || env.slackUserToken);

interface SlackResponse {
  ok: boolean;
  error?: string;
}

async function slack<T extends SlackResponse>(
  method: string,
  params: Record<string, string | number | boolean | undefined> = {},
  post = false,
): Promise<T> {
  const token = env.slackUserToken;
  if (!token) throw new SlackNotConfiguredError();
  const clean = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );
  const url = `https://slack.com/api/${method}`;
  const res = post
    ? await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(params),
        cache: "no-store",
      })
    : await fetch(`${url}?${new URLSearchParams(clean)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
  const data = (await res.json()) as T;
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error ?? res.status}`);
  return data;
}

/* Nomi utente, memorizzati per non richiederli ogni volta. */
const userNames = new Map<string, string>();

async function userName(id: string | undefined): Promise<string> {
  if (!id) return "sconosciuto";
  const cached = userNames.get(id);
  if (cached) return cached;
  try {
    const data = await slack<SlackResponse & {
      user: { real_name?: string; name: string; profile?: { display_name?: string } };
    }>("users.info", { user: id });
    const name = data.user.profile?.display_name || data.user.real_name || data.user.name;
    userNames.set(id, name);
    return name;
  } catch {
    return id;
  }
}

async function resolveMentions(text: string): Promise<string> {
  const ids = [...new Set([...text.matchAll(/<@([A-Z0-9]+)>/g)].map((m) => m[1]))];
  let out = text;
  for (const id of ids) {
    out = out.replaceAll(`<@${id}>`, `@${await userName(id)}`);
  }
  return out;
}

export interface SlackChannel {
  id: string;
  name: string;
  type: "canale" | "privato" | "dm" | "gruppo";
}

interface RawChannel {
  id: string;
  name?: string;
  user?: string;
  is_im?: boolean;
  is_mpim?: boolean;
  is_private?: boolean;
  is_member?: boolean;
}

export async function listChannels(): Promise<SlackChannel[]> {
  if (env.demo) return demo.listChannels();
  const data = await slack<SlackResponse & { channels: RawChannel[] }>("users.conversations", {
    types: "public_channel,private_channel,im,mpim",
    exclude_archived: true,
    limit: 200,
  });
  return Promise.all(
    data.channels.map(async (c) => ({
      id: c.id,
      name: c.is_im ? `@${await userName(c.user)}` : (c.name ?? c.id),
      type: c.is_im ? "dm" : c.is_mpim ? "gruppo" : c.is_private ? "privato" : "canale",
    })),
  );
}

export interface SlackMessage {
  ts: string;
  date: string;
  user: string;
  text: string;
  threadReplies?: number;
  channel?: string;
  permalink?: string;
}

interface RawMessage {
  ts: string;
  user?: string;
  username?: string;
  text: string;
  reply_count?: number;
  channel?: { id: string; name: string };
  permalink?: string;
}

async function toMessage(m: RawMessage): Promise<SlackMessage> {
  return {
    ts: m.ts,
    date: new Date(Number(m.ts) * 1000).toISOString(),
    user: m.username ?? (await userName(m.user)),
    text: await resolveMentions(m.text),
    ...(m.reply_count && { threadReplies: m.reply_count }),
    ...(m.channel && { channel: m.channel.name }),
    ...(m.permalink && { permalink: m.permalink }),
  };
}

export async function channelHistory(
  channel: string,
  opts: { limit?: number; oldest?: string } = {},
): Promise<SlackMessage[]> {
  if (env.demo) return demo.channelHistory(channel);
  const data = await slack<SlackResponse & { messages: RawMessage[] }>("conversations.history", {
    channel,
    limit: opts.limit ?? 30,
    oldest: opts.oldest,
  });
  return Promise.all(data.messages.map(toMessage));
}

export async function threadReplies(channel: string, ts: string): Promise<SlackMessage[]> {
  if (env.demo) return [];
  const data = await slack<SlackResponse & { messages: RawMessage[] }>("conversations.replies", {
    channel,
    ts,
    limit: 100,
  });
  return Promise.all(data.messages.map(toMessage));
}

export async function searchMessages(query: string, count = 20): Promise<SlackMessage[]> {
  if (env.demo) return demo.searchMessages(query);
  const data = await slack<SlackResponse & { messages: { matches: RawMessage[] } }>(
    "search.messages",
    { query, count, sort: "timestamp" },
  );
  return Promise.all(data.messages.matches.map(toMessage));
}

export async function postMessage(channel: string, text: string, threadTs?: string) {
  if (env.demo) return demo.postMessage(channel);
  const data = await slack<SlackResponse & { ts: string; channel: string }>(
    "chat.postMessage",
    { channel, text, thread_ts: threadTs },
    true,
  );
  return { ts: data.ts, channel: data.channel };
}

/** Messaggi recenti (ultimi giorni) scritti da altri, per la dashboard. */
export async function recentMessagesFromOthers(days = 2, limit = 10): Promise<SlackMessage[]> {
  if (env.demo) return demo.recentMessages(limit);
  const me = await slack<SlackResponse & { user_id: string }>("auth.test");
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const data = await slack<SlackResponse & { messages: { matches: RawMessage[] } }>(
    "search.messages",
    { query: `after:${since}`, count: 50, sort: "timestamp", sort_dir: "desc" },
  );
  const others = data.messages.matches.filter((m) => m.user !== me.user_id).slice(0, limit);
  return Promise.all(others.map(toMessage));
}
