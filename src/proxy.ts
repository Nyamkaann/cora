import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { routing } from "@/i18n/routing";
import { auth } from "@/auth";
import type { UserRole } from "@/types/next-auth";

const handleI18nRouting = createMiddleware(routing);

const PUBLIC_PATHS = ["/login"];
const ADMIN_ONLY_PATHS = ["/finance", "/users", "/import", "/marketing"];

function stripLocale(pathname: string) {
  const match = pathname.match(/^\/(mn|en)(\/.*)?$/);
  return match ? (match[2] ?? "/") : pathname;
}

function defaultPathFor(role: UserRole) {
  if (role === "admin") return "/finance";
  if (role === "warehouse") return "/inventory";
  return "/sales";
}

export default auth(async (request: NextAuthRequest) => {
  const intlResponse = handleI18nRouting(request);

  const pathname = stripLocale(request.nextUrl.pathname);
  const session = request.auth;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);
  const locale = request.nextUrl.pathname.match(/^\/(mn|en)/)?.[1] ?? routing.defaultLocale;

  if (!session?.user && !isPublic) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (session?.user) {
    const role = session.user.role;

    if (isPublic) {
      return NextResponse.redirect(new URL(`/${locale}${defaultPathFor(role)}`, request.url));
    }

    if (role !== "admin" && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL(`/${locale}${defaultPathFor(role)}`, request.url));
    }
  }

  return intlResponse;
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
