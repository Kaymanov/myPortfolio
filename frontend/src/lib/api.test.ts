import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import {
  getBlogPost,
  getBlogPosts,
  getEducation,
  getExperience,
  getProjects,
  getSkills,
} from "./api";

/**
 * Tests for the resilient content client (lib/api.ts).
 *
 * - Property 1 (task 5.2): failure of any kind → fallback ([]) + exactly one
 *   diagnostic log; success → parsed data.
 * - Task 5.3 edge/unit: getBlogPost null on 404; 5s timeout/abort path yields
 *   fallback.
 */

// Collection getters under test. Each returns [] on any failure and parsed
// data on success (R1.1, R1.3).
const collectionGetters: Array<{
  name: string;
  endpoint: string;
  call: () => Promise<unknown[]>;
}> = [
  { name: "getSkills", endpoint: "skills", call: () => getSkills("ru") },
  { name: "getProjects", endpoint: "projects", call: () => getProjects("ru") },
  {
    name: "getExperience",
    endpoint: "experience",
    call: () => getExperience("ru"),
  },
  {
    name: "getEducation",
    endpoint: "education",
    call: () => getEducation("ru"),
  },
  {
    name: "getBlogPosts",
    endpoint: "blogposts",
    call: () => getBlogPosts("ru"),
  },
];

// A synchronous-resolving fake Response with a controllable ok/status/json.
function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
  vi.restoreAllMocks();
});

/**
 * Feature: project-polish-and-seo-automation, Property 1
 *
 * Сбой получения контента всегда даёт fallback и диагностический лог.
 * Для любого исхода (не-ok статус или брошенное исключение) коллекционный
 * геттер возвращает [] и пишет ровно одну диагностическую запись с именем
 * эндпоинта и статусом; при успехе — распарсенные данные.
 *
 * Validates: Requirements 1.1, 1.3, 1.5
 */

// Scenario generator: either a non-ok HTTP status, a thrown error, or success.
type Scenario =
  | { kind: "status"; status: number }
  | { kind: "throw" }
  | { kind: "ok"; data: unknown[] };

const scenarioArb: fc.Arbitrary<Scenario> = fc.oneof(
  // Non-ok status codes (exclude the 2xx success range).
  fc
    .integer({ min: 300, max: 599 })
    .map<Scenario>((status) => ({ kind: "status", status })),
  fc.constant<Scenario>({ kind: "throw" }),
  fc
    .array(fc.record({ id: fc.integer() }))
    .map<Scenario>((data) => ({ kind: "ok", data })),
);

describe("resilient content client — Property 1", () => {
  it("collection getters return fallback + one diagnostic on failure, data on success", async () => {
    await fc.assert(
      fc.asyncProperty(
        scenarioArb,
        fc.constantFrom(...collectionGetters),
        async (scenario, getter) => {
          errorSpy.mockClear();

          const fetchMock = vi.fn(async () => {
            if (scenario.kind === "throw") {
              throw new TypeError("network down");
            }
            if (scenario.kind === "status") {
              return makeResponse(scenario.status, null);
            }
            return makeResponse(200, scenario.data);
          });
          vi.stubGlobal("fetch", fetchMock);

          const result = await getter.call();

          if (scenario.kind === "ok") {
            expect(result).toEqual(scenario.data);
            expect(errorSpy).not.toHaveBeenCalled();
          } else {
            // Any failure → fallback [] (R1.1, R1.3)
            expect(result).toEqual([]);
            // Exactly one diagnostic record (R1.5)
            expect(errorSpy).toHaveBeenCalledTimes(1);
            // Diagnostic contains endpoint + status/error
            const diagnostic = errorSpy.mock.calls[0];
            const payload = diagnostic[diagnostic.length - 1] as {
              endpoint: string;
              status: unknown;
            };
            expect(payload.endpoint).toBe(getter.endpoint);
            if (scenario.kind === "status") {
              expect(payload.status).toBe(scenario.status);
            } else {
              expect(payload.status).toBeDefined();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("resilient content client — task 5.3 edge/unit", () => {
  it("getBlogPost returns null on 404 (R1.4)", async () => {
    const fetchMock = vi.fn(async () => makeResponse(404, null));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getBlogPost("unknown-slug", "ru");

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = errorSpy.mock.calls[0][
      errorSpy.mock.calls[0].length - 1
    ] as { endpoint: string; status: unknown };
    expect(payload.endpoint).toBe("blogposts/unknown-slug");
    expect(payload.status).toBe(404);
  });

  it("getBlogPost returns parsed post on success", async () => {
    const post = { id: 1, slug: "hello", title: "Hello" };
    const fetchMock = vi.fn(async () => makeResponse(200, post));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getBlogPost("hello", "ru");

    expect(result).toEqual(post);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("aborted request (5s timeout) yields fallback for collections (R1.2)", async () => {
    // Simulate the AbortController timeout firing: fetch rejects with an
    // AbortError DOMException, exactly as the browser/runtime does on abort.
    const fetchMock = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getSkills("ru");

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = errorSpy.mock.calls[0][
      errorSpy.mock.calls[0].length - 1
    ] as { endpoint: string; status: unknown };
    expect(payload.endpoint).toBe("skills");
    // AbortError is reported as "timeout" by logFetchDiagnostic.
    expect(payload.status).toBe("timeout");
  });

  it("aborted request (5s timeout) yields null fallback for getBlogPost (R1.2)", async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getBlogPost("hello", "ru");

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
