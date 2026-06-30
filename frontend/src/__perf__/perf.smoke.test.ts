import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

/**
 * Smoke-тесты конфигурации производительности (task 13.6).
 *
 * Это лёгкие статические утверждения, а не runtime-замеры производительности
 * (LCP/CLS/INP измеряются отдельно через Lighthouse — Requirements 15.2-15.4).
 *
 * Покрытие:
 * - R15.1: современные форматы изображений (AVIF предпочтительнее, затем WebP)
 *   настроены в next.config.ts.
 * - R15.6: тяжёлый 3D-компонент (three.js) загружается лениво через
 *   next/dynamic с ssr:false, поэтому three.js не попадает в первоначальный/SSR
 *   бандл.
 *
 * Примечание по R15.5: серверный рендеринг основного контента обеспечивается
 * самой архитектурой React Server Components (HeroSection и текст страницы —
 * серверные компоненты, попадающие в первоначальный HTML). Это инвариант
 * фреймворка, а не отдельная единица конфигурации, поэтому отдельного
 * статического утверждения для него здесь нет.
 */

// process.cwd() под vitest — это директория frontend (где лежит vitest.config.ts).
const frontendDir = process.cwd();

describe("performance config smoke tests", () => {
  // R15.1
  it("настраивает современные форматы изображений avif затем webp (R15.1)", () => {
    expect(nextConfig.images?.formats).toEqual(["image/avif", "image/webp"]);
  });

  // R15.6
  describe("ленивая загрузка тяжёлого 3D-компонента (R15.6)", () => {
    const loaderPath = join(
      frontendDir,
      "src",
      "components",
      "DigitalHeadLoader.tsx",
    );
    const loaderSource = readFileSync(loaderPath, "utf8");

    it("использует next/dynamic для отложенной загрузки", () => {
      expect(loaderSource).toMatch(/from\s+["']next\/dynamic["']/);
      expect(loaderSource).toMatch(/dynamic\s*\(/);
    });

    it("импортирует DigitalHead динамически (отдельный чанк, не в начальном бандле)", () => {
      expect(loaderSource).toMatch(/import\(\s*["']\.\/DigitalHead["']\s*\)/);
    });

    it("отключает SSR (ssr:false), чтобы three.js не попадал в SSR-бандл", () => {
      expect(loaderSource).toMatch(/ssr\s*:\s*false/);
    });
  });
});
