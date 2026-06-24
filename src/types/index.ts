export type Language = "en" | "fr";

export type CategoryId =
  | "all"
  | "world"
  | "politics"
  | "economy"
  | "science"
  | "climate"
  | "conflicts"
  | "health"
  | "culture"
  | "sports";

export interface RSSSource {
  name: string;
  url: string;
  language: Language;
  category: string;
  country: string;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  language: Language;
  category: Exclude<CategoryId, "all">;
  country: string;
  publishedAt: string;
  imageUrl: string | null;
}

export interface Summary {
  summaryEn: string;
  summaryFr: string;
  category: string;
  tags: string[];
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
