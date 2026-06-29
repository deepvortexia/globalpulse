import type { MetadataRoute } from 'next';
import { getArticleIdsForSitemap } from '@/lib/articles';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://globevortex.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://globevortex.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const articles = await getArticleIdsForSitemap();
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `https://globevortex.com/article/${article.id}`,
    lastModified: new Date(article.created_at),
    changeFrequency: 'never' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...articlePages];
}
