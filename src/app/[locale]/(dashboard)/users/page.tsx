import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { requireRole } from "@/lib/auth-guard";
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
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <NewUserPanel />

      <UsersTable users={userList} currentUserId={Number(currentUser.id)} />
    </div>
  );
}
