"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

export type MonthlySummaryPoint = { month: string; income: number; expense: number };

export function FinanceChart({ data }: { data: MonthlySummaryPoint[] }) {
  const t = useTranslations("Finance");
  const locale = useLocale();

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis
            tick={{ fontSize: 11 }}
            width={56}
            tickFormatter={(v) => {
              const formatted = formatCurrency(v, locale);
              return formatted.length > 10 ? `${Math.round(v / 1000)}k` : formatted;
            }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0), locale)}
            contentStyle={{
              borderRadius: "0.625rem",
              border: "1px solid var(--border)",
              background: "var(--background)",
            }}
          />
          <Legend formatter={(value) => (value === "income" ? t("income") : t("expense"))} />
          <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
