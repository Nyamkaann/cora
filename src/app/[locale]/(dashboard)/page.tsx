import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";

export default async function DashboardIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const role = session?.user.role;

  const href = role === "admin" ? "/finance" : role === "warehouse" ? "/inventory" : "/sales";
  redirect({ href, locale });
}
