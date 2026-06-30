import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  buildArticleLd,
  buildBreadcrumbLd,
  isIso8601,
} from "@/lib/structuredData";
import type { BlogPost } from "@/types";

const SITE_ORIGIN = "https://iamroot.pro";

// ---------------------------------------------------------------------------
// Генераторы (fast-check)
// ---------------------------------------------------------------------------

const ALNUM =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");

/** Непустой текст без пробелов длиной [min, max]. */
const denseText = (min: number, max: number) =>
  fc
    .array(fc.constantFrom(...ALNUM), { minLength: min, maxLength: max })
    .map((chars) => chars.join(""));

/** Slug без пробелов и спецсимволов. */
const slugArb = denseText(1, 30).map((s) => s.toLowerCase());

/** Корректная ISO 8601 дата-время в UTC. */
const isoDateArb = fc
  .date({
    min: new Date("2000-01-01T00:00:00Z"),
    max: new Date("2100-01-01T00:00:00Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

const localeArb = fc.constantFrom("ru", "en");

/** Любой валидный пост (удовлетворяет обязательным свойствам Article). */
const validPostArb: fc.Arbitrary<BlogPost> = fc.record({
  id: fc.integer({ min: 1 }),
  title: denseText(1, 110), // headline 1–110
  slug: slugArb,
  excerpt: fc.oneof(fc.constant(""), denseText(1, 60)),
  content: denseText(1, 50),
  created_at: isoDateArb,
  updated_at: fc.oneof(fc.constant(undefined), isoDateArb),
  tags: fc.array(denseText(1, 12), { maxLength: 5 }),
  is_published: fc.boolean(),
  meta_title: fc.oneof(fc.constant(undefined), denseText(1, 40)),
  meta_description: fc.oneof(fc.constant(undefined), denseText(1, 120)),
  og_image: fc.oneof(
    fc.constant(undefined),
    denseText(1, 12).map((s) => `/og/${s}.png`),
  ),
});

// ---------------------------------------------------------------------------
// Property 17
// ---------------------------------------------------------------------------

describe("structured data builders", () => {
  // Feature: project-polish-and-seo-automation, Property 17
  // Корректность структурированных данных: для любого валидного поста
  // buildArticleLd содержит headline 1–110, author.name, datePublished в ISO
  // 8601 и inLanguage ∈ {ru,en}; buildBreadcrumbLd содержит ≥2 упорядоченных
  // элемента с name+item; все URL абсолютны с сегментом активной локали.
  // Validates: Requirements 11.2, 11.3, 11.4
  it("Property 17: valid posts yield correct Article and BreadcrumbList structures", () => {
    fc.assert(
      fc.property(validPostArb, localeArb, (post, lang) => {
        // ---- Article ----
        const article = buildArticleLd(post, lang);
        expect(article).not.toBeNull();
        const a = article as Record<string, unknown>;

        const headline = a.headline as string;
        expect(typeof headline).toBe("string");
        expect(headline.length).toBeGreaterThanOrEqual(1);
        expect(headline.length).toBeLessThanOrEqual(110);

        const author = a.author as { name?: unknown };
        expect(author).toBeTruthy();
        expect(typeof author.name).toBe("string");
        expect((author.name as string).length).toBeGreaterThan(0);

        expect(isIso8601(a.datePublished)).toBe(true);
        expect(a.inLanguage).toBe(lang);
        expect(["ru", "en"]).toContain(a.inLanguage);

        // URL абсолютен с сегментом локали.
        const mainEntity = a.mainEntityOfPage as { "@id": string };
        expect(mainEntity["@id"]).toBe(
          `${SITE_ORIGIN}/${lang}/blog/${post.slug}`,
        );

        // ---- BreadcrumbList ----
        const crumb = buildBreadcrumbLd(post, lang);
        expect(crumb).not.toBeNull();
        const c = crumb as Record<string, unknown>;

        const items = c.itemListElement as Array<Record<string, unknown>>;
        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBeGreaterThanOrEqual(2);

        items.forEach((item, idx) => {
          // Упорядоченность: position возрастает с 1.
          expect(item.position).toBe(idx + 1);
          expect(typeof item.name).toBe("string");
          expect((item.name as string).length).toBeGreaterThan(0);
          const url = item.item as string;
          expect(typeof url).toBe("string");
          expect(url.startsWith(`${SITE_ORIGIN}/${lang}/`)).toBe(true);
        });
      }),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Property 18
  // -------------------------------------------------------------------------
  // Feature: project-polish-and-seo-automation, Property 18
  // Опущение блока при отсутствии обязательного свойства: когда обязательное
  // поле отсутствует/некорректно (пустой title, headline >110, плохая дата,
  // неподдерживаемая локаль), билдер возвращает null.
  // Validates: Requirements 11.6
  it("Property 18: builder returns null when a required field is missing or invalid", () => {
    // Каждый вариант намеренно нарушает ровно одно обязательное свойство.
    const brokenArb = fc.oneof(
      // Неподдерживаемая локаль.
      validPostArb.map((post) => ({
        post,
        lang: "de",
        reason: "bad-locale" as const,
      })),
      // Пустой title (headline < 1).
      validPostArb.map((post) => ({
        post: { ...post, title: "   " },
        lang: "ru",
        reason: "empty-title" as const,
      })),
      // headline > 110.
      validPostArb.map((post) => ({
        post: { ...post, title: "z".repeat(111) },
        lang: "en",
        reason: "headline-too-long" as const,
      })),
      // Некорректная дата.
      validPostArb.map((post) => ({
        post: { ...post, created_at: "not-a-date" },
        lang: "ru",
        reason: "bad-date" as const,
      })),
      // Пустой slug.
      validPostArb.map((post) => ({
        post: { ...post, slug: "" },
        lang: "en",
        reason: "empty-slug" as const,
      })),
    );

    fc.assert(
      fc.property(brokenArb, ({ post, lang, reason }) => {
        const article = buildArticleLd(post as BlogPost, lang);
        expect(article).toBeNull();

        // BreadcrumbList опускается при неподдерживаемой локали, пустом slug
        // или пустом title (его обязательные предпосылки).
        if (
          reason === "bad-locale" ||
          reason === "empty-slug" ||
          reason === "empty-title"
        ) {
          expect(buildBreadcrumbLd(post as BlogPost, lang)).toBeNull();
        }
      }),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Task 9.7 — example-тест
  // -------------------------------------------------------------------------
  // Validates: Requirements 11.1, 11.5
  it("example: a known-good post yields valid Article + BreadcrumbList objects with correct @context/@type", () => {
    const post: BlogPost = {
      id: 1,
      title: "Building a Resilient SEO Pipeline",
      slug: "resilient-seo-pipeline",
      excerpt: "How we automated metadata, JSON-LD and IndexNow.",
      content: "Full markdown content here.",
      created_at: "2024-05-01T10:00:00.000Z",
      updated_at: "2024-05-02T12:30:00.000Z",
      tags: ["seo", "nextjs"],
      is_published: true,
      og_image: "/og/seo.png",
    };

    const article = buildArticleLd(post, "en");
    expect(article).not.toBeNull();
    expect(article!["@context"]).toBe("https://schema.org");
    expect(article!["@type"]).toBe("Article");
    expect(article!.headline).toBe("Building a Resilient SEO Pipeline");
    expect(article!.inLanguage).toBe("en");
    expect(article!.datePublished).toBe("2024-05-01T10:00:00.000Z");
    expect(article!.dateModified).toBe("2024-05-02T12:30:00.000Z");
    expect((article!.author as { name: string }).name.length).toBeGreaterThan(
      0,
    );
    expect((article!.mainEntityOfPage as { "@id": string })["@id"]).toBe(
      `${SITE_ORIGIN}/en/blog/resilient-seo-pipeline`,
    );

    const crumb = buildBreadcrumbLd(post, "en");
    expect(crumb).not.toBeNull();
    expect(crumb!["@context"]).toBe("https://schema.org");
    expect(crumb!["@type"]).toBe("BreadcrumbList");
    const items = crumb!.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].item).toBe(`${SITE_ORIGIN}/en/blog`);
    expect(items[1].item).toBe(`${SITE_ORIGIN}/en/blog/resilient-seo-pipeline`);
  });

  // -------------------------------------------------------------------------
  // isIso8601 — поддержка свойств
  // -------------------------------------------------------------------------
  it("isIso8601 accepts valid ISO dates and rejects invalid ones", () => {
    expect(isIso8601("2024-05-01T10:00:00.000Z")).toBe(true);
    expect(isIso8601("2024-05-01")).toBe(true);
    expect(isIso8601("not-a-date")).toBe(false);
    expect(isIso8601("")).toBe(false);
    expect(isIso8601(undefined)).toBe(false);
    expect(isIso8601(12345)).toBe(false);
  });
});
