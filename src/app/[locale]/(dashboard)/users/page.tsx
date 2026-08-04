import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { requireRole } from "@/lib/auth-guard";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewUserPanel } from "@/components/users/NewUserPanel";
import { UsersTable } from "@/components/users/UsersTable";

export default async function UsersPage() {
  const t = await getTranslations("Users");
  const currentUser = await requireRole("admin");

  const userList = await db.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.name)],
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <NewUserPanel />

      <UsersTable users={userList} currentUserId={Number(currentUser.id)} />
    </div>
  );
}
