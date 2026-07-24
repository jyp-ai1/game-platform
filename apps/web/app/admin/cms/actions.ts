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

async function audit(
  supabase: NonNullable<ReturnType<typeof getAdminSupabase>>,
  action: string,
  entityType: string,
  entityId: string | null,
  payload: Record<string, unknown> = {},
  opts?: { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null }
) {
  const { actorIp, userAgent } = await getAuditContext();
  await supabase.from("cms_audit_log").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload,
    actor_ip: actorIp,
    user_agent: userAgent,
    before_state: opts?.before ?? null,
    after_state: opts?.after ?? null,
  });
}

function revalidateCms() {
  revalidatePath("/admin/cms");
  revalidatePath("/");
}

// --- Banners ---

export async function listBanners() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("cms_banners")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertBanner(form: {
  id?: string;
  title: string;
  image_url: string;
  link_url?: string;
  button_text?: string;
  sort_order: number;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
}) {
  const supabase = await requireAdmin();
  const row = {
    ...form,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = form.id
    ? await supabase.from("cms_banners").update(row).eq("id", form.id).select("id").single()
    : await supabase.from("cms_banners").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  await audit(supabase, form.id ? "update" : "create", "cms_banners", data.id, row, {
    after: row,
  });
  revalidateCms();
}

export async function deleteBanner(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("cms_banners").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await audit(supabase, "delete", "cms_banners", id, {});
  revalidateCms();
}

// --- Notices ---

export async function listNotices() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("cms_notices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertNotice(form: {
  id?: string;
  notice_type: string;
  title: string;
  body: string;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
}) {
  const supabase = await requireAdmin();
  const row = { ...form, updated_at: new Date().toISOString() };
  const { data, error } = form.id
    ? await supabase.from("cms_notices").update(row).eq("id", form.id).select("id").single()
    : await supabase.from("cms_notices").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  await audit(supabase, form.id ? "update" : "create", "cms_notices", data.id, row);
  revalidateCms();
}

export async function deleteNotice(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("cms_notices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await audit(supabase, "delete", "cms_notices", id, {});
  revalidateCms();
}

// --- Events ---

export async function listEvents() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("cms_events")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertEvent(form: {
  id?: string;
  title: string;
  description: string;
  game_slug?: string;
  reward_text?: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}) {
  const supabase = await requireAdmin();
  const row = { ...form, updated_at: new Date().toISOString() };
  const { data, error } = form.id
    ? await supabase.from("cms_events").update(row).eq("id", form.id).select("id").single()
    : await supabase.from("cms_events").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  await audit(supabase, form.id ? "update" : "create", "cms_events", data.id, row);
  revalidateCms();
}

export async function deleteEvent(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("cms_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await audit(supabase, "delete", "cms_events", id, {});
  revalidateCms();
}

// --- Featured ---

export async function listFeatured() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("cms_featured_games")
    .select("*, games(title)")
    .order("slot")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertFeatured(form: {
  id?: string;
  slot: string;
  game_slug: string;
  sort_order: number;
  is_active: boolean;
}) {
  const supabase = await requireAdmin();
  const { data, error } = form.id
    ? await supabase
        .from("cms_featured_games")
        .update(form)
        .eq("id", form.id)
        .select("id")
        .single()
    : await supabase.from("cms_featured_games").insert(form).select("id").single();
  if (error) throw new Error(error.message);
  await audit(supabase, form.id ? "update" : "create", "cms_featured_games", data.id, form);
  revalidateCms();
}

export async function deleteFeatured(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("cms_featured_games").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await audit(supabase, "delete", "cms_featured_games", id, {});
  revalidateCms();
}

// --- Categories (direct on categories table) ---

export async function listCategoriesAdmin() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, description")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateCategoryOrder(slug: string, sortOrder: number) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("categories")
    .update({ sort_order: sortOrder })
    .eq("slug", slug);
  if (error) throw new Error(error.message);
  await audit(supabase, "update", "categories", slug, { sort_order: sortOrder });
  revalidateCms();
}

// --- Game visibility ---

export async function listGameVisibility() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("cms_game_visibility")
    .select("*, games(title, status)")
    .order("game_slug");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setGameVisibility(
  gameSlug: string,
  visibility: string,
  note?: string
) {
  const supabase = await requireAdmin();
  const { data: before } = await supabase
    .from("cms_game_visibility")
    .select("*")
    .eq("game_slug", gameSlug)
    .maybeSingle();
  const afterRow = {
    game_slug: gameSlug,
    visibility,
    note: note ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("cms_game_visibility").upsert(afterRow);
  if (error) throw new Error(error.message);
  await audit(supabase, "update", "cms_game_visibility", gameSlug, { visibility, note }, {
    before: before ?? undefined,
    after: afterRow,
  });
  revalidateCms();
}

export async function fetchCmsOverview() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.rpc("get_cms_overview_stats");
  if (error) throw new Error(error.message);
  return data as {
    banners_active: number;
    notices_active: number;
    events_active: number;
    featured_active: number;
    expiring_soon: number;
  };
}

export async function listAuditLog(limit = 20) {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("cms_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
