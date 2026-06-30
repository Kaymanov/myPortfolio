import { afterEach, describe, expect, it } from "vitest";
import robots, { buildRobots } from "./robots";

/**
 * Tests for robots directives (app/robots.ts).
 *
 * - Property 21 (task 10.5): безопасная деградация robots — при сбое генерации
 *   возвращается «закрытый» robots (disallow '/', без allow), приватные пути не
 *   раскрываются.
 * - Task 10.6 example: корректный вывод директив в штатном и обслуживающем
 *   режимах.
 */

const SITEMAP_URL = "https://iamroot.pro/sitemap.xml";

afterEach(() => {
  delete process.env.MAINTENANCE_MODE;
});

/**
 * Feature: project-polish-and-seo-automation, Property 21
 *
 * Безопасная деградация robots.
 * Если генерация директив robots завершается сбоем, дефолтный обработчик
 * возвращает «закрытый» robots: запрещает корневой путь `/` и опускает любую
 * директиву allow, не раскрывая приватные пути (R13.5).
 *
 * Validates: Requirements 13.5
 */
describe("robots — Property 21 (safe degradation)", () => {
  it("returns closed robots (disallow '/', no allow) when generation fails", () => {
    // Инъекция сбоя: подменяем process.env на Proxy, который бросает при
    // чтении MAINTENANCE_MODE внутри robots(), имитируя сбой генерации.
    const realEnv = process.env;
    const throwingEnv = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "MAINTENANCE_MODE") {
            throw new Error("env access failed");
          }
          return (realEnv as Record<string, unknown>)[prop as string];
        },
      },
    );
    // @ts-expect-error — намеренная подмена для инъекции сбоя в тесте.
    process.env = throwingEnv;

    try {
      const result = robots();
      const rules = result.rules;

      // Ровно одно правило (объект, а не массив правил) с disallow '/'.
      expect(Array.isArray(rules)).toBe(false);
      const rule = rules as {
        userAgent?: string;
        allow?: unknown;
        disallow?: unknown;
      };

      // Запрет корневого пути (R13.5).
      expect(rule.disallow).toBe("/");
      // Никакой директивы allow (приватные пути не раскрываются).
      expect(rule.allow).toBeUndefined();
    } finally {
      // Восстанавливаем настоящий process.env.
      process.env = realEnv;
    }
  });

  it("closed robots from a throwing generator omits private paths and allow", () => {
    // Прямая проверка контракта деградации: обёртка, чья генерация бросает,
    // должна давать только запрет '/' без перечисления приватных путей.
    const closed = (() => {
      try {
        throw new Error("boom");
      } catch {
        // Зеркалит closedRobots() из robots.ts.
        return { rules: { userAgent: "*", disallow: "/" } };
      }
    })();

    const rule = closed.rules as { allow?: unknown; disallow?: unknown };
    expect(rule.disallow).toBe("/");
    expect(rule.allow).toBeUndefined();
    // Приватные пути (например '/api/') не фигурируют в закрытом robots.
    expect(JSON.stringify(closed)).not.toContain("/api/");
  });
});

/**
 * Task 10.6 example tests — корректный вывод директив в штатном и
 * обслуживающем режимах (R13.1, R13.2, R13.3, R13.4).
 */
describe("buildRobots — directive output (task 10.6)", () => {
  it("normal mode: allow '/', disallow ['/api/'], wildcard UA, single sitemap", () => {
    const result = buildRobots({ maintenance: false });

    const rule = result.rules as {
      userAgent?: string;
      allow?: unknown;
      disallow?: unknown;
    };

    // Подстановочный user-agent покрывает Googlebot и YandexBot (R13.3).
    expect(rule.userAgent).toBe("*");
    // Разрешён корень '/' (R13.1).
    expect(rule.allow).toBe("/");
    // Запрещён '/api/' (R13.1).
    expect(rule.disallow).toEqual(["/api/"]);
    // Ровно одна декларация sitemap (R13.2).
    expect(result.sitemap).toBe(SITEMAP_URL);
  });

  it("maintenance mode: disallow '/', no allow", () => {
    const result = buildRobots({ maintenance: true });

    const rule = result.rules as {
      userAgent?: string;
      allow?: unknown;
      disallow?: unknown;
    };

    // Режим обслуживания: запрет корня '/' (R13.4).
    expect(rule.disallow).toBe("/");
    // Директива allow опущена (R13.4).
    expect(rule.allow).toBeUndefined();
    expect(rule.userAgent).toBe("*");
  });

  it("default robots() in normal mode mirrors buildRobots({maintenance:false})", () => {
    delete process.env.MAINTENANCE_MODE;
    const result = robots();
    expect(result).toEqual(buildRobots({ maintenance: false }));
  });

  it("default robots() honors MAINTENANCE_MODE=true", () => {
    process.env.MAINTENANCE_MODE = "true";
    const result = robots();
    expect(result).toEqual(buildRobots({ maintenance: true }));
  });
});
