"use client";

import { useLocale, useTranslations } from "next-intl";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { DeleteSaleButton } from "./DeleteSaleButton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Product, SalesLogEntry } from "@/db/schema";

export type SaleWithProduct = SalesLogEntry & { product: Product | null };

export function SalesTable({ sales, canDelete }: { sales: SaleWithProduct[]; canDelete: boolean }) {
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>{t("soldAt")}</Th>
          <Th>{t("product")}</Th>
          <Th>{t("quantity")}</Th>
          <Th>{t("unitPrice")}</Th>
          <Th>{t("totalPrice")}</Th>
          <Th>{t("channel")}</Th>
          {canDelete && <Th>{tCommon("actions")}</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {sales.length === 0 && (
          <Tr>
            <Td colSpan={canDelete ? 7 : 6} className="text-center text-neutral-400">
              {tCommon("noResults")}
            </Td>
          </Tr>
        )}
        {sales.map((sale) => (
          <Tr key={sale.id}>
            <Td>{formatDate(sale.soldAt, locale)}</Td>
            <Td>{sale.product?.name ?? "—"}</Td>
            <Td>{sale.quantity}</Td>
            <Td>{formatCurrency(sale.unitPrice, locale)}</Td>
            <Td>{formatCurrency(sale.totalPrice, locale)}</Td>
            <Td>
              <Badge variant="neutral">{sale.channel === "in_store" ? t("inStore") : t("social")}</Badge>
            </Td>
            {canDelete && (
              <Td>
                <DeleteSaleButton id={sale.id} />
              </Td>
            )}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
