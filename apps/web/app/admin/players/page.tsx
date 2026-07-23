export const metadata = { title: "Players" };

export default function AdminPlayersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Players</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        device_id 기반 플레이어 목록 — players 테이블 (0011)
      </p>
    </div>
  );
}
