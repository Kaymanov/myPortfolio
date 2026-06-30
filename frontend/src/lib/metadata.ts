import type { Metadata } from "next";

/**
 * Переиспользуемый билдер локализованных SEO-метаданных (R10).
 *
 * Гарантирует инварианты длин (title 1–60, description 50–160), абсолютный
 * canonical с сегментом активной локали, hreflang-альтернативы (ru/en/x-default)
 * и поля Open Graph / Twitter Card. При недоступности локализованных метаданных
 * активной локали выполняется fallback на локаль по умолчанию с сохранением
 * пути canonical активной локали (R10.6).
 */

export const SITE_ORIGIN = "https://iamroot.pro";
export const SUPPORTED_LOCALES = ["ru", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "ru";

export const TITLE_MIN = 1;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 160;

/** Локализованная пара заголовок/описание для одной страницы. */
export interface LocaleContent {
  title: string;
  description: string;
}

export interface PageMetadataInput {
  /** Активная локаль из сегмента маршрута `[lang]` (может быть любой строкой). */
  lang: string;
  /** Путь после сегмента локали, напр. `""` для главной или `"/blog/slug"`. */
  path?: string;
  /** Локализованные метаданные активной локали; при отсутствии — fallback. */
  active?: Partial<LocaleContent> | null;
  /** Метаданные локали по умолчанию (используются при fallback, R10.6). */
  fallback: LocaleContent;
  /** Абсолютный или относительный URL изображения превью (OG/Twitter). */
  image?: string;
  /** Тип Open Graph; по умолчанию `website`. */
  ogType?: "website" | "article";
  keywords?: string[];
  siteName?: string;
}

/** Активная локаль или `null`, если значение не входит в множество {ru, en}. */
export function normalizeLocale(lang: string): SupportedLocale | null {
  return lang === "ru" || lang === "en" ? lang : null;
}

/** OG-обозначение локали (`ru_RU` / `en_US`). */
function ogLocale(locale: SupportedLocale): string {
  return locale === "ru" ? "ru_RU" : "en_US";
}

/**
 * Обрезает заголовок до инварианта длины (≤60), сохраняя непустое значение.
 * Возвращает обрезанную по границе символа строку без хвостовых пробелов.
 */
export function clampTitle(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= TITLE_MAX) return trimmed;
  return trimmed.slice(0, TITLE_MAX).trimEnd();
}

/**
 * Приводит описание к верхней границе длины (≤160). Нижняя граница (≥50)
 * обеспечивается качеством исходного контента; здесь гарантируется только
 * отсутствие переполнения и отсутствие хвостовых пробелов.
 */
export function clampDescription(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= DESCRIPTION_MAX) return trimmed;
  return trimmed.slice(0, DESCRIPTION_MAX).trimEnd();
}

/** Проверяет, что у локализованного контента непустые title и description. */
function isUsableContent(
  content: Partial<LocaleContent> | null | undefined,
): content is LocaleContent {
  return (
    !!content &&
    typeof content.title === "string" &&
    content.title.trim().length > 0 &&
    typeof content.description === "string" &&
    content.description.trim().length > 0
  );
}

/** Абсолютный URL страницы для заданной локали. */
function absoluteUrl(locale: SupportedLocale, path: string): string {
  const normalizedPath = path && !path.startsWith("/") ? `/${path}` : path;
  return `${SITE_ORIGIN}/${locale}${normalizedPath}`;
}

/**
 * Строит объект `Metadata` Next.js с локализованными SEO-полями (R10.1–R10.4, R10.6).
 *
 * - title обрезан до 1–60, description до ≤160 символов на выбранной локали;
 * - canonical — абсолютный URL с сегментом активной локали;
 * - alternates.languages — абсолютные ru/en URL и x-default (локаль по умолчанию);
 * - openGraph + twitter с заголовком, описанием, canonical, изображением и локалью;
 * - при недоступности контента активной локали используется контент локали
 *   по умолчанию, но путь canonical сохраняет сегмент активной локали (R10.6).
 */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const {
    lang,
    path = "",
    active,
    fallback,
    image,
    ogType = "website",
    keywords,
    siteName = "IAMROOT.PRO",
  } = input;

  // Активная локаль для canonical/hreflang сохраняется даже при fallback контента.
  const activeLocale = normalizeLocale(lang) ?? DEFAULT_LOCALE;

  // Выбор контента: активная локаль, если доступна, иначе локаль по умолчанию (R10.6).
  const chosen: LocaleContent = isUsableContent(active) ? active : fallback;

  const title = clampTitle(chosen.title);
  const description = clampDescription(chosen.description);

  const canonical = absoluteUrl(activeLocale, path);
  const ruUrl = absoluteUrl("ru", path);
  const enUrl = absoluteUrl("en", path);
  const xDefaultUrl = absoluteUrl(DEFAULT_LOCALE, path);

  const ogImages = image ? [{ url: image }] : undefined;

  return {
    // `absolute` подавляет родительский title.template, чтобы готовый
    // заголовок (уже содержащий бренд) не оборачивался повторно.
    title: { absolute: title },
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: {
      canonical,
      languages: {
        ru: ruUrl,
        en: enUrl,
        "x-default": xDefaultUrl,
      },
    },
    openGraph: {
      type: ogType,
      locale: ogLocale(activeLocale),
      alternateLocale: ogLocale(activeLocale === "ru" ? "en" : "ru"),
      url: canonical,
      title,
      description,
      siteName,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
