import { createRemoteJWKSet, jwtVerify } from "jose";

export const ADMIN_EMAIL = "fchienvuhoang@gmail.com";
export const OAUTH_COOKIE = "parami_google_oauth";
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!clientId || !clientSecret || !origin || !process.env.AUTH_SECRET) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost")) return null;
    return { clientId, clientSecret, origin: url.origin, redirectUri: `${url.origin}/api/auth/google/callback` };
  } catch { return null; }
}

export async function verifyGoogleIdentity(idToken: string, clientId: string, nonce: string) {
  const { payload } = await jwtVerify(idToken, googleKeys, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub", "nonce"],
  });
  if (payload.nonce !== nonce || payload.email_verified !== true || payload.email !== ADMIN_EMAIL) {
    throw new Error("Tài khoản không được cấp quyền quản trị.");
  }
  return payload.sub!;
}
