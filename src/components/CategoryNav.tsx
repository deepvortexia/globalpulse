"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  const scrollRowRef = useRef<HTMLDivElement>(null);

  // Keep the active pill in view when it's selected via a route/state change
  // rather than a direct click (e.g. programmatic nav), so it isn't left
  // scrolled out of frame behind the clipped edge.
  useEffect(() => {
    if (activeId === "top") {
      // First pill — always reset to the leftmost position so it's never
      // partially clipped by the scroll container's left edge.
      scrollRowRef.current?.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const el = document.querySelector(`[data-category="${activeId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
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
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 flex justify-center">
          <div
            ref={scrollRowRef}
            className="no-scrollbar relative flex items-center justify-center gap-1 overflow-x-auto py-2.5 px-2"
          >
            {CATEGORIES.filter((cat) => cat.id !== "fifa").map((cat) => {
              const active = cat.id === activeId;
              // Top Stories is a virtual bucket with its own red treatment and
              // no count badge; it stays first and is never filtered out.
              const isTop = cat.id === "top";
              return (
                <button
                  key={cat.id}
                  type="button"
                  data-category={cat.id}
                  onClick={() => onChange(cat.id)}
                  aria-pressed={active}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs transition-all ${
                    isTop
                      ? `bg-[#DC2626] font-bold text-white hover:bg-[#b91c1c] ${
                          active ? "shadow-[0_0_12px_rgba(220,38,38,0.5)] ring-2 ring-white/40" : ""
                        }`
                      : active
                        ? "bg-gradient-to-r from-[#C9A84C] to-[#E8C96D] font-bold text-black shadow-[0_0_12px_rgba(201,168,76,0.3)]"
                        : "font-medium text-gv-muted hover:text-gv-gold"
                  }`}
                >
                  <span>{categoryLabel(cat, language)}</span>
                  {!isTop && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        active ? "bg-black/20 text-black" : "bg-white/5 text-gv-muted"
                      }`}
                    >
                      {counts[cat.id] ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

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
              {/* 2026 Year in Review — signature feature page, placed first */}
              <Link
                href={`/${language}/2026`}
                onClick={onMenuClose}
                className="animate-gv-2026-pulse flex min-h-[44px] w-full items-center gap-3 border-l-2 border-[#C9A84C] bg-gradient-to-r from-[#C9A84C]/20 to-[#E8C96D]/10 px-4 py-3 text-left text-sm font-bold text-gv-gold transition-colors hover:from-[#C9A84C]/30 hover:to-[#E8C96D]/20"
              >
                <svg
                  aria-hidden
                  className="h-3 w-3 flex-shrink-0 text-gv-gold"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2c.6 3.4 1.7 5.9 3.3 7.5S19 12 22 12c-3 0-5.1.9-6.7 2.5S12.6 18.6 12 22c-.6-3.4-1.7-5.9-3.3-7.5S5 12 2 12c3 0 5.1-.9 6.7-2.5S11.4 5.4 12 2Z" />
                </svg>
                <span className="flex-1">
                  {language === "fr" ? "2026 en 3D" : "2026 in 3D"}
                </span>
              </Link>

              {CATEGORIES.filter((cat) => cat.id !== "fifa").map((cat) => {
                const active = cat.id === activeId;
                // Top Stories: first row, red styling, no count badge.
                const isTop = cat.id === "top";
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
                      isTop
                        ? active
                          ? "border-[#DC2626] bg-[#DC2626] font-bold text-white"
                          : "border-[#DC2626] bg-[#DC2626]/10 font-bold text-[#DC2626] hover:bg-[#DC2626]/20"
                        : active
                          ? "border-[#C9A84C] bg-gv-gold/10 text-gv-gold"
                          : "border-transparent text-gv-muted hover:text-gv-gold"
                    }`}
                  >
                    <span className="flex-1">{categoryLabel(cat, language)}</span>
                    {!isTop && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                          active ? "bg-gv-gold/20 text-gv-gold" : "bg-white/5 text-gv-muted"
                        }`}
                      >
                        {counts[cat.id] ?? 0}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* FIFA 2026 — mobile drawer only; hidden from desktop pills */}
              <button
                type="button"
                onClick={() => {
                  onChange("fifa");
                  onMenuClose();
                }}
                aria-pressed={activeId === "fifa"}
                className="flex min-h-[44px] w-full items-center gap-3 border-l-2 border-[#DC2626] bg-[#DC2626]/10 px-4 py-3 text-left text-sm font-bold text-[#DC2626] transition-colors hover:bg-[#DC2626]/20"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-[#DC2626] animate-pulse" />
                <span className="flex-1">⚽ FIFA 2026</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
