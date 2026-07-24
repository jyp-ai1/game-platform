"use server";

import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAuditContext } from "@/lib/audit-context";
import { getAdminSupabase } from "@/lib/supabase/admin-server";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }
  const supabase = getAdminSupabase();
  if (!supabase) {
    throw new Error("Admin Supabase not configured");
  }
  return supabase;
}

export async function updatePlayerMemo(deviceId: string, memo: string) {
  const supabase = await requireAdmin();
  const { actorIp, userAgent } = await getAuditContext();

  const { error } = await supabase
    .from("players")
    .update({ admin_memo: memo || null, updated_at: new Date().toISOString() })
    .eq("device_id", deviceId);

  if (error) throw new Error(error.message);

  await supabase.from("cms_audit_log").insert({
    action: "player_memo",
    entity_type: "player",
    entity_id: deviceId,
    payload: { memo },
    actor_ip: actorIp,
    user_agent: userAgent,
  });

  revalidatePath(`/admin/players/${encodeURIComponent(deviceId)}`);
  revalidatePath("/admin/players");
}

export async function suspendPlayer(deviceId: string, reason: string) {
  const supabase = await requireAdmin();
  const { actorIp, userAgent } = await getAuditContext();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("players")
    .update({
      status: "suspended",
      suspended_at: now,
      suspended_reason: reason || null,
      updated_at: now,
    })
    .eq("device_id", deviceId);

  if (error) throw new Error(error.message);

  await supabase.from("cms_audit_log").insert({
    action: "player_suspend",
    entity_type: "player",
    entity_id: deviceId,
    payload: { reason },
    actor_ip: actorIp,
    user_agent: userAgent,
  });

  revalidatePath(`/admin/players/${encodeURIComponent(deviceId)}`);
  revalidatePath("/admin/players");
}

export async function unsuspendPlayer(deviceId: string) {
  const supabase = await requireAdmin();
  const { actorIp, userAgent } = await getAuditContext();

  const { error } = await supabase
    .from("players")
    .update({
      status: "active",
      suspended_at: null,
      suspended_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("device_id", deviceId);

  if (error) throw new Error(error.message);

  await supabase.from("cms_audit_log").insert({
    action: "player_unsuspend",
    entity_type: "player",
    entity_id: deviceId,
    payload: {},
    actor_ip: actorIp,
    user_agent: userAgent,
  });

  revalidatePath(`/admin/players/${encodeURIComponent(deviceId)}`);
  revalidatePath("/admin/players");
}
