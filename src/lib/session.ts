import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

export const SESSION_COOKIE = "ca_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 giorni

export interface Session {
  email: string;
  name?: string;
  picture?: string;
  refreshToken: string;
  accessToken: string;
  /** Scadenza dell'access token Google, in millisecondi epoch. */
  accessTokenExpiresAt: number;
}

async function getKey(): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(env.sessionSecret),
  );
  return new Uint8Array(digest);
}

export async function encryptSession(session: Session): Promise<string> {
  return new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .encrypt(await getKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, await getKey());
    const session = payload as unknown as Session;
    // Difesa in profondità: la sessione vale solo per l'email autorizzata.
    if (session.email?.toLowerCase() !== env.allowedEmail) return null;
    return session;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

const DEMO_SESSION: Session = {
  email: "demo@localhost",
  name: "Yuri",
  refreshToken: "",
  accessToken: "",
  accessTokenExpiresAt: Number.MAX_SAFE_INTEGER,
};

export async function getSession(): Promise<Session | null> {
  if (env.demo) return DEMO_SESSION;
  const store = await cookies();
  return decryptSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Salva la sessione nel cookie. Funziona solo in Route Handler e Server
 * Action: nei Server Component Next.js non permette di scrivere cookie,
 * quindi lì l'errore viene ignorato (il token aggiornato vale comunque per
 * la richiesta corrente).
 */
export async function saveSession(session: Session): Promise<void> {
  try {
    const store = await cookies();
    store.set(SESSION_COOKIE, await encryptSession(session), sessionCookieOptions);
  } catch {
    // Server Component: impossibile scrivere cookie, va bene così.
  }
}
