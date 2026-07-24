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

export async function toggleFeatureFlag(key: string, enabled: boolean) {
  const supabase = await requireAdmin();
  const { actorIp, userAgent } = await getAuditContext();

  const { data: before } = await supabase
    .from("feature_flags")
    .select("*")
    .eq("key", key)
    .single();

  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) throw new Error(error.message);

  await supabase.from("cms_audit_log").insert({
    action: "feature_flag_toggle",
    entity_type: "feature_flag",
    entity_id: key,
    payload: { enabled },
    actor_ip: actorIp,
    user_agent: userAgent,
    before_state: before,
    after_state: { ...before, enabled },
  });

  revalidatePath("/admin/flags");
  revalidatePath("/admin/system");
}
