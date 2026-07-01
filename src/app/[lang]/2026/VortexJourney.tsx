"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { MonthChapter } from "@/lib/highlights";
import type { Language } from "@/types";

// ── Immersive "enter the vortex" scroll journey ──────────────────────────────
// Three depth layers, all driven by a single --gvs (scrollY, unitless px)
// custom property set once per animation frame on the root element:
//   1. Spiral rings (slowest): rotate with scroll, evoking the vortex logo.
//   2. Two particle fields: drift upward at different fractions of scroll
//      speed, so foreground content appears to fly past them.
//   3. Month chapters (normal speed): reveal via IntersectionObserver.
// Everything is CSS transforms on composited layers — no Three.js, no
// scroll-jacking, and prefers-reduced-motion disables all of it (see
// globals.css) while the content stays fully readable.

interface VortexJourneyProps {
  language: Language;
  year: number;
  chapters: MonthChapter[];
}

const COPY: Record<
  Language,
  {
    kicker: string;
    subtitle: string;
    scrollHint: string;
    toBeContinued: string;
    outro: string;
    backHome: string;
    months: string[];
    categories: Record<string, string>;
  }
> = {
  en: {
    kicker: "GlobeVortex presents",
    subtitle: "A journey through the vortex of the year's defining stories, month by month.",
    scrollHint: "Scroll to enter the vortex",
    toBeContinued: "To be continued…",
    outro: "The vortex keeps turning. See you at the end of the year.",
    backHome: "Back to the live news",
    months: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    categories: {
      politics: "Politics", conflict: "Conflict", sports: "Sports",
      tech: "Tech", culture: "Culture", science: "Science",
      crime: "Crime", economy: "Economy", health: "Health",
      disaster: "Disaster",
    },
  },
  fr: {
    kicker: "GlobeVortex présente",
    subtitle: "Un voyage au cœur du vortex des grands événements de l'année, mois par mois.",
    scrollHint: "Défilez pour entrer dans le vortex",
    toBeContinued: "À suivre…",
    outro: "Le vortex continue de tourner. Rendez-vous à la fin de l'année.",
    backHome: "Retour aux nouvelles en direct",
    months: [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ],
    categories: {
      politics: "Politique", conflict: "Conflit", sports: "Sports",
      tech: "Tech", culture: "Culture", science: "Science",
      crime: "Crime", economy: "Économie", health: "Santé",
      disaster: "Catastrophe",
    },
  },
};

// Deterministic pseudo-random in [0, 1) so the particle field is identical on
// server and client (Math.random() would break hydration). Computed once at
// module load.
function prand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Particle {
  left: number;   // vw %
  top: number;    // % of the tall particle sheet
  size: number;   // px
  opacity: number;
  delay: number;  // s, twinkle offset
}

// Quantize to 4 decimals so the SSR HTML and the client render serialize the
// exact same style strings (full-precision floats hydration-mismatch).
const q = (x: number) => Math.round(x * 1e4) / 1e4;

function makeParticles(count: number, salt: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    left: q(prand(i, salt) * 100),
    top: q(prand(i, salt + 1) * 100),
    size: q(1 + prand(i, salt + 2) * (salt === 1 ? 2 : 3.5)),
    opacity: q(0.25 + prand(i, salt + 3) * 0.55),
    delay: q(prand(i, salt + 4) * 6),
  }));
}

const FAR_PARTICLES = makeParticles(56, 1);
const NEAR_PARTICLES = makeParticles(28, 7);

// event_date is a plain DATE ("2026-01-03"); format it in UTC so it never
// shifts a day in the viewer's timezone.
function formatEventDate(eventDate: string, language: Language): string {
  const [y, m, d] = eventDate.split("-").map(Number);
  return new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export default function VortexJourney({ language, year, chapters }: VortexJourneyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const t = COPY[language];

  // Scroll → --gvs custom property, rAF-throttled. All parallax transforms
  // hang off this one property in CSS, so React never re-renders on scroll.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        root.style.setProperty("--gvs", String(window.scrollY));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Chapter reveal: same IntersectionObserver pattern as NewsGrid's gv-reveal,
  // with its own class pair so the two effects stay independently tunable.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll(".gv-cr");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("gv-cr-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("gv-cr-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="gv-vortex-root relative">
      {/* Fixed background: spiral + glow + two particle depth layers. */}
      <div className="gv-vortex-bg" aria-hidden>
        <div className="gv-vortex-glow" />
        <div className="gv-vortex-spiral" />
        <div className="gv-vortex-spiral gv-vortex-spiral--reverse" />
        <div className="gv-particles gv-particles--far">
          {FAR_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="gv-particle"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
        <div className="gv-particles gv-particles--near">
          {NEAR_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="gv-particle"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Minimal top bar: back to the news + locale switch for this page. */}
      <nav className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href={`/${language}`}
          className="rounded-full border border-gv-border bg-gv-bg/70 px-3 py-1.5 text-xs font-semibold tracking-wider text-gv-muted backdrop-blur-md transition-colors hover:text-gv-gold"
        >
          ← GLOBE<span className="text-gv-gold">VORTEX</span>
        </Link>
        <div className="flex items-center rounded-full border border-gv-border bg-gv-bg/70 p-0.5 backdrop-blur-md">
          {(["fr", "en"] as const).map((lang) => (
            <Link
              key={lang}
              href={`/${lang}/2026`}
              hrefLang={lang}
              aria-current={lang === language ? "true" : undefined}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors ${
                lang === language ? "bg-gv-gold text-gv-bg" : "text-gv-muted hover:text-white"
              }`}
            >
              {lang}
            </Link>
          ))}
        </div>
      </nav>

      {/* Hero: the mouth of the vortex. */}
      <section className="relative z-10 flex min-h-svh flex-col items-center justify-center px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gv-muted">
          {t.kicker}
        </p>
        <h1 className="gv-year-title font-display mt-4 font-bold text-gv-gold">
          {year}
        </h1>
        <p className="mt-6 max-w-md text-base text-gv-muted sm:text-lg">{t.subtitle}</p>
        <div className="gv-scroll-hint mt-16 flex flex-col items-center gap-2 text-gv-gold">
          <span className="text-xs uppercase tracking-[0.25em]">{t.scrollHint}</span>
          <span aria-hidden className="text-2xl">↓</span>
        </div>
      </section>

      {/* One chapter per month, January → December. */}
      {chapters.map(({ month, highlights }) => (
        <section
          key={month}
          className="relative z-10 mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28"
          aria-label={`${t.months[month - 1]} ${year}`}
        >
          <header className="gv-cr flex items-baseline gap-4">
            <span
              aria-hidden
              className="font-mono text-sm tracking-[0.3em] text-gv-muted"
            >
              {String(month).padStart(2, "0")}
            </span>
            <h2 className="font-display text-5xl font-bold text-gv-gold sm:text-7xl">
              {t.months[month - 1]}
            </h2>
          </header>

          {highlights.length > 0 ? (
            <ol className="relative mt-10 space-y-6 border-l border-gv-gold/25 pl-6 sm:mt-14 sm:space-y-8 sm:pl-10">
              {highlights.map((h, idx) => (
                <li
                  key={h.id}
                  className="gv-cr relative"
                  style={{ transitionDelay: `${Math.min(idx, 5) * 90}ms` }}
                >
                  {/* Timeline node */}
                  <span
                    aria-hidden
                    className="absolute -left-6 top-6 h-2 w-2 -translate-x-1/2 rounded-full bg-gv-gold shadow-[0_0_8px_rgba(201,168,76,0.9)] sm:-left-10"
                  />
                  <article className="rounded-xl border border-gv-border bg-gv-card/60 p-5 backdrop-blur-sm transition-colors hover:border-gv-gold/50 sm:p-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wider">
                      <span className="rounded-full border border-gv-gold/40 bg-gv-gold/10 px-2.5 py-0.5 text-gv-gold">
                        {t.categories[h.category] ?? h.category}
                      </span>
                      <time dateTime={h.eventDate} className="text-gv-muted">
                        {formatEventDate(h.eventDate, language)}
                      </time>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold leading-snug text-white sm:text-xl">
                      {h.headline}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gv-muted">
                      {h.description}
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <p className="gv-cr mt-10 border-l border-gv-border pl-6 font-display text-xl italic text-gv-muted sm:mt-14 sm:pl-10">
              {t.toBeContinued}
            </p>
          )}
        </section>
      ))}

      {/* Outro: exit of the vortex. */}
      <section className="relative z-10 flex flex-col items-center gap-8 px-4 py-32 text-center">
        <p className="gv-cr max-w-md font-display text-2xl italic text-gv-gold sm:text-3xl">
          {t.outro}
        </p>
        <Link
          href={`/${language}`}
          className="gv-cr rounded-full border border-gv-gold/60 bg-gv-gold/10 px-6 py-2.5 text-sm font-semibold text-gv-gold transition-colors hover:bg-gv-gold hover:text-gv-bg"
        >
          {t.backHome}
        </Link>
      </section>
    </div>
  );
}
