import type { MetadataRoute } from 'next';
import { getArticleIdsForSitemap } from '@/lib/articles';

const SITE = 'https://globevortex.com';

// Shared-chrome pages exist in both locales, so each is listed twice with an
// hreflang `alternates.languages` block tying the two together (+ x-default).
const SHARED_PAGES: { path: string; changeFrequency: 'daily' | 'monthly'; priority: number }[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = SHARED_PAGES.flatMap((page) => {
    const languages = {
      en: `${SITE}/en${page.path}`,
      fr: `${SITE}/fr${page.path}`,
      'x-default': `${SITE}/en${page.path}`,
    };
    return (['en', 'fr'] as const).map((lang) => ({
      url: `${SITE}/${lang}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages },
    }));
  });

  // Each article exists in exactly one locale, so it's listed once under its own
  // language prefix — no cross-locale hreflang (there is no counterpart).
  const articles = await getArticleIdsForSitemap();
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => {
    const lang = article.language === 'fr' ? 'fr' : 'en';
    return {
      url: `${SITE}/${lang}/article/${article.id}`,
      lastModified: new Date(article.created_at),
      changeFrequency: 'never' as const,
      priority: 0.6,
    };
  });

  return [...staticPages, ...articlePages];
}
