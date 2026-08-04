import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }
  const user = session!.user;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Topbar name={user.name ?? user.email ?? ""} role={user.role} />
      <div className="flex flex-1">
        <Sidebar role={user.role} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
