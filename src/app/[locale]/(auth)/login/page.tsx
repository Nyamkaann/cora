import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Auth");

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-6 text-center text-xl font-semibold text-neutral-900">
        {t("loginTitle")}
      </h1>
      <LoginForm locale={locale} />
    </div>
  );
}
