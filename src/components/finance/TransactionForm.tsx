"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createTransaction, updateTransaction, ActionState } from "@/lib/actions/finance";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { FinanceTransaction } from "@/db/schema";

const CATEGORY_KEYS = ["categoryPurchase", "categoryRent", "categoryMarketing", "categoryOther"] as const;

export function TransactionForm({
  transaction,
  onDone,
}: {
  transaction?: FinanceTransaction;
  onDone?: () => void;
}) {
  const t = useTranslations("Finance");
  const tCommon = useTranslations("Common");
  const action = transaction ? updateTransaction.bind(null, transaction.id) : createTransaction;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.success) {
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("type")}</label>
        <Select name="type" defaultValue={transaction?.type ?? "expense"} required>
          <option value="income">{t("income")}</option>
          <option value="expense">{t("expense")}</option>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("category")}</label>
        <Input name="category" list="finance-categories" defaultValue={transaction?.category} required />
        <datalist id="finance-categories">
          {CATEGORY_KEYS.map((key) => (
            <option key={key} value={t(key)} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("amount")}</label>
        <Input type="number" step="0.01" min="0" name="amount" required defaultValue={transaction?.amount} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("date")}</label>
        <Input
          type="date"
          name="occurredAt"
          required
          defaultValue={transaction?.occurredAt ?? new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("note")}</label>
        <Input name="note" defaultValue={transaction?.note ?? ""} />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit" disabled={isPending}>
          {tCommon("save")}
        </Button>
        {onDone && (
          <Button type="button" variant="secondary" onClick={onDone}>
            {tCommon("cancel")}
          </Button>
        )}
      </div>
      {state?.error && <p className="text-sm text-red-600">{tCommon("error")}</p>}
    </form>
  );
}
