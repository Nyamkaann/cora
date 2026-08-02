const CURRENCY_LOCALE: Record<string, string> = {
  mn: "mn-MN",
  en: "en-US",
};

export function formatCurrency(value: number | string, locale: string) {
  const amount = typeof value === "string" ? Number(value) : value;
  const intlLocale = CURRENCY_LOCALE[locale] ?? "en-US";

  if (locale === "mn") {
    return `${new Intl.NumberFormat(intlLocale).format(amount)}₮`;
  }

  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "MNT",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | Date, locale: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const intlLocale = CURRENCY_LOCALE[locale] ?? "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
