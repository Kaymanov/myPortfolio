import { BlogPost } from "@/types";

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

const getHeaders = (lang: string) => ({
  "Accept-Language": lang,
});

export async function getSkills(lang: string = "ru") {
  const res = await fetch(`${getBaseUrl()}/skills/`, {
    headers: getHeaders(lang),
    next: { tags: ["skills"], revalidate: 3600 }, // Кэшируем данные на час (фишка Next.js)
  });

  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json();
}

export async function getProjects(lang: string = "ru") {
  const res = await fetch(`${getBaseUrl()}/projects/`, {
    headers: getHeaders(lang),
    next: { tags: ["projects"], revalidate: 3600 },
  });

  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function getExperience(lang: string = "ru") {
  try {
    const res = await fetch(`${getBaseUrl()}/experience/`, {
      headers: getHeaders(lang),
      next: { tags: ["experience"], revalidate: 3600 }, // Кэшируем на час
    });

    if (!res.ok) return []; // Если эндпоинта еще нет, не ломаем сайт, отдаем пустой массив
    return res.json();
  } catch (error) {
    console.error("Failed to fetch experience:", error);
    return [];
  }
}

export async function getEducation(lang: string = "ru") {
  try {
    const res = await fetch(`${getBaseUrl()}/education/`, {
      headers: getHeaders(lang),
      next: { tags: ["education"], revalidate: 3600 },
    });

    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch education:", error);
    return [];
  }
}

export async function getBlogPosts(lang: string = "ru") {
  try {
    const res = await fetch(`${getBaseUrl()}/blogposts/`, {
      headers: getHeaders(lang),
      next: { tags: ["blogposts"], revalidate: 3600 },
    });

    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch blog posts:", error);
    return [];
  }
}

export async function getBlogPost(
  slug: string,
  lang: string = "ru",
): Promise<BlogPost | null> {
  try {
    // Предполагается, что твой Django API умеет искать по slug
    const res = await fetch(`${getBaseUrl()}/blogposts/${slug}/`, {
      headers: getHeaders(lang),
      next: { tags: [`blogpost-${slug}`], revalidate: 3600 }, // Кэшируем на час
    });

    if (!res.ok) {
      if (res.status === 404) return null; // Если статья не найдена
      throw new Error(`Error HTTP: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error(`Failed to fetch blog post (${slug}):`, error);
    return null;
  }
}
