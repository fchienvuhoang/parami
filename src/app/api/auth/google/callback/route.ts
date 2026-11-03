import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { googleConfig, OAUTH_COOKIE, verifyGoogleIdentity } from "@/lib/google-auth";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, getAdminSessionMaxAge, safeRedirectPath } from "@/lib/auth";

export async function GET(request: Request) {
  const config = googleConfig();
  const origin = config?.origin ?? new URL(request.url).origin;
  let response: NextResponse;
  try {
    if (!config) throw new Error("Missing configuration");
    const params = new URL(request.url).searchParams;
    const token = (await cookies()).get(OAUTH_COOKIE)?.value;
    if (!token || params.has("error")) throw new Error("Invalid OAuth response");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET!), {
      algorithms: ["HS256"], issuer: "parami-oauth", audience: "google-login", requiredClaims: ["exp", "iat"],
    });
    if (typeof payload.state !== "string" || payload.state !== params.get("state") ||
        typeof payload.nonce !== "string" || typeof payload.verifier !== "string" || !params.get("code")) throw new Error("Invalid state");
    const exchange = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: params.get("code")!, client_id: config.clientId,
        client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: payload.verifier }),
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!exchange.ok) throw new Error("Token exchange failed");
    const data = await exchange.json();
    if (typeof data.id_token !== "string") throw new Error("Missing ID token");
    const sub = await verifyGoogleIdentity(data.id_token, config.clientId, payload.nonce);
    response = NextResponse.redirect(new URL(safeRedirectPath(payload.next), origin));
    response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken("VIB", sub), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: getAdminSessionMaxAge(),
    });
  } catch {
    response = NextResponse.redirect(new URL("/dang-nhap?error=google", origin));
  }
  response.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
