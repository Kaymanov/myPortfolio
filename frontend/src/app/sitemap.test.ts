import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

// `sitemap.ts` импортирует `getBlogPosts` из `@/lib/api`. Мокаем модуль, чтобы
// дефолтный `sitemap()` не делал сетевых запросов и чтобы Property 20 могла
// управлять исходом источника постов.
vi.mock("@/lib/api", () => ({
  getBlogPosts: vi.fn(),
}));

import { getBlogPosts } from "@/lib/api";
import sitemap, { blogEntries, staticEntries } from "./sitemap";
import { BlogPost } from "@/types";

/**
 * Tests for the localized sitemap (app/sitemap.ts).
 *
 * - Property 19 (task 10.2): полнота, локализация, lastmod и исключения карты
 *   сайта — тестируется на чистых помощниках blogEntries/staticEntries, без
 *   сети.
 * - Property 20 (task 10.3): устойчивость карты сайта к сбою источника —
 *   дефолтный sitemap() возвращает все статические страницы для обеих локалей,
 *   когда источник постов даёт пустой результат (контракт устойчивого
 *   getBlogPosts).
 */

const BASE_URL = "https://iamroot.pro";
const LOCALES = ["ru", "en"] as const;

// Валидные даты (без NaN), чтобы round-trip через ISO был точным.
const dateArb = fc.date({
  min: new Date("2000-01-01T00:00:00.000Z"),
  max: new Date("2100-01-01T00:00:00.000Z"),
  noInvalidDate: true,
});

// Сырьё одного поста: вариант флага публикации и наличие/значение дат.
// is_published ∈ {true, false, undefined}; фильтр sitemap — `!== false`.
const rawPostArb = fc.record({
  publishState: fc.constantFrom<true | false | undefined>(
    true,
    false,
    undefined,
  ),
  hasUpdated: fc.boolean(),
  updatedAt: dateArb,
  createdAt: dateArb,
});

type RawPost = {
  publishState: true | false | undefined;
  hasUpdated: boolean;
  updatedAt: Date;
  createdAt: Date;
};

// Строит пост с УНИКАЛЬНЫМ slug (по индексу), чтобы исключённые посты можно
// было надёжно отличать от включённых даже при общих прочих полях.
function buildPost(raw: RawPost, index: number): BlogPost {
  return {
    id: index,
    title: `Post ${index}`,
    slug: `post-${index}`,
    excerpt: "x",
    content: "x",
    created_at: raw.createdAt.toISOString(),
    updated_at: raw.hasUpdated ? raw.updatedAt.toISOString() : undefined,
    tags: [],
    is_published: raw.publishState as boolean,
  };
}

/**
 * Feature: project-polish-and-seo-automation, Property 19
 *
 * Полнота, локализация, lastmod и исключения карты сайта.
 * Для любого массива постов комбинация staticEntries + blogEntries:
 *  - даёт ровно по одной абсолютной записи на каждую локаль (ru/en) для каждой
 *    статической страницы и каждого ОПУБЛИКОВАННОГО поста;
 *  - каждая запись содержит alternates.languages с абсолютными ru- и en-URL;
 *  - lastModified поста равен updated_at (откат на created_at);
 *  - ни один пост с is_published === false не появляется в записях.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4
 */
describe("sitemap helpers — Property 19", () => {
  it("blogEntries + staticEntries: localized, complete, correct lastmod, excludes unpublished", () => {
    fc.assert(
      fc.property(fc.array(rawPostArb, { maxLength: 30 }), (raws) => {
        const posts = raws.map(buildPost);

        const statics = staticEntries();
        const blogs = blogEntries(posts);
        const all = [...statics, ...blogs];

        // --- Статические страницы: "/" и "/blog" × {ru, en} = 4 записи ---
        expect(statics).toHaveLength(4);
        for (const path of ["", "/blog"] as const) {
          for (const loc of LOCALES) {
            const entry = statics.find(
              (e) => e.url === `${BASE_URL}/${loc}${path}`,
            );
            expect(entry).toBeDefined();
          }
        }

        // --- Опубликованные посты: фильтр is_published !== false ---
        const published = posts.filter((p) => p.is_published !== false);
        const unpublished = posts.filter((p) => p.is_published === false);

        // Ровно 2 записи (ru+en) на каждый опубликованный пост.
        expect(blogs).toHaveLength(published.length * 2);

        // Множество URL для проверки исключения снятых с публикации постов.
        const blogUrls = new Set(blogs.map((e) => e.url));

        // Ни один URL снятого с публикации поста не появляется (R12.4).
        for (const post of unpublished) {
          for (const loc of LOCALES) {
            expect(blogUrls.has(`${BASE_URL}/${loc}/blog/${post.slug}`)).toBe(
              false,
            );
          }
        }

        // Для каждого опубликованного поста: по записи на локаль с корректными
        // URL, hreflang-альтернативами и lastModified (R12.1–R12.3).
        for (const post of published) {
          const expectedLastModified = new Date(
            post.updated_at ?? post.created_at,
          ).getTime();

          for (const loc of LOCALES) {
            const url = `${BASE_URL}/${loc}/blog/${post.slug}`;
            const entry = blogs.find((e) => e.url === url);
            expect(entry).toBeDefined();
            if (!entry) continue;

            // lastModified = updated_at (откат на created_at) (R12.3).
            expect(new Date(entry.lastModified as Date).getTime()).toBe(
              expectedLastModified,
            );

            // alternates.languages: абсолютные ru/en URL (R12.2).
            const languages = entry.alternates?.languages;
            expect(languages?.ru).toBe(`${BASE_URL}/ru/blog/${post.slug}`);
            expect(languages?.en).toBe(`${BASE_URL}/en/blog/${post.slug}`);
          }
        }

        // Каждая запись (статическая и блог) абсолютна и имеет hreflang ru+en.
        for (const entry of all) {
          expect(entry.url.startsWith(`${BASE_URL}/`)).toBe(true);
          const languages = entry.alternates?.languages;
          expect(typeof languages?.ru).toBe("string");
          expect(typeof languages?.en).toBe("string");
          expect((languages?.ru as string).startsWith(`${BASE_URL}/`)).toBe(
            true,
          );
          expect((languages?.en as string).startsWith(`${BASE_URL}/`)).toBe(
            true,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});

const mockedGetBlogPosts = vi.mocked(getBlogPosts);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Feature: project-polish-and-seo-automation, Property 20
 *
 * Устойчивость карты сайта к сбою источника.
 * Устойчивый клиент `getBlogPosts` при сбое получения возвращает `[]` (а не
 * бросает), поэтому дефолтный `sitemap()` всегда содержит все статические
 * страницы для обеих локалей и не падает (R12.6).
 *
 * Validates: Requirements 12.6
 */
describe("sitemap default — Property 20", () => {
  it("returns all static pages for both locales when blog source yields no posts", async () => {
    // Источник постов недоступен → устойчивый клиент отдаёт [].
    mockedGetBlogPosts.mockResolvedValue([]);

    const result = await sitemap();

    // 4 статические записи: "/" и "/blog" × {ru, en}; без блог-записей.
    expect(result).toHaveLength(4);
    for (const path of ["", "/blog"] as const) {
      for (const loc of LOCALES) {
        expect(result.some((e) => e.url === `${BASE_URL}/${loc}${path}`)).toBe(
          true,
        );
      }
    }
  });

  it("does not throw and still includes static pages regardless of resolved post set", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(rawPostArb, { maxLength: 10 }),
        async (raws) => {
          const posts = raws.map(buildPost);
          mockedGetBlogPosts.mockResolvedValue(posts);

          const result = await sitemap();

          // Статические страницы всегда присутствуют для обеих локалей.
          for (const path of ["", "/blog"] as const) {
            for (const loc of LOCALES) {
              expect(
                result.some((e) => e.url === `${BASE_URL}/${loc}${path}`),
              ).toBe(true);
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
