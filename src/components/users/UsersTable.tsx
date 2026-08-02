"use client";

import { useTranslations } from "next-intl";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { setUserActive } from "@/lib/actions/users";
import type { User } from "@/db/schema";

export function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: number }) {
  const t = useTranslations("Users");
  const tRoles = useTranslations("Roles");
  const tCommon = useTranslations("Common");

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>{t("name")}</Th>
          <Th>{t("email")}</Th>
          <Th>{t("role")}</Th>
          <Th>{t("status")}</Th>
          <Th>{tCommon("actions")}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {users.map((user) => (
          <Tr key={user.id}>
            <Td>{user.name}</Td>
            <Td>{user.email}</Td>
            <Td>{tRoles(user.role)}</Td>
            <Td>
              <Badge variant={user.isActive ? "success" : "neutral"}>
                {user.isActive ? t("active") : t("inactive")}
              </Badge>
            </Td>
            <Td>
              {user.id !== currentUserId && (
                <Button
                  type="button"
                  variant={user.isActive ? "danger" : "secondary"}
                  className="px-2 py-1 text-xs"
                  onClick={() => setUserActive(user.id, !user.isActive)}
                >
                  {user.isActive ? t("deactivate") : t("activate")}
                </Button>
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
