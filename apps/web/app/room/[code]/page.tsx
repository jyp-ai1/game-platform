import { RoomLobby } from "@/components/room-lobby";

export const metadata = { title: "Game Room" };

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="flex flex-1 flex-col">
      <RoomLobby code={code} />
    </main>
  );
}
