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
];
