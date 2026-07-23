import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_auth";

function expectedToken(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  return createHash("sha256").update(secret).digest("hex");
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_SECRET);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || token.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function createAdminSessionToken(): string | null {
  return expectedToken();
}

export { COOKIE_NAME };
