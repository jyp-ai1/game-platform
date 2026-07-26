import { ReplayOsDashboard } from "@/components/replay-os-dashboard";
import { AdminDailySummary } from "@/components/admin-daily-summary";
import { AiIssuePipelinePanel } from "@/components/ai-issue-pipeline-panel";
import { MpRealtimeDashboard } from "@/components/admin/mp-realtime-dashboard";

export const metadata = { title: "Replay OS — Operations" };

export default function ReplayOsAdminPage() {
  return (
    <div className="space-y-8">
      <AdminDailySummary />
      <MpRealtimeDashboard />
      <AiIssuePipelinePanel />
      <ReplayOsDashboard admin />
    </div>
  );
}
