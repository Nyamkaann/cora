import { sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { financeTransactions } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { NewTransactionPanel } from "@/components/finance/NewTransactionPanel";
import { TransactionTable } from "@/components/finance/TransactionTable";
import { FinanceChart, type MonthlySummaryPoint } from "@/components/finance/FinanceChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

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
  const netProfit = totalIncome - totalExpense;

  const stats = [
    {
      label: t("totalIncome"),
      value: formatCurrency(totalIncome, locale),
      icon: TrendingUp,
      className: "text-emerald-600",
    },
    {
      label: t("totalExpense"),
      value: formatCurrency(totalExpense, locale),
      icon: TrendingDown,
      className: "text-destructive",
    },
    {
      label: t("netProfit"),
      value: formatCurrency(netProfit, locale),
      icon: Wallet,
      className: netProfit >= 0 ? "text-foreground" : "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className={`text-xl font-semibold sm:text-2xl ${stat.className}`}>{stat.value}</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("chartTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceChart data={chartData} />
        </CardContent>
      </Card>

      <NewTransactionPanel />

      <TransactionTable transactions={transactions} />
    </div>
  );
}
