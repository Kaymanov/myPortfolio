import { BlogPost, Education, Experience, Project, SkillGroup } from "@/types";

// Умная функция для определения правильного URL
const getBaseUrl = () => {
  if (typeof window === "undefined") {
    // Мы на сервере (SSR внутри Docker-сети)
    // Обращаемся напрямую к контейнеру backend по HTTP
    return process.env.SSR_API_URL || "http://backend:8000/api";
  }
  // Мы в браузере клиента (CSR)
  // Обращаемся через публичный домен по HTTPS
  return process.env.NEXT_PUBLIC_API_URL || "https://iamroot.pro/api";
};

// Тайм-аут запроса к Content_API (R1.2): 5 секунд от инициирования запроса.
const FETCH_TIMEOUT_MS = 5000;

interface FetchOptions {
  tags: string[];
  revalidate?: number;
  lang: string;
}

/**
 * Диагностическое логирование сбоя получения контента (R1.5).
 *
 * Пишет ровно одну структурную запись `{ endpoint, status }` через
 * `console.error`. Вызывается синхронно непосредственно перед возвратом
 * fallback, не пробрасывает исключения и не блокирует/не задерживает рендер.
 */
function logFetchDiagnostic(endpoint: string, statusOrError: number | unknown) {
  const status =
    typeof statusOrError === "number"
      ? statusOrError
      : statusOrError instanceof Error
        ? statusOrError.name === "AbortError"
          ? "timeout"
          : statusOrError.message
        : String(statusOrError);

  console.error("[content-fetch] diagnostic", { endpoint, status });
}

/**
 * Единый помощник получения контента (R1).
 *
 * - `AbortController` с тайм-аутом 5 c (R1.2).
 * - При неуспешном HTTP-статусе, выброшенном исключении или тайм-ауте
 *   возвращает `fallback` (`[]` для коллекций, `null` для одиночного поста)
 *   и пишет ровно одну диагностическую запись (R1.1, R1.3, R1.5).
 * - Возврат fallback не зависит от логирования.
 */
async function fetchJson<T>(
  endpoint: string,
  fallback: T,
  opts: FetchOptions,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS); // R1.2
  try {
    const res = await fetch(`${getBaseUrl()}/${endpoint}/`, {
      headers: { "Accept-Language": opts.lang },
      next: { tags: opts.tags, revalidate: opts.revalidate ?? 3600 },
      signal: controller.signal,
    });

    if (!res.ok) {
      logFetchDiagnostic(endpoint, res.status); // R1.5
      return fallback; // R1.1
    }

    return (await res.json()) as T;
  } catch (err) {
    logFetchDiagnostic(endpoint, err); // R1.5 (таймаут/сеть)
    return fallback; // R1.1, R1.3
  } finally {
    clearTimeout(timer);
  }
}

export async function getSkills(lang: string = "ru"): Promise<SkillGroup[]> {
  return fetchJson<SkillGroup[]>("skills", [], {
    tags: ["skills"],
    lang,
  });
}

export async function getProjects(lang: string = "ru"): Promise<Project[]> {
  return fetchJson<Project[]>("projects", [], {
    tags: ["projects"],
    lang,
  });
}

export async function getExperience(
  lang: string = "ru",
): Promise<Experience[]> {
  return fetchJson<Experience[]>("experience", [], {
    tags: ["experience"],
    lang,
  });
}

export async function getEducation(lang: string = "ru"): Promise<Education[]> {
  return fetchJson<Education[]>("education", [], {
    tags: ["education"],
    lang,
  });
}

export async function getBlogPosts(lang: string = "ru"): Promise<BlogPost[]> {
  return fetchJson<BlogPost[]>("blogposts", [], {
    tags: ["blogposts"],
    lang,
  });
}

export async function getBlogPost(
  slug: string,
  lang: string = "ru",
): Promise<BlogPost | null> {
  // Семантика сохраняется: `null` при 404 (страница вызывает notFound() → 404,
  // R1.4) и `null` при прочих ошибках/тайм-ауте (R1.1).
  return fetchJson<BlogPost | null>(`blogposts/${slug}`, null, {
    tags: [`blogpost-${slug}`],
    lang,
  });
}
