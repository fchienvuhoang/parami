import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { googleConfig, OAUTH_COOKIE } from "@/lib/google-auth";
import { safeRedirectPath } from "@/lib/auth";

export async function GET(request: Request) {
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: "Đăng nhập Google chưa được cấu hình." }, { status: 503 });
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const next = safeRedirectPath(new URL(request.url).searchParams.get("next"));
  const transaction = await new SignJWT({ state, nonce, verifier, next })
    .setProtectedHeader({ alg: "HS256" }).setIssuer("parami-oauth").setAudience("google-login")
    .setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
    response_type: "code", scope: "openid email", state, nonce, prompt: "select_account",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_COOKIE, transaction, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
