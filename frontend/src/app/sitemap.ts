import { MetadataRoute } from 'next'
import { getBlogPosts } from "@/lib/api";
import { BlogPost } from "@/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://iamroot.pro';
  
  let blogUrls: MetadataRoute.Sitemap = [];
  
  try {
    const posts = await getBlogPosts();
    blogUrls = posts.map((post: BlogPost) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error("Failed to fetch posts for sitemap", error);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    ...blogUrls,
  ];
}
