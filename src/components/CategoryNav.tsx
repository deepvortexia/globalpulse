"use client";

import { useEffect, useState } from "react";
import type { CategoryId, Language } from "@/types";
import { CATEGORIES, categoryLabel } from "@/lib/categories";

interface CategoryNavProps {
  activeId: CategoryId;
  onChange: (id: CategoryId) => void;
  counts: Record<CategoryId, number>;
  language: Language;
  // Mobile drawer state is owned by the parent (the hamburger lives in the
  // Header), so the drawer is fully controlled here.
  menuOpen: boolean;
  onMenuClose: () => void;
}

const DRAWER_ANIM_MS = 300;

export default function CategoryNav({
  activeId,
  onChange,
  counts,
  language,
  menuOpen,
  onMenuClose,
}: CategoryNavProps) {
  // Keep the active pill in view when it's selected via a route/state change
  // rather than a direct click (e.g. programmatic nav), so it isn't left
  // scrolled out of frame behind the clipped edge.
  useEffect(() => {
    const el = document.querySelector(`[data-category="${activeId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  // ── Mobile drawer: keep mounted through the slide-out animation ────────
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, DRAWER_ANIM_MS);
      return () => clearTimeout(timer);
    }
  }, [menuOpen, mounted]);

  // Lock body scroll while the drawer is mounted.
  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  return (
    <>
      {/* ── TABLET/DESKTOP: horizontal scrollable pill row ──────────────── */}
      <nav
        aria-label="Categories"
        className="hidden border-b border-gv-border bg-gv-bg/60 backdrop-blur-md sm:block"
      >
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div
            className="no-scrollbar relative flex gap-1 overflow-x-auto py-2.5 pr-16"
            style={{ scrollPaddingRight: "64px" }}
          >
            {CATEGORIES.filter((cat) => cat.id !== "fifa").map((cat) => {
              const active = cat.id === activeId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  data-category={cat.id}
                  onClick={() => onChange(cat.id)}
                  aria-pressed={active}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border border-transparent px-3.5 py-1.5 text-xs transition-all ${
                    active
                      ? "bg-gradient-to-r from-[#C9A84C] to-[#E8C96D] font-bold text-black shadow-[0_0_12px_rgba(201,168,76,0.3)]"
                      : "font-medium text-gv-muted hover:text-gv-gold"
                  }`}
                >
                  <span>{categoryLabel(cat, language)}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                      active ? "bg-black/20 text-black" : "bg-white/5 text-gv-muted"
                    }`}
                  >
                    {counts[cat.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right-edge gold fade: signals there are more pills (e.g. Sports)
              to scroll to. Fades content into the background with a gold tint
              to match the nav aesthetic. Sits outside the scroll container so
              it stays pinned, and is pointer-events-none so a partially-faded
              pill stays clickable. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-4 w-20 sm:right-6"
            style={{
              background:
                "linear-gradient(to left, #0a0a0f 0%, rgba(10,10,15,0.85) 45%, rgba(201,168,76,0.12) 75%, transparent 100%)",
            }}
          />
        </div>
      </nav>

      {/* ── MOBILE: slide-in drawer (opened from the Header hamburger) ───── */}
      {mounted && (
        // z-[80] on the wrapper itself matters: position:fixed always creates
        // its own stacking context even with z-index:auto, so without an
        // explicit value here the whole drawer would paint *behind* any
        // sibling with a positive z-index (e.g. the breaking news banner).
        // Must stay above the header's z-[60] so the drawer can fully cover
        // it, including the banner, when open.
        <div className="fixed inset-0 z-[80] sm:hidden">
          {/* Backdrop */}
          <div
            onClick={onMenuClose}
            className={`absolute inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
              closing ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Drawer panel */}
          <div
            className={`absolute left-0 top-0 z-[60] flex h-full w-[280px] max-w-[85%] flex-col border-r border-gv-border bg-gv-bg ${
              closing ? "animate-drawer-slide-out" : "animate-drawer-slide-in"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gv-border px-4 py-4">
              <span className="font-display text-lg font-bold tracking-wider text-white">
                {language === "fr" ? "Catégories" : "Categories"}
              </span>
              <button
                type="button"
                onClick={onMenuClose}
                aria-label="Close categories"
                className="flex h-11 w-11 items-center justify-center text-xl text-gv-muted transition-colors hover:text-white"
              >
                <span aria-hidden>✕</span>
              </button>
            </div>

            <nav aria-label="Categories" className="flex-1 overflow-y-auto py-2">
              {CATEGORIES.filter((cat) => cat.id !== "fifa").map((cat) => {
                const active = cat.id === activeId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onChange(cat.id);
                      onMenuClose();
                    }}
                    aria-pressed={active}
                    className={`flex min-h-[44px] w-full items-center gap-3 border-l-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                      active
                        ? "border-[#C9A84C] bg-gv-gold/10 text-gv-gold"
                        : "border-transparent text-gv-muted hover:text-gv-gold"
                    }`}
                  >
                    <span className="flex-1">{categoryLabel(cat, language)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        active ? "bg-gv-gold/20 text-gv-gold" : "bg-white/5 text-gv-muted"
                      }`}
                    >
                      {counts[cat.id] ?? 0}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
