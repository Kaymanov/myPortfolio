import { BlogPost } from "@/types";

/**
 * Чистые билдеры структурированных данных (JSON-LD) для страниц блога.
 *
 * Главный принцип (R11.6): при отсутствии или некорректности обязательного
 * для типа свойства билдер возвращает `null`, и вызывающий код опускает
 * весь блок целиком, а не рендерит неполную/некорректную разметку.
 */

const SITE_ORIGIN = "https://iamroot.pro";
const AUTHOR_NAME = "Andrey Kaymanov";

export type SupportedLocale = "ru" | "en";

/** Активная локаль или null, если значение не входит в множество {ru, en}. */
function normalizeLocale(lang: string): SupportedLocale | null {
  return lang === "ru" || lang === "en" ? lang : null;
}

/** Строка из 1+ непустых (после trim) символов. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Проверяет, что значение — корректная дата в формате ISO 8601.
 * Принимает как полные timestamp'ы (с временем/зоной), так и даты YYYY-MM-DD.
 */
export function isIso8601(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  // Должно начинаться с YYYY-MM-DD (опционально с временем и таймзоной).
  if (!/^\d{4}-\d{2}-\d{2}([T\s].*)?$/.test(value.trim())) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

/**
 * Строит JSON-LD объект Article для поста блога.
 *
 * Обязательные свойства (R11.2): headline (1–110 символов), имя автора,
 * datePublished в ISO 8601, inLanguage ∈ {ru, en} (соответствует локали).
 * При нарушении любого из них возвращает `null`.
 */
export function buildArticleLd(
  post: BlogPost,
  lang: string,
): Record<string, unknown> | null {
  const locale = normalizeLocale(lang);
  if (!locale) return null;

  const headline = post.title?.trim() ?? "";
  if (headline.length < 1 || headline.length > 110) return null;

  if (!isIso8601(post.created_at)) return null;

  // Имя автора фиксировано, но проверяем на случай будущих изменений.
  if (!isNonEmptyString(AUTHOR_NAME)) return null;

  if (!isNonEmptyString(post.slug)) return null;

  const postUrl = `${SITE_ORIGIN}/${locale}/blog/${post.slug}`;
  const dateModified = isIso8601(post.updated_at)
    ? (post.updated_at as string)
    : post.created_at;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    ...(isNonEmptyString(post.excerpt) ? { description: post.excerpt } : {}),
    inLanguage: locale,
    datePublished: post.created_at,
    dateModified,
    author: {
      "@type": "Person",
      name: AUTHOR_NAME,
      url: SITE_ORIGIN,
    },
    publisher: {
      "@type": "Person",
      name: AUTHOR_NAME,
      url: SITE_ORIGIN,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    ...(isNonEmptyString(post.og_image) ? { image: post.og_image } : {}),
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
  };
}

/**
 * Строит JSON-LD объект BreadcrumbList для страницы поста блога.
 *
 * Обязательные свойства (R11.3, R11.4): упорядоченный список из ≥2 элементов,
 * каждый со свойствами `name` и `item` (абсолютный URL с сегментом локали).
 * При нехватке данных возвращает `null`.
 */
export function buildBreadcrumbLd(
  post: BlogPost,
  lang: string,
): Record<string, unknown> | null {
  const locale = normalizeLocale(lang);
  if (!locale) return null;

  if (!isNonEmptyString(post.slug)) return null;

  const title = post.title?.trim() ?? "";
  if (title.length < 1) return null;

  const blogUrl = `${SITE_ORIGIN}/${locale}/blog`;
  const postUrl = `${SITE_ORIGIN}/${locale}/blog/${post.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "KNOWLEDGE_BASE",
        item: blogUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: postUrl,
      },
    ],
  };
}
