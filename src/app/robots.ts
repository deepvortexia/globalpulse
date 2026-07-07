import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/api/cron/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'anthropic-ai',
          'PerplexityBot',
          'GoogleOther',
          'cohere-ai',
          'FacebookBot',
          'Applebot',
        ],
        allow: '/',
      },
    ],
    sitemap: [
      'https://globevortex.com/sitemap.xml',
      'https://globevortex.com/news-sitemap.xml',
    ],
    host: 'https://globevortex.com',
  };
}
