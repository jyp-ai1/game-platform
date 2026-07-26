import { CreatorStudioShell } from "@/components/creator-studio-shell";
import { CreatorMyGamesPanel } from "@/components/creator-my-games-panel";

export const metadata = { title: "My Games — Studio" };

export default function StudioGamesPage() {
  return (
    <CreatorStudioShell>
      <CreatorMyGamesPanel />
    </CreatorStudioShell>
  );
}
