import { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/api";
import { BlogPost } from "@/types";

const BASE_URL = "https://iamroot.pro";
const LOCALES = ["ru", "en"] as const;

/**
 * Создаёт по одной абсолютной записи карты сайта на каждую Локаль (`ru`, `en`)
 * с hreflang-альтернативами на абсолютные локализованные URL (R12.1, R12.2).
 *
 * @param path путь без сегмента локали, начинающийся со `/` (например `""` для
 *   корня или `/blog/<slug>`).
 * @param lastModified метка последнего изменения; Next.js сериализует `Date`
 *   в W3C Datetime / ISO 8601 UTC (R12.3).
 */
export function localizedEntry(
  path: string,
  lastModified: Date,
  options: {
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority?: number;
  } = {},
): MetadataRoute.Sitemap {
  const languages = {
    ru: `${BASE_URL}/ru${path}`,
    en: `${BASE_URL}/en${path}`,
  };

  return LOCALES.map((loc) => ({
    url: `${BASE_URL}/${loc}${path}`,
    lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: { languages },
  }));
}

/**
 * Возвращает локализованные записи карты сайта для всех статических страниц
 * (`/`, `/blog`) для обеих Локалей.
 */
export function staticEntries(now: Date = new Date()): MetadataRoute.Sitemap {
  return [
    ...localizedEntry("", now, { changeFrequency: "weekly", priority: 1 }),
    ...localizedEntry("/blog", now, {
      changeFrequency: "daily",
      priority: 0.9,
    }),
  ];
}

/**
 * Преобразует опубликованные посты в локализованные записи карты сайта.
 * Исключает посты с `is_published === false` (R12.4) и использует `updated_at`
 * (с откатом на `created_at`) как метку последнего изменения (R12.3).
 */
export function blogEntries(posts: BlogPost[]): MetadataRoute.Sitemap {
  return posts
    .filter((post) => post.is_published !== false)
    .flatMap((post) => {
      const lastModified = new Date(post.updated_at ?? post.created_at);
      return localizedEntry(`/blog/${post.slug}`, lastModified, {
        changeFrequency: "weekly",
        priority: 0.8,
      });
    });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // `getBlogPosts()` — устойчивый клиент: при сбое возвращает `[]`, поэтому
  // карта сайта всегда содержит статические страницы обеих Локалей без ошибки
  // (R12.6). Кэш-тег `blogposts` обеспечивает перегенерацию (R12.5).
  const posts = await getBlogPosts();

  return [...staticEntries(), ...blogEntries(posts)];
}
