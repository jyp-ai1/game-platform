import { AdminLoginForm } from "@/components/admin-login-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAdminConfigured()) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">
          ADMIN_SECRET 환경변수가 설정되지 않았습니다.
        </p>
      </main>
    );
  }

  const authed = await isAdminAuthenticated();
  if (!authed) {
    return (
      <main className="container mx-auto px-4">
        <AdminLoginForm />
      </main>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
