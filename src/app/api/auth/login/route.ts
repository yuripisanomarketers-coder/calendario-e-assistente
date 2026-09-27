import { NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/google";

export async function GET() {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildGoogleAuthUrl(state));
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
