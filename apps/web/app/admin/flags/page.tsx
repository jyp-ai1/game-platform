import { FeatureFlagList } from "@/components/admin/feature-flag-list";
import { fetchFeatureFlags } from "@/lib/supabase/ops-server";

export const metadata = { title: "Feature Flags" };

export default async function AdminFlagsPage() {
  const flags = await fetchFeatureFlags();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">
          배포 없이 런타임 기능 ON/OFF — Weekly Mission · Ranking · Save · CMS · Beta
        </p>
      </div>
      <FeatureFlagList flags={flags} />
    </div>
  );
}
