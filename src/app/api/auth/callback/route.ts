import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { exchangeCode, fetchProfile } from "@/lib/google";
import { SESSION_COOKIE, encryptSession, sessionCookieOptions } from "@/lib/session";

function fail(request: NextRequest, error: string) {
  const url = new URL("/login", env.appUrl);
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.delete("oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  if (params.get("error")) return fail(request, "annullato");
  if (!code || !state || state !== request.cookies.get("oauth_state")?.value) {
    return fail(request, "stato");
  }

  try {
    const token = await exchangeCode(code);
    const profile = await fetchProfile(token.access_token);

    if (!profile.email_verified || profile.email.toLowerCase() !== env.allowedEmail) {
      return fail(request, "non-autorizzato");
    }
    if (!token.refresh_token) return fail(request, "refresh");

    const response = NextResponse.redirect(new URL("/", env.appUrl));
    response.cookies.delete("oauth_state");
    response.cookies.set(
      SESSION_COOKIE,
      await encryptSession({
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        refreshToken: token.refresh_token,
        accessToken: token.access_token,
        accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
      }),
      sessionCookieOptions,
    );
    return response;
  } catch (error) {
    console.error("Errore login Google", error);
    return fail(request, "google");
  }
}
