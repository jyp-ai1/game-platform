import { ReplayOsDashboard } from "@/components/replay-os-dashboard";

export const metadata = { title: "Replay OS — Operations" };

export default function ReplayOsAdminPage() {
  return (
    <div className="space-y-8">
      <ReplayOsDashboard admin />
    </div>
  );
}
