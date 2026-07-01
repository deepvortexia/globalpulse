import Image from "next/image";
import Link from "next/link";
import type { Language } from "@/types";
import Footer from "@/components/Footer";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalCopy {
  back: string;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

// Shared layout for the Privacy / Terms pages. Server-rendered for a single
// locale (the FR/EN toggle is gone — each locale is its own URL now). `copy` is
// the already-selected locale's text; `path` ("privacy" | "terms") builds the
// locale-switch link to the same doc in the other language.
export default function LegalDoc({
  copy,
  language,
  path,
}: {
  copy: LegalCopy;
  language: Language;
  path: "privacy" | "terms";
}) {
  const t = copy;
  const other: Language = language === "fr" ? "en" : "fr";

  return (
    <div className="flex min-h-screen flex-col text-white">
      <header className="sticky top-0 z-[60] border-b border-[rgba(201,168,76,0.2)] bg-gv-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href={`/${language}`} className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="GlobeVortex logo"
              width={36}
              height={36}
              priority
              style={{ filter: "drop-shadow(0 0 8px rgba(201,168,76,0.8))" }}
            />
            <span className="font-display text-sm font-bold tracking-tight sm:text-xl sm:tracking-[0.2em]">
              <span className="text-white">GLOBE</span>
              <span className="text-gv-gold"> VORTEX</span>
            </span>
          </Link>

          {/* Locale switch link (replaces the old client-side toggle). */}
          <Link
            href={`/${other}/${path}`}
            hrefLang={other}
            aria-label={other === "fr" ? "Voir en français" : "View in English"}
            className="rounded-full border border-gv-border px-3 py-1 text-[11px] font-semibold uppercase text-gv-muted transition-colors hover:text-white sm:text-xs"
          >
            {other}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-10 sm:px-6">
        <Link
          href={`/${language}`}
          className="text-sm text-gv-muted transition-colors hover:text-gv-gold"
        >
          {t.back}
        </Link>

        <h1 className="mt-10 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {t.title}
        </h1>
        <p className="mt-3 text-sm text-gv-muted">{t.lastUpdated}</p>
        <span className="mt-6 block h-0.5 w-24 rounded-full bg-gradient-to-r from-gv-gold to-transparent" />

        <div className="mt-10 space-y-10">
          {t.sections.map((section, i) => (
            <section key={i}>
              <h2 className="font-display text-xl font-bold text-gv-gold">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph, j) => (
                <p
                  key={j}
                  className="mt-3 text-base leading-relaxed text-gv-muted"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-gv-muted">
                  {section.bullets.map((bullet, j) => (
                    <li key={j}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>

      <Footer language={language} />
    </div>
  );
}
