import { PartyLinkLobby } from "@/components/party-link-lobby";
import { Suspense } from "react";

export const metadata = { title: "Party — Re:Play" };

export default async function PartyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<p className="text-center text-muted-foreground">Loading…</p>}>
        <PartyLinkLobby code={code.toUpperCase()} />
      </Suspense>
    </main>
  );
}
