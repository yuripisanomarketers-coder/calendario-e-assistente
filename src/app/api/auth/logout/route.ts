import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.redirect(new URL("/login", env.appUrl), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
