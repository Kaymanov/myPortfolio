import { afterEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { proxy } from "./proxy";

/**
 * Task 10.8 example tests — артефакт ключа IndexNow (R14.2).
 *
 * Файл ключа IndexNow отдаётся middleware/`proxy` по корневому пути
 * `/{key}.txt`: содержимое равно настроенному ключу с HTTP 200. Если
 * `INDEXNOW_KEY` не задан, путь не перехватывается (пустой ключ никогда не
 * возвращается).
 *
 * Артефакты верификации Google/Яндекс (R14.5) отдаются статикой из `public/`,
 * поэтому не покрываются здесь юнит-тестом (нет логики для проверки).
 */

const KEY = "abc123indexnowkey";

/**
 * Минимальный фейковый NextRequest для веток proxy: `nextUrl.pathname` и
 * `headers.get(...)` — единственное, к чему обращается обработчик.
 */
function fakeRequest(pathname: string): NextRequest {
  return {
    nextUrl: { pathname },
    headers: new Headers(),
  } as unknown as NextRequest;
}

afterEach(() => {
  delete process.env.INDEXNOW_KEY;
});

describe("proxy — IndexNow key file (task 10.8 / R14.2)", () => {
  it("serves the key body with HTTP 200 at /{key}.txt when INDEXNOW_KEY is set", async () => {
    process.env.INDEXNOW_KEY = KEY;

    const res = proxy(fakeRequest(`/${KEY}.txt`));

    expect(res).toBeDefined();
    expect(res!.status).toBe(200);
    expect(res!.headers.get("content-type")).toContain("text/plain");
    const body = await res!.text();
    expect(body).toBe(KEY);
  });

  it("does not serve the key file when INDEXNOW_KEY is unset (passes through)", () => {
    delete process.env.INDEXNOW_KEY;

    // Без заданного ключа путь `/{key}.txt` не должен перехватываться как
    // артефакт IndexNow. Путь содержит точку, поэтому proxy пропускает его
    // (возврат undefined = продолжить обычную обработку).
    const res = proxy(fakeRequest(`/${KEY}.txt`));

    expect(res).toBeUndefined();
  });

  it("ignores a path that does not match the configured key", () => {
    process.env.INDEXNOW_KEY = KEY;

    // Другое имя файла `.txt` не равно `/{key}.txt` → не отдаётся как ключ.
    const res = proxy(fakeRequest("/some-other-file.txt"));

    // Путь содержит точку → proxy пропускает (undefined), ключ не возвращается.
    expect(res).toBeUndefined();
  });
});
