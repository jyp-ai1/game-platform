import { FeaturedManager } from "@/components/admin/featured-manager";
import { listFeatured } from "@/app/admin/cms/actions";
import { getAdminSupabase } from "@/lib/supabase/admin-server";

export const metadata = { title: "CMS · 추천" };

export default async function CmsFeaturedPage() {
  let items: Awaited<ReturnType<typeof listFeatured>> = [];
  let gameSlugs: string[] = [];
  try {
    items = await listFeatured();
    const supabase = getAdminSupabase();
    if (supabase) {
      const { data } = await supabase.from("games").select("slug").order("title");
      gameSlugs = (data ?? []).map((g) => g.slug);
    }
  } catch {
    /* empty */
  }
  return (
    <FeaturedManager
      items={items as Parameters<typeof FeaturedManager>[0]["items"]}
      gameSlugs={gameSlugs}
    />
  );
}
