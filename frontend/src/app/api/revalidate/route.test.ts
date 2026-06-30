import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Мокаем next/cache: revalidateTag не должен реально дёргать кэш Next.js.
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

import { revalidateTag } from "next/cache";
import { POST } from "./route";

const CONFIGURED_SECRET = "configured-test-secret";

/**
 * Конструирует минимальный объект-заглушку запроса с методом `json()`,
 * совместимый с обращением `request.json()` внутри POST-обработчика.
 */
function fakeRequest(body: unknown) {
  return {
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.REVALIDATION_SECRET = CONFIGURED_SECRET;
});

describe("POST /api/revalidate", () => {
  // Feature: project-polish-and-seo-automation, Property 3
  // Валидный запрос ревалидирует каждый переданный тег: для любого непустого
  // массива строк-тегов при корректном секрете revalidateTag вызывается ровно
  // по одному разу на каждый тег, а ответ — {revalidated:true, tags}.
  it("Property 3: valid request revalidates each tag", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
        async (tags) => {
          vi.clearAllMocks();
          process.env.REVALIDATION_SECRET = CONFIGURED_SECRET;

          const res = await POST(
            fakeRequest({ secret: CONFIGURED_SECRET, tags }),
          );

          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body).toEqual({ revalidated: true, tags });

          expect(revalidateTag).toHaveBeenCalledTimes(tags.length);
          tags.forEach((tag, i) => {
            expect(revalidateTag).toHaveBeenNthCalledWith(i + 1, tag, "max");
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: project-polish-and-seo-automation, Property 4
  // Несовпадающий секрет всегда отклоняется без ревалидации: для любого
  // предоставленного секрета != настроенному → 401 и revalidateTag не вызван.
  it("Property 4: mismatched secret returns 401 and does not revalidate", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => s !== CONFIGURED_SECRET),
        fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
        async (provided, tags) => {
          vi.clearAllMocks();
          process.env.REVALIDATION_SECRET = CONFIGURED_SECRET;

          const res = await POST(fakeRequest({ secret: provided, tags }));

          expect(res.status).toBe(401);
          expect(revalidateTag).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: project-polish-and-seo-automation, Property 6
  // Пустой настроенный секрет отклоняет запрос без сравнения: когда env-секрет
  // пуст/не задан, любой запрос → 401 и revalidateTag не вызван.
  it("Property 6: empty configured secret returns 401 without comparison", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string(), { nil: undefined }),
        fc.oneof(
          fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
          fc.constant(undefined),
          fc.constant([]),
        ),
        fc.constantFrom("", undefined),
        async (provided, tags, configured) => {
          vi.clearAllMocks();
          if (configured === undefined) {
            delete process.env.REVALIDATION_SECRET;
          } else {
            process.env.REVALIDATION_SECRET = configured;
          }

          const res = await POST(fakeRequest({ secret: provided, tags }));

          expect(res.status).toBe(401);
          expect(revalidateTag).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: project-polish-and-seo-automation, Property 7
  // Некорректное значение tags отклоняется без ревалидации: при корректном
  // секрете, если tags отсутствует/не массив/пустой массив → 400 и без
  // ревалидации.
  it("Property 7: invalid tags returns 400 and does not revalidate", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(undefined),
          fc.constant(null),
          fc.constant([]),
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.object(),
        ),
        async (tags) => {
          vi.clearAllMocks();
          process.env.REVALIDATION_SECRET = CONFIGURED_SECRET;

          const res = await POST(
            fakeRequest({ secret: CONFIGURED_SECRET, tags }),
          );

          expect(res.status).toBe(400);
          expect(revalidateTag).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
