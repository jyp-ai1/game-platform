"use server";

import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminSupabase } from "@/lib/supabase/admin-server";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  const supabase = getAdminSupabase();
  if (!supabase) throw new Error("Admin Supabase not configured");
  return supabase;
}

export async function saveSeoVerification(form: {
  google?: string;
  bing?: string;
  naver?: string;
}) {
  const supabase = await requireAdmin();
  const rows = [
    { key: "google_verification", value: form.google?.trim() ?? "" },
    { key: "bing_verification", value: form.bing?.trim() ?? "" },
    { key: "naver_verification", value: form.naver?.trim() ?? "" },
  ];

  for (const row of rows) {
    const { error } = await supabase.from("seo_settings").upsert({
      ...row,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/seo");
  revalidatePath("/", "layout");
}

export async function recordLighthouseScore(form: {
  url: string;
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
}) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("seo_lighthouse_runs").insert({
    url: form.url,
    performance: form.performance,
    accessibility: form.accessibility,
    best_practices: form.best_practices,
    seo: form.seo,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/seo");
}

export async function inspectSeoUrl(path: string) {
  const supabase = await requireAdmin();
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (normalized.startsWith("/games/")) {
    const slug = normalized.replace("/games/", "").split("/")[0];
    const { data } = await supabase
      .from("games")
      .select("slug, title, status, description, thumbnail_url")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return { found: false, indexable: false, issues: ["404 — game not found"] };
    const issues: string[] = [];
    if (!data.description?.trim()) issues.push("Meta description missing");
    if (!data.thumbnail_url) issues.push("OG image (thumbnail) missing");
    if (data.status === "HIDDEN") issues.push("Hidden — not in sitemap");
    if (data.status === "MAINTENANCE") issues.push("Maintenance — noindex");
    return {
      found: true,
      indexable: data.status === "ACTIVE" || data.status === "COMING_SOON",
      title: data.title,
      status: data.status,
      issues,
    };
  }

  if (normalized.startsWith("/categories/")) {
    const slug = normalized.replace("/categories/", "").split("/")[0];
    const { data } = await supabase.from("categories").select("slug, name").eq("slug", slug).maybeSingle();
    if (!data) return { found: false, indexable: false, issues: ["404 — category not found"] };
    return { found: true, indexable: true, title: data.name, status: "ACTIVE", issues: [] as string[] };
  }

  const staticPaths = ["/", "/games", "/about", "/privacy", "/terms", "/contact"];
  if (staticPaths.includes(normalized)) {
    return { found: true, indexable: true, title: normalized, status: "STATIC", issues: [] as string[] };
  }

  return { found: false, indexable: false, issues: ["404 — path not in sitemap"] };
}

export async function listSeoSettings() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("seo_settings")
    .select("key, value")
    .in("key", ["google_verification", "bing_verification", "naver_verification"]);
  if (error) throw new Error(error.message);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    google: map.google_verification ?? "",
    bing: map.bing_verification ?? "",
    naver: map.naver_verification ?? "",
  };
}
