import { MetadataRoute } from "next";

const SITEMAP_URL = "https://iamroot.pro/sitemap.xml";

/**
 * Чистая функция-билдер директив robots (R13.1–R13.4).
 *
 * - Обычный режим: подстановочный `user-agent: *` (покрывает Googlebot и
 *   YandexBot, R13.3) с `allow: '/'` и `disallow: ['/api/']` (R13.1), плюс
 *   ровно одна декларация sitemap `https://iamroot.pro/sitemap.xml` (R13.2).
 * - Режим обслуживания (`maintenance === true`): `disallow: '/'` и **без**
 *   директивы `allow` (R13.4).
 *
 * @param options.maintenance включён ли режим обслуживания.
 */
export function buildRobots({
  maintenance,
}: {
  maintenance: boolean;
}): MetadataRoute.Robots {
  if (maintenance) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: SITEMAP_URL,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: SITEMAP_URL,
  };
}

/**
 * «Закрытый» robots для безопасной деградации (R13.5): запрещает сканирование
 * корневого пути `/` и опускает любую директиву allow, не раскрывая приватные
 * пути.
 */
function closedRobots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}

export default function robots(): MetadataRoute.Robots {
  // Любой сбой генерации директив приводит к «закрытому» robots, а не к утечке
  // приватных путей или падению запроса (R13.5).
  try {
    const maintenance = process.env.MAINTENANCE_MODE === "true";
    return buildRobots({ maintenance });
  } catch {
    return closedRobots();
  }
}
