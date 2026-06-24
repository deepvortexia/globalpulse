"use client";

import Image from "next/image";
import type { Language } from "@/types";

interface HeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onMenuClick?: () => void;
}

const LANGUAGES: Language[] = ["fr", "en"];

export default function Header({ language, onLanguageChange, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[70] border-b border-[rgba(201,168,76,0.2)] bg-gv-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Hamburger (mobile only) + logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Open categories"
              className="-ml-1.5 flex h-11 w-11 items-center justify-center rounded-md text-xl text-gv-gold transition-colors hover:text-gv-gold-light sm:hidden"
            >
              <span aria-hidden>☰</span>
            </button>
          )}
          <Image
            src="/web-app-manifest-512x512.png"
            alt="GlobeVortex logo"
            width={32}
            height={32}
            priority
            className="rounded-md"
          />
          <span className="font-display text-sm font-bold tracking-tight sm:text-xl sm:tracking-[0.2em]">
            <span className="text-white">GLOBE</span>
            <span className="text-gv-gold">VORTEX</span>
          </span>
        </div>

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
    </header>
  );
}
