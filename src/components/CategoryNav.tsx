"use client";

import { useEffect, useRef, useState } from "react";
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
  // ── Tablet/desktop: measured sliding underline ─────────────────────────
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  useEffect(() => {
    function measure() {
      const btn = btnRefs.current[activeId];
      if (btn) setUnderline({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeId, language]);

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="no-scrollbar relative flex gap-1 overflow-x-auto py-2.5">
            {CATEGORIES.map((cat) => {
              const active = cat.id === activeId;
              return (
                <button
                  key={cat.id}
                  ref={(el) => {
                    btnRefs.current[cat.id] = el;
                  }}
                  type="button"
                  onClick={() => onChange(cat.id)}
                  aria-pressed={active}
                  className={`relative flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-gv-gold text-gv-gold"
                      : "border-transparent text-gv-muted hover:text-white"
                  }`}
                >
                  <span aria-hidden>{cat.emoji}</span>
                  <span>{categoryLabel(cat, language)}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                      active ? "bg-gv-gold/20 text-gv-gold" : "bg-white/5 text-gv-muted"
                    }`}
                  >
                    {counts[cat.id] ?? 0}
                  </span>
                </button>
              );
            })}
            {/* Sliding active-underline; left/width animate via CSS transition. */}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-gv-gold transition-all duration-300 ease-out"
              style={{ left: underline.left, width: underline.width }}
            />
          </div>
        </div>
      </nav>

      {/* ── MOBILE: slide-in drawer (opened from the Header hamburger) ───── */}
      {mounted && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          {/* Backdrop */}
          <div
            onClick={onMenuClose}
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
              closing ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Drawer panel */}
          <div
            className={`absolute left-0 top-0 flex h-full w-[280px] max-w-[85%] flex-col border-r border-gv-border bg-gv-bg ${
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
              {CATEGORIES.map((cat) => {
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
                    className={`flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                      active
                        ? "bg-gv-gold/10 text-gv-gold"
                        : "text-gv-muted hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-lg" aria-hidden>
                      {cat.emoji}
                    </span>
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
