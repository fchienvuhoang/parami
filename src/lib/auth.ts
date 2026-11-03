import type { BankWorkspace } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "dhamma_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ADMIN_EMAIL = "fchienvuhoang@gmail.com";

export function getAdminSessionMaxAge() { return SESSION_MAX_AGE_SECONDS; }

function sessionKey() {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET chưa được cấu hình.");
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

export async function createAdminSessionToken(workspace: BankWorkspace, googleSub: string) {
  return new SignJWT({ workspace, email: ADMIN_EMAIL })
    .setProtectedHeader({ alg: "HS256" }).setSubject(googleSub)
    .setIssuer("parami").setAudience("parami-admin").setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`).sign(sessionKey());
}

export async function verifyAdminSessionToken(token: string | undefined): Promise<BankWorkspace | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), {
      algorithms: ["HS256"], issuer: "parami", audience: "parami-admin", requiredClaims: ["exp", "iat", "sub"],
    });
    return payload.workspace === "VIB" && payload.email === ADMIN_EMAIL ? "VIB" : null;
  } catch { return null; }
}

export async function getWorkspaceFromRequest(request: Request): Promise<BankWorkspace> {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))?.slice(ADMIN_SESSION_COOKIE.length + 1);
  let token: string | undefined;
  try { token = cookie ? decodeURIComponent(cookie) : undefined; } catch { throw new Error("Phiên đăng nhập không hợp lệ."); }
  const workspace = await verifyAdminSessionToken(token);
  if (!workspace) throw new Error("Phiên đăng nhập không hợp lệ.");
  return workspace;
}

export function safeRedirectPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u0020\u007f]/.test(value)) return "/";
  const target = new URL(value, "https://parami.invalid");
  if (target.origin !== "https://parami.invalid" || target.pathname.startsWith("/dang-nhap") || target.pathname.startsWith("/api/auth")) return "/";
  return `${target.pathname}${target.search}${target.hash}`;
}
