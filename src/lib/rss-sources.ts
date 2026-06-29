import type { RSSSource } from "@/types";

export type { RSSSource };

export const RSS_SOURCES: RSSSource[] = [
  // English sources
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", language: "en", category: "world", country: "UK" },
  { name: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss", language: "en", category: "world", country: "US" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", language: "en", category: "world", country: "QA" },
  { name: "Reuters (via Google News)", url: "https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com", language: "en", category: "world", country: "US" },
  { name: "AP News", url: "https://rsshub.app/apnews/topics/apf-topnews", language: "en", category: "world", country: "US" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", language: "en", category: "world", country: "UK" },
  { name: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", language: "en", category: "world", country: "US" },
  { name: "Fox News World", url: "https://moxie.foxnews.com/google-publisher/world.xml", language: "en", category: "world", country: "US" },
  { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", language: "en", category: "world", country: "US" },
  { name: "Washington Post", url: "https://feeds.washingtonpost.com/rss/world", language: "en", category: "world", country: "US" },
  { name: "The Economist", url: "https://www.economist.com/international/rss.xml", language: "en", category: "business", country: "UK" },
  { name: "Bloomberg", url: "https://feeds.bloomberg.com/politics/news.rss", language: "en", category: "business", country: "US" },
  { name: "DW English", url: "https://rss.dw.com/rdf/rss-en-all", language: "en", category: "world", country: "DE" },
  { name: "Euronews EN", url: "https://www.euronews.com/rss?format=mrss&level=theme&name=news", language: "en", category: "world", country: "FR" },
  { name: "Independent UK", url: "https://www.independent.co.uk/news/world/rss", language: "en", category: "world", country: "UK" },
  { name: "NBC News", url: "https://feeds.nbcnews.com/nbcnews/public/news", language: "en", category: "world", country: "US" },
  { name: "CBS News", url: "https://www.cbsnews.com/latest/rss/world", language: "en", category: "world", country: "US" },
  { name: "Politico", url: "https://rss.politico.com/politics-news.xml", language: "en", category: "politics", country: "US" },
  { name: "Foreign Policy", url: "https://foreignpolicy.com/feed/", language: "en", category: "politics", country: "US" },
  { name: "The Hill", url: "https://thehill.com/news/feed/", language: "en", category: "politics", country: "US" },

  // French sources
  { name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml", language: "fr", category: "world", country: "FR" },
  { name: "Le Figaro", url: "https://www.lefigaro.fr/rss/figaro_actualites.xml", language: "fr", category: "world", country: "FR" },
  { name: "France24 FR", url: "https://www.france24.com/fr/rss", language: "fr", category: "world", country: "FR" },
  { name: "RFI", url: "https://www.rfi.fr/fr/rss", language: "fr", category: "world", country: "FR" },
  { name: "Radio-Canada", url: "https://ici.radio-canada.ca/rss/4159", language: "fr", category: "world", country: "CA" },
  { name: "La Presse", url: "https://www.lapresse.ca/actualites/rss", language: "fr", category: "world", country: "CA" },
  { name: "Euronews FR", url: "https://fr.euronews.com/rss?format=mrss&level=theme&name=news", language: "fr", category: "world", country: "FR" },
  { name: "Libération", url: "https://www.liberation.fr/arc/outboundfeeds/rss/", language: "fr", category: "world", country: "FR" },
  { name: "L'Express", url: "https://www.lexpress.fr/arc/outboundfeeds/rss/", language: "fr", category: "world", country: "FR" },
  { name: "20 Minutes", url: "https://www.20minutes.fr/feeds/rss/une.xml", language: "fr", category: "world", country: "FR" },

  // ── Specialized / topical feeds ──────────────────────────────────────────
  // The `category` here is advisory only: the rss-fetcher re-classifies every
  // article by keyword. These broaden topic coverage (science, sports, etc.).
  // URLs verified live; WHO/BFM TV/L'Équipe (404), ESPN (empty 202) and a
  // duplicate Al Jazeera feed were dropped.

  // Science & Tech (EN)
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", language: "en", category: "science", country: "US" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", language: "en", category: "science", country: "US" },
  { name: "Ars Technica", url: "http://feeds.arstechnica.com/arstechnica/index", language: "en", category: "science", country: "US" },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/", language: "en", category: "science", country: "US" },

  // Climate / Science (EN)
  { name: "Guardian Climate", url: "https://www.theguardian.com/environment/climate-crisis/rss", language: "en", category: "climate", country: "UK" },
  { name: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", language: "en", category: "climate", country: "UK" },

  // Sports (EN)
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", language: "en", category: "sports", country: "UK" },

  // Culture (EN)
  { name: "Guardian Culture", url: "https://www.theguardian.com/culture/rss", language: "en", category: "culture", country: "UK" },

  // French specialized
  { name: "Le Monde Science", url: "https://www.lemonde.fr/sciences/rss_full.xml", language: "fr", category: "science", country: "FR" },
  { name: "Le Monde Sport", url: "https://www.lemonde.fr/sport/rss_full.xml", language: "fr", category: "sports", country: "FR" },
  { name: "Le Monde Santé", url: "https://www.lemonde.fr/sante/rss_full.xml", language: "fr", category: "health", country: "FR" },
  { name: "Le Monde Climat", url: "https://www.lemonde.fr/climat/rss_full.xml", language: "fr", category: "climate", country: "FR" },
  { name: "Sciences et Avenir", url: "https://www.sciencesetavenir.fr/rss.xml", language: "fr", category: "science", country: "FR" },

  // ── Added batch (all curl-verified 200 + valid XML) ──────────────────────
  // Sports (EN)
  { name: "Sky Sports", url: "https://www.skysports.com/rss/12040", language: "en", category: "sports", country: "UK" },
  { name: "BBC Football", url: "https://feeds.bbci.co.uk/sport/football/rss.xml", language: "en", category: "sports", country: "UK" },

  // Science / Tech (EN)
  { name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", language: "en", category: "science", country: "UK" },

  // Health (EN)
  { name: "BBC Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml", language: "en", category: "health", country: "UK" },

  // Business / Economy (EN)
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", language: "en", category: "business", country: "UK" },
  { name: "CNN Business", url: "http://rss.cnn.com/rss/money_news_international.rss", language: "en", category: "business", country: "US" },

  // Wire agency (EN) — via Google News; may be empty when query has no 24h hits
  { name: "AFP (via Google News)", url: "https://news.google.com/rss/search?q=when:24h+allinurl:afp.com", language: "en", category: "world", country: "FR" },

  // French sources
  { name: "franceinfo", url: "https://www.francetvinfo.fr/titres.rss", language: "fr", category: "world", country: "FR" },
  { name: "franceinfo Monde", url: "https://www.francetvinfo.fr/monde.rss", language: "fr", category: "world", country: "FR" },
  { name: "RFI Sport", url: "https://www.rfi.fr/fr/sports/rss", language: "fr", category: "sports", country: "FR" },
  { name: "Le Figaro International", url: "https://www.lefigaro.fr/rss/figaro_international.xml", language: "fr", category: "world", country: "FR" },

  // ── Cron expansion batch (all fetch-verified 200 + valid XML on 2026-06-27) ──
  // Dropped as non-working: ESPN (202 no body), The Athletic / Pitchfork /
  // MedicalNewsToday / Yale e360 (404), NIH newsinhealth (403). Ars Technica,
  // Al Jazeera and Foreign Policy already present above, so their alt feeds
  // were skipped to avoid duplicate sources.

  // Sports (EN)
  { name: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/", language: "en", category: "sports", country: "US" },
  { name: "Yahoo Sports", url: "https://sports.yahoo.com/rss/", language: "en", category: "sports", country: "US" },

  // Culture / Entertainment (EN)
  { name: "BBC Entertainment & Arts", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", language: "en", category: "culture", country: "UK" },
  { name: "NPR Culture", url: "https://feeds.npr.org/1008/rss.xml", language: "en", category: "culture", country: "US" },
  { name: "Variety", url: "https://variety.com/feed/", language: "en", category: "culture", country: "US" },
  { name: "The Hollywood Reporter", url: "https://www.hollywoodreporter.com/feed/", language: "en", category: "culture", country: "US" },
  { name: "Rolling Stone", url: "https://www.rollingstone.com/music/music-news/feed/", language: "en", category: "culture", country: "US" },

  // Health (EN)
  { name: "WHO News", url: "https://www.who.int/rss-feeds/news-english.xml", language: "en", category: "health", country: "CH" },
  { name: "NPR Health", url: "https://feeds.npr.org/1128/rss.xml", language: "en", category: "health", country: "US" },
  { name: "STAT News", url: "https://www.statnews.com/feed/", language: "en", category: "health", country: "US" },

  // Science & Tech (EN)
  { name: "Wired", url: "https://www.wired.com/feed/rss", language: "en", category: "science", country: "US" },
  { name: "Phys.org", url: "https://phys.org/rss-feed/", language: "en", category: "science", country: "US" },
  { name: "New Scientist", url: "https://www.newscientist.com/feed/home/", language: "en", category: "science", country: "UK" },
  { name: "NPR Science", url: "https://feeds.npr.org/1019/rss.xml", language: "en", category: "science", country: "US" },

  // Economy (EN)
  { name: "NPR Business", url: "https://feeds.npr.org/1006/rss.xml", language: "en", category: "economy", country: "US" },
  { name: "MarketWatch", url: "https://www.marketwatch.com/rss/topstories", language: "en", category: "economy", country: "US" },
  { name: "Forbes Business", url: "https://www.forbes.com/business/feed/", language: "en", category: "economy", country: "US" },
  { name: "MarketWatch Realtime", url: "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines", language: "en", category: "economy", country: "US" },

  // Climate (EN)
  { name: "Inside Climate News", url: "https://insideclimatenews.org/feed/", language: "en", category: "climate", country: "US" },
  { name: "Grist", url: "https://grist.org/feed/", language: "en", category: "climate", country: "US" },
  { name: "Carbon Brief", url: "https://www.carbonbrief.org/feed/", language: "en", category: "climate", country: "UK" },

  // Conflicts (EN)
  { name: "The Intercept", url: "https://theintercept.com/feed/?rss", language: "en", category: "conflicts", country: "US" },

  // World — Google News search feeds (high volume, no auth required)
  { name: "Google News — World", url: "https://news.google.com/rss/search?q=world+news&hl=en&gl=US&ceid=US:en", language: "en", category: "world", country: "US" },
  { name: "Google News — International", url: "https://news.google.com/rss/search?q=international+news&hl=en&gl=US&ceid=US:en", language: "en", category: "world", country: "US" },
  { name: "Google News — Breaking (FR)", url: "https://news.google.com/rss/search?q=breaking+news&hl=fr&gl=CA&ceid=CA:fr", language: "fr", category: "world", country: "CA" },
  { name: "Google News — Actualités Monde (FR)", url: "https://news.google.com/rss/search?q=actualités+monde&hl=fr&gl=CA&ceid=CA:fr", language: "fr", category: "world", country: "CA" },

  // ── French & International expansion ──

  // Québec / Canada FR — Google News (replaces 403 direct feeds)
  { name: "Google News — Québec", url: "https://news.google.com/rss/search?q=québec&hl=fr&gl=CA&ceid=CA:fr", language: "fr", category: "world", country: "CA" },
  { name: "Google News — Canada FR", url: "https://news.google.com/rss/search?q=canada+actualités&hl=fr&gl=CA&ceid=CA:fr", language: "fr", category: "world", country: "CA" },
  { name: "Google News — Politique QC", url: "https://news.google.com/rss/search?q=politique+québec+canada&hl=fr&gl=CA&ceid=CA:fr", language: "fr", category: "politics", country: "CA" },
  { name: "Google News — Sports QC", url: "https://news.google.com/rss/search?q=sports+québec+hockey&hl=fr&gl=CA&ceid=CA:fr", language: "fr", category: "sports", country: "CA" },

  // France spécialisé — working direct feeds kept, 403s replaced with Google News
  { name: "Le Monde Politique", url: "https://www.lemonde.fr/politique/rss_full.xml", language: "fr", category: "politics", country: "FR" },
  { name: "Le Monde Économie", url: "https://www.lemonde.fr/economie/rss_full.xml", language: "fr", category: "economy", country: "FR" },
  { name: "Le Monde Culture", url: "https://www.lemonde.fr/culture/rss_full.xml", language: "fr", category: "culture", country: "FR" },
  { name: "Le Figaro Politique", url: "https://www.lefigaro.fr/rss/figaro_politique.xml", language: "fr", category: "politics", country: "FR" },
  { name: "Le Figaro Économie", url: "https://www.lefigaro.fr/rss/figaro_economie.xml", language: "fr", category: "economy", country: "FR" },
  { name: "Le Figaro Sport", url: "https://www.lefigaro.fr/rss/figaro_sport.xml", language: "fr", category: "sports", country: "FR" },
  { name: "Courrier International", url: "https://www.courrierinternational.com/feed/all/rss.xml", language: "fr", category: "world", country: "FR" },
  { name: "France Info Sport", url: "https://www.francetvinfo.fr/sports.rss", language: "fr", category: "sports", country: "FR" },
  { name: "France Info Économie", url: "https://www.francetvinfo.fr/economie.rss", language: "fr", category: "economy", country: "FR" },
  { name: "France Info Santé", url: "https://www.francetvinfo.fr/sante.rss", language: "fr", category: "health", country: "FR" },
  { name: "France Info Science", url: "https://www.francetvinfo.fr/sciences.rss", language: "fr", category: "science", country: "FR" },
  { name: "RFI Économie", url: "https://www.rfi.fr/fr/economie/rss", language: "fr", category: "economy", country: "FR" },
  { name: "Google News — France Politique", url: "https://news.google.com/rss/search?q=politique+france&hl=fr&gl=FR&ceid=FR:fr", language: "fr", category: "politics", country: "FR" },
  { name: "Google News — France Économie", url: "https://news.google.com/rss/search?q=économie+france&hl=fr&gl=FR&ceid=FR:fr", language: "fr", category: "economy", country: "FR" },
  { name: "Google News — France Sport", url: "https://news.google.com/rss/search?q=sport+france&hl=fr&gl=FR&ceid=FR:fr", language: "fr", category: "sports", country: "FR" },
  { name: "Google News — Afrique FR", url: "https://news.google.com/rss/search?q=afrique+actualités&hl=fr&gl=FR&ceid=FR:fr", language: "fr", category: "world", country: "FR" },
];
