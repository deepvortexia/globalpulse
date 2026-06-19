"use client";

import Image from "next/image";
import type { Language } from "@/types";

interface HeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

const LANGUAGES: Language[] = ["fr", "en"];

export default function Header({ language, onLanguageChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gv-border bg-gv-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/web-app-manifest-512x512.png"
            alt="GlobeVortex logo"
            width={32}
            height={32}
            priority
            className="rounded-md"
          />
          <span className="font-display text-xl font-bold tracking-[0.2em]">
            <span className="text-white">GLOBE</span>
            <span className="text-gv-gold">VORTEX</span>
          </span>
        </div>

        {/* Live indicator + language toggle */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gv-gold opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gv-gold" />
            </span>
            <span className="text-xs font-semibold tracking-widest text-gv-gold">LIVE</span>
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
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors ${
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
