export const metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ADMIN_SECRET · Supabase · Site URL — 운영 설정
      </p>
    </div>
  );
}
