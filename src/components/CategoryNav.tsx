"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoryId, Language } from "@/types";
import { CATEGORIES, categoryLabel } from "@/lib/categories";

interface CategoryNavProps {
  activeId: CategoryId;
  onChange: (id: CategoryId) => void;
  counts: Record<CategoryId, number>;
  language: Language;
}

const DRAWER_ANIM_MS = 300;

export default function CategoryNav({ activeId, onChange, counts, language }: CategoryNavProps) {
  // ── Desktop: measured sliding underline ────────────────────────────────
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

  // ── Mobile: drawer open/close with exit animation ──────────────────────
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  function closeDrawer() {
    setClosing(true);
  }

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, DRAWER_ANIM_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  // Lock body scroll while the drawer is mounted.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* ── DESKTOP: horizontal scrollable pill row ─────────────────────── */}
      <nav
        aria-label="Categories"
        className="hidden border-b border-gv-border bg-gv-bg/60 backdrop-blur-md md:block"
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

      {/* ── MOBILE/TABLET: burger button ────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open categories"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gv-gold text-2xl text-gv-bg shadow-lg shadow-black/40 transition-transform active:scale-95 md:hidden"
      >
        <span aria-hidden>☰</span>
      </button>

      {/* ── MOBILE/TABLET: slide-in drawer ──────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
              closing ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Drawer panel */}
          <div
            className={`absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-r border-gv-border bg-gv-bg ${
              closing ? "animate-drawer-slide-out" : "animate-drawer-slide-in"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gv-border px-4 py-4">
              <span className="font-display text-lg font-bold tracking-wider text-white">
                {language === "fr" ? "Catégories" : "Categories"}
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close categories"
                className="text-xl text-gv-muted transition-colors hover:text-white"
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
                      closeDrawer();
                    }}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
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
