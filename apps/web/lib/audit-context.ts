import { headers } from "next/headers";

export async function getAuditContext() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const actorIp = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent") ?? null;
  return { actorIp, userAgent };
}
