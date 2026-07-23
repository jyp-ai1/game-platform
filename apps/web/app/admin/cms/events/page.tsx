import { EventManager } from "@/components/admin/event-manager";
import { listEvents } from "@/app/admin/cms/actions";
import { getAdminSupabase } from "@/lib/supabase/admin-server";

export const metadata = { title: "CMS · 이벤트" };

export default async function CmsEventsPage() {
  let events: Awaited<ReturnType<typeof listEvents>> = [];
  let gameSlugs: string[] = [];
  try {
    events = await listEvents();
    const supabase = getAdminSupabase();
    if (supabase) {
      const { data } = await supabase.from("games").select("slug").order("title");
      gameSlugs = (data ?? []).map((g) => g.slug);
    }
  } catch {
    /* empty */
  }
  return (
    <EventManager
      events={events as Parameters<typeof EventManager>[0]["events"]}
      gameSlugs={gameSlugs}
    />
  );
}
