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
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={80} tickFormatter={(v) => formatCurrency(v, locale)} />
          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0), locale)} />
          <Legend formatter={(value) => (value === "income" ? t("income") : t("expense"))} />
          <Bar dataKey="income" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
