import { sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { financeTransactions } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { NewTransactionPanel } from "@/components/finance/NewTransactionPanel";
import { TransactionTable } from "@/components/finance/TransactionTable";
import { FinanceChart, type MonthlySummaryPoint } from "@/components/finance/FinanceChart";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";

export default async function FinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("admin");
  const t = await getTranslations("Finance");

  const [transactions, monthlyRows] = await Promise.all([
    db.query.financeTransactions.findMany({
      orderBy: (tx, { desc }) => [desc(tx.occurredAt)],
    }),
    db
      .select({
        month: sql<string>`to_char(${financeTransactions.occurredAt}, 'YYYY-MM')`,
        type: financeTransactions.type,
        total: sql<string>`sum(${financeTransactions.amount})`,
      })
      .from(financeTransactions)
      .groupBy(sql`to_char(${financeTransactions.occurredAt}, 'YYYY-MM')`, financeTransactions.type)
      .orderBy(sql`to_char(${financeTransactions.occurredAt}, 'YYYY-MM')`),
  ]);

  const monthlyMap = new Map<string, MonthlySummaryPoint>();
  for (const row of monthlyRows) {
    const point = monthlyMap.get(row.month) ?? { month: row.month, income: 0, expense: 0 };
    point[row.type] = Number(row.total);
    monthlyMap.set(row.month, point);
  }
  const chartData = Array.from(monthlyMap.values());

  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-neutral-500">{t("totalIncome")}</p>
          <p className="mt-1 text-lg font-semibold text-green-700">
            {formatCurrency(totalIncome, locale)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500">{t("totalExpense")}</p>
          <p className="mt-1 text-lg font-semibold text-red-700">
            {formatCurrency(totalExpense, locale)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500">{t("netProfit")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">
            {formatCurrency(totalIncome - totalExpense, locale)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-700">{t("chartTitle")}</h2>
        <FinanceChart data={chartData} />
      </Card>

      <NewTransactionPanel />

      <TransactionTable transactions={transactions} />
    </div>
  );
}
