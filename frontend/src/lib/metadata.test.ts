import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  buildPageMetadata,
  clampTitle,
  clampDescription,
  normalizeLocale,
  SITE_ORIGIN,
  TITLE_MAX,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  DEFAULT_LOCALE,
  type LocaleContent,
  type PageMetadataInput,
} from "@/lib/metadata";

// ---------------------------------------------------------------------------
// Генераторы (fast-check)
// ---------------------------------------------------------------------------

const ALNUM =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");

/**
 * Непустой текст без пробелов длиной [min, max].
 * Отсутствие пробелов гарантирует, что trim/slice в clamp-функциях не
 * уменьшит длину ниже целевого нижнего предела.
 */
const denseText = (min: number, max: number) =>
  fc
    .array(fc.constantFrom(...ALNUM), { minLength: min, maxLength: max })
    .map((chars) => chars.join(""));

/** Локализованный контент, удовлетворяющий инвариантам длин после clamp. */
const localeContentArb: fc.Arbitrary<LocaleContent> = fc.record({
  // title после clampTitle гарантированно 1–60.
  title: denseText(1, 100),
  // description после clampDescription гарантированно DESCRIPTION_MIN–160.
  description: denseText(DESCRIPTION_MIN, 200),
});

/** Путь после сегмента локали: либо корень, либо страница поста. */
const pathArb = fc.oneof(
  fc.constant(""),
  denseText(1, 20).map((slug) => `/blog/${slug}`),
);

/** Изображение превью (OG/Twitter) — присутствует всегда. */
const imageArb = denseText(1, 12).map((s) => `/img/${s}.png`);

const localeArb = fc.constantFrom("ru", "en");

// ---------------------------------------------------------------------------
// Property 15
// ---------------------------------------------------------------------------

describe("buildPageMetadata", () => {
  // Feature: project-polish-and-seo-automation, Property 15
  // Полнота и корректность локализованных метаданных: для любого входа и
  // локали построенные метаданные содержат title 1–60, description 50–160,
  // абсолютный canonical с сегментом локали, hreflang ru/en/x-default
  // (все абсолютные) и поля Open Graph / Twitter.
  // Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
  it("Property 15: built metadata satisfies length, canonical, hreflang and OG/Twitter invariants", () => {
    fc.assert(
      fc.property(
        fc.record({
          lang: localeArb,
          path: pathArb,
          active: fc.option(localeContentArb, { nil: null }),
          fallback: localeContentArb,
          image: imageArb,
        }) as fc.Arbitrary<PageMetadataInput>,
        (input) => {
          const md = buildPageMetadata(input);

          // --- title 1–60 ---
          const title = (md.title as { absolute: string }).absolute;
          expect(typeof title).toBe("string");
          expect(title.length).toBeGreaterThanOrEqual(1);
          expect(title.length).toBeLessThanOrEqual(TITLE_MAX);

          // --- description 50–160 ---
          expect(typeof md.description).toBe("string");
          const description = md.description as string;
          expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
          expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);

          // --- canonical: абсолютный, с сегментом локали ---
          const canonical = md.alternates?.canonical as string;
          expect(typeof canonical).toBe("string");
          expect(canonical.startsWith(SITE_ORIGIN)).toBe(true);
          expect(/^https:\/\/iamroot\.pro\/(ru|en)(\/|$)/.test(canonical)).toBe(
            true,
          );

          // --- hreflang: ru/en/x-default, каждая абсолютная ---
          const languages = md.alternates?.languages as Record<string, string>;
          for (const key of ["ru", "en", "x-default"]) {
            const url = languages[key];
            expect(typeof url).toBe("string");
            expect(url.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
          }

          // --- Open Graph поля ---
          const og = md.openGraph as Record<string, unknown>;
          expect(og).toBeTruthy();
          expect(og.title).toBe(title);
          expect(og.description).toBe(description);
          expect(og.url).toBe(canonical);
          expect(typeof og.locale).toBe("string");
          expect(Array.isArray(og.images)).toBe(true);

          // --- Twitter поля ---
          const tw = md.twitter as Record<string, unknown>;
          expect(tw).toBeTruthy();
          expect(tw.card).toBe("summary_large_image");
          expect(tw.title).toBe(title);
          expect(tw.description).toBe(description);
          expect(Array.isArray(tw.images)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Property 16
  // -------------------------------------------------------------------------
  // Feature: project-polish-and-seo-automation, Property 16
  // Fallback метаданных сохраняет путь активной локали: когда контент активной
  // локали недоступен, используется контент локали по умолчанию, но canonical
  // сохраняет сегмент пути активной локали.
  // Validates: Requirements 10.6
  it("Property 16: falls back to default-locale content while canonical keeps the active-locale path segment", () => {
    // Активный контент непригоден (пустой title ИЛИ пустое description),
    // поэтому билдер обязан использовать fallback-контент.
    const unusableActiveArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.record({
        title: fc.constantFrom("", "   ", "\t"),
        description: denseText(DESCRIPTION_MIN, 120),
      }),
      fc.record({
        title: denseText(1, 40),
        description: fc.constantFrom("", "   "),
      }),
    );

    fc.assert(
      fc.property(
        fc.record({
          lang: localeArb,
          path: pathArb,
          active: unusableActiveArb,
          fallback: localeContentArb,
          image: imageArb,
        }) as fc.Arbitrary<PageMetadataInput>,
        (input) => {
          const md = buildPageMetadata(input);

          // Контент берётся из fallback (локаль по умолчанию).
          const title = (md.title as { absolute: string }).absolute;
          expect(title).toBe(clampTitle(input.fallback.title));
          expect(md.description).toBe(
            clampDescription(input.fallback.description),
          );

          // Но canonical сохраняет сегмент АКТИВНОЙ локали (input.lang валиден).
          const canonical = md.alternates?.canonical as string;
          expect(canonical.startsWith(`${SITE_ORIGIN}/${input.lang}`)).toBe(
            true,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Вспомогательные unit-тесты чистых функций (поддержка свойств)
// ---------------------------------------------------------------------------

describe("metadata helpers", () => {
  it("normalizeLocale accepts only ru/en", () => {
    expect(normalizeLocale("ru")).toBe("ru");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("de")).toBeNull();
    expect(normalizeLocale("")).toBeNull();
  });

  it("clampTitle never exceeds TITLE_MAX", () => {
    const long = "x".repeat(200);
    expect(clampTitle(long).length).toBe(TITLE_MAX);
  });

  it("clampDescription never exceeds DESCRIPTION_MAX", () => {
    const long = "y".repeat(500);
    expect(clampDescription(long).length).toBe(DESCRIPTION_MAX);
  });

  it("DEFAULT_LOCALE is a supported locale", () => {
    expect(normalizeLocale(DEFAULT_LOCALE)).toBe(DEFAULT_LOCALE);
  });
});
