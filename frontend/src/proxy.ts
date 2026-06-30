import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["ru", "en"];
const defaultLocale = "ru";

function getLocale(request: NextRequest) {
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    if (acceptLanguage.toLowerCase().includes("ru")) return "ru";
    if (acceptLanguage.toLowerCase().includes("en")) return "en";
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Файл ключа IndexNow (R14.2) ---
  // Протокол IndexNow требует, чтобы файл верификации ключа отдавался по
  // корневому пути `/{key}.txt` и содержал сам ключ в виде plain text с HTTP 200.
  // Бэкенд (`api/seo/indexnow.py`) объявляет `keyLocation` как
  // `https://iamroot.pro/{key}.txt`, поэтому файл обязан находиться в корне.
  //
  // Корневой App Router сегмент `[lang]` перехватил бы любой одиночный сегмент
  // (включая `/{key}.txt`), а второй корневой динамический сегмент создать
  // нельзя — он конфликтует с `[lang]`. Поэтому ключ отдаётся здесь, в proxy,
  // который выполняется до маршрутизации.
  //
  // Если `INDEXNOW_KEY` не задан (например в dev), файл не отдаётся (404) —
  // пустой ключ никогда не возвращается.
  const indexNowKey = process.env.INDEXNOW_KEY?.trim();
  if (indexNowKey && pathname === `/${indexNowKey}.txt`) {
    return new NextResponse(indexNowKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) return;

  // Protect system paths and media
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/health" ||
    pathname.includes(".")
  ) {
    return;
  }

  // Redirect if there is no locale
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    "/((?!_next|api|.*\\.).*)",
    // Файлы ключа IndexNow в корне: `/{key}.txt` (R14.2). Исключаем
    // внутренние пути `_next`, чтобы не влиять на статику.
    "/((?!_next/).*)\\.txt",
  ],
};
