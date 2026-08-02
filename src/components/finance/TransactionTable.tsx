"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TransactionForm } from "./TransactionForm";
import { DeleteTransactionButton } from "./DeleteTransactionButton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FinanceTransaction } from "@/db/schema";

export function TransactionTable({ transactions }: { transactions: FinanceTransaction[] }) {
  const t = useTranslations("Finance");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>{t("date")}</Th>
          <Th>{t("type")}</Th>
          <Th>{t("category")}</Th>
          <Th>{t("amount")}</Th>
          <Th>{t("note")}</Th>
          <Th>{tCommon("actions")}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {transactions.length === 0 && (
          <Tr>
            <Td colSpan={6} className="text-center text-neutral-400">
              {tCommon("noResults")}
            </Td>
          </Tr>
        )}
        {transactions.map((tx) =>
          editingId === tx.id ? (
            <Tr key={tx.id}>
              <Td colSpan={6}>
                <TransactionForm transaction={tx} onDone={() => setEditingId(null)} />
              </Td>
            </Tr>
          ) : (
            <Tr key={tx.id}>
              <Td>{formatDate(tx.occurredAt, locale)}</Td>
              <Td>
                <Badge variant={tx.type === "income" ? "success" : "danger"}>
                  {t(tx.type)}
                </Badge>
              </Td>
              <Td>{tx.category}</Td>
              <Td>{formatCurrency(tx.amount, locale)}</Td>
              <Td>{tx.note ?? "—"}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => setEditingId(tx.id)}
                  >
                    {tCommon("edit")}
                  </Button>
                  <DeleteTransactionButton id={tx.id} />
                </div>
              </Td>
            </Tr>
          )
        )}
      </Tbody>
    </Table>
  );
}
