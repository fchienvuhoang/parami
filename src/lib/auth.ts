import type { BankWorkspace } from "@prisma/client";

export const ADMIN_SESSION_COOKIE = "dhamma_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const BIDV_PASSWORD_DIGEST = "6c245eb1136443d0f81549a058007b8b5510e3b90924aed3e1d06abb4c313d35";

export function isAdminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function getAdminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}

export async function createAdminSessionToken(workspace: BankWorkspace) {
  const secret = passwordForWorkspace(workspace);
  if (!secret) throw new Error("Mật khẩu tài khoản chưa được cấu hình.");
  return `${workspace}.${await hmacHex(secret, `dhamma-admin-session-v2:${workspace}`)}`;
}

export async function verifyAdminSessionToken(token: string | undefined): Promise<BankWorkspace | null> {
  if (!token) return null;
  const [workspace, signature] = token.split(".");
  if ((workspace !== "VIB" && workspace !== "BIDV") || !signature) return null;
  const expected = await createAdminSessionToken(workspace);
  return constantTimeEqual(token, expected) ? workspace : null;
}

export async function verifyAdminCredentials(username: string, password: string): Promise<BankWorkspace | null> {
  const normalized = username.trim().toLowerCase();
  const workspace = normalized === "vib" ? "VIB" : normalized === "bidv" ? "BIDV" : null;
  if (!workspace) return null;
  if (workspace === "BIDV") {
    return constantTimeEqual(await sha256Hex(password), BIDV_PASSWORD_DIGEST) ? workspace : null;
  }
  const expected = process.env.ADMIN_PASSWORD;
  return expected && constantTimeEqual(password, expected) ? workspace : null;
}

export async function getWorkspaceFromRequest(request: Request): Promise<BankWorkspace> {
  const cookie = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);
  const workspace = await verifyAdminSessionToken(cookie ? decodeURIComponent(cookie) : undefined);
  if (!workspace) throw new Error("Phiên đăng nhập không hợp lệ.");
  return workspace;
}

export function safeRedirectPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.startsWith("/dang-nhap") ? "/" : value;
}

function passwordForWorkspace(workspace: BankWorkspace) {
  return workspace === "VIB" ? process.env.ADMIN_PASSWORD : BIDV_PASSWORD_DIGEST;
}

async function sha256Hex(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return diff === 0;
}
