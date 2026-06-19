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
];
