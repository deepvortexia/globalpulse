import type { CategoryId } from "@/types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  labelFr: string;
  labelZh: string;
  emoji: string;
}

// Single source of truth for the category navigation. `all` is a virtual
// bucket (no article ever carries it); every other id is a real Article
// category produced by the rss-fetcher's category mapping.
export const CATEGORIES: CategoryMeta[] = [
  { id: "all", label: "All", labelFr: "Tout", labelZh: "全部", emoji: "🌐" },
  { id: "world", label: "World", labelFr: "Monde", labelZh: "世界", emoji: "🌍" },
  { id: "politics", label: "Politics", labelFr: "Politique", labelZh: "政治", emoji: "🏛️" },
  { id: "economy", label: "Economy", labelFr: "Économie", labelZh: "经济", emoji: "💰" },
  { id: "science", label: "Science & Tech", labelFr: "Sciences & Tech", labelZh: "科技", emoji: "🔬" },
  { id: "climate", label: "Climate", labelFr: "Climat", labelZh: "气候", emoji: "🌱" },
  { id: "conflicts", label: "Conflicts", labelFr: "Conflits", labelZh: "冲突", emoji: "⚔️" },
  { id: "health", label: "Health", labelFr: "Santé", labelZh: "健康", emoji: "🏥" },
  { id: "culture", label: "Culture", labelFr: "Culture", labelZh: "文化", emoji: "🎭" },
  { id: "sports", label: "Sports", labelFr: "Sports", labelZh: "体育", emoji: "⚽" },
  { id: "fifa", label: "FIFA 2026", labelFr: "FIFA 2026", labelZh: "世界杯 2026", emoji: "⚽" },
];

// Real (non-virtual) article categories.
export const ARTICLE_CATEGORY_IDS = CATEGORIES.map((c) => c.id).filter(
  (id): id is Exclude<CategoryId, "all"> => id !== "all",
);

// Accepts either a CategoryMeta (from the nav) or a bare category id (from a
// card). Unknown ids fall back to the raw string.
export function categoryLabel(
  category: CategoryMeta | CategoryId,
  language: "en" | "fr",
): string {
  const meta =
    typeof category === "string"
      ? CATEGORIES.find((c) => c.id === category)
      : category;
  if (!meta) return category as string;
  return language === "fr" ? meta.labelFr : meta.label;
}
