import type { ReleaseDashboard } from "@/lib/release-dashboard";
import dashboard from "@/lib/data/release-dashboard.json";

export function getReleaseDashboardData(): ReleaseDashboard {
  return dashboard as ReleaseDashboard;
}
