export type Language = "en" | "fr";

export type CategoryId =
  | "top"
  | "all"
  | "world"
  | "politics"
  | "economy"
  | "science"
  | "climate"
  | "conflicts"
  | "health"
  | "culture"
  | "sports"
  | "fifa";

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
  category: Exclude<CategoryId, "all" | "top">;
  country: string;
  publishedAt: string;
  imageUrl: string | null;
  // True when importance_score >= 75 and article age <= 2h at ingestion time.
  isBreaking?: boolean;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
