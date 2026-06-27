"use client";

import Image from "next/image";
import type { Article, Language } from "@/types";
import BreakingNewsFeed from "@/components/BreakingNewsFeed";

interface HeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onMenuClick?: () => void;
  articles: Article[];
  onFifaClick: () => void;
  fifaActive: boolean;
}

const LANGUAGES: Language[] = ["fr", "en"];

export default function Header({
  language,
  onLanguageChange,
  onMenuClick,
  articles,
  onFifaClick,
  fifaActive,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-[60] border-b border-[rgba(201,168,76,0.2)] bg-gv-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Hamburger (mobile only) + logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Open categories"
              className="-ml-1.5 flex h-12 w-12 items-center justify-center rounded-md text-2xl text-gv-gold transition-colors hover:text-gv-gold-light sm:hidden"
            >
              <span aria-hidden>☰</span>
            </button>
          )}
          <Image
            src="/logo.png"
            alt="GlobeVortex logo"
            width={36}
            height={36}
            priority
            style={{ filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.8))' }}
          />
          <span className="font-display text-sm font-bold tracking-tight sm:text-xl sm:tracking-[0.2em]">
            <span className="text-white">GLOBE</span>
            <span className="text-gv-gold"> VORTEX</span>
          </span>
        </div>

        {/* FIFA 2026 quick-access button — always visible */}
        <button
          type="button"
          onClick={onFifaClick}
          aria-pressed={fifaActive}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold transition-colors ${
            fifaActive
              ? "border-gv-gold bg-gv-gold text-gv-bg"
              : "border-[rgba(201,168,76,0.6)] bg-[rgba(201,168,76,0.15)] text-gv-gold hover:bg-[rgba(201,168,76,0.25)]"
          }`}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span aria-hidden>⚽</span>
          <span>FIFA</span>
        </button>

        {/* Live indicator + language toggle */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gv-gold opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gv-gold" />
            </span>
            <span className="hidden text-xs font-semibold tracking-widest text-gv-gold sm:inline">
              LIVE
            </span>
          </div>

          <div className="flex items-center rounded-full border border-gv-border p-0.5">
            {LANGUAGES.map((lang) => {
              const active = lang === language;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange(lang)}
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors sm:px-3 sm:text-xs ${
                    active
                      ? "bg-gv-gold text-gv-bg"
                      : "text-gv-muted hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Breaking news banner — lives here so it scrolls with sticky header */}
      <BreakingNewsFeed articles={articles} language={language} />
    </header>
  );
}
