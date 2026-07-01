"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Language } from "@/types";
import Footer from "@/components/Footer";

const LANGUAGES: Language[] = ["fr", "en"];

interface Section {
  heading: string;
  body: string[];
}

interface Step {
  title: string;
  text: string;
}

interface HowSection {
  heading: string;
  steps: Step[];
  attribution: string;
}

interface Tech {
  name: string;
  detail: string;
}

interface Copy {
  back: string;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  mission: Section;
  how: HowSection;
  techTitle: string;
  tech: Tech[];
  creator: Section;
  correction: {
    before: string;
    after: string;
  };
  ctaHeading: string;
  cta: string;
  lastReviewedPrefix: string;
}

const COPY: Record<Language, Copy> = {
  en: {
    back: "← Back to news",
    hero: {
      eyebrow: "World News AI Aggregator",
      title: "The World's News, Distilled by AI",
      subtitle:
        "GlobeVortex is a bilingual FR/EN AI-powered international news aggregator — drawing from 50+ trusted sources worldwide, summarized and scored by Claude AI.",
    },
    mission: {
      heading: "Our Mission",
      body: [
        "The world produces more news than any person could ever read. GlobeVortex exists to cut through that noise: a single, calm place where the day's most important international stories are gathered, organized, and summarized — in both English and French.",
        "We believe staying informed shouldn't mean drowning in tabs or paywalls. Our AI reads the world's headlines so you can grasp what matters in minutes, in the language you think in.",
      ],
    },
    how: {
      heading: "How It Works",
      steps: [
        {
          title: "Continuous collection",
          text: "Every 15 minutes, our automated pipeline pulls fresh headlines from 50+ RSS feeds spanning major outlets across every continent — from world affairs and geopolitics to economy, science, climate, health, culture and sports.",
        },
        {
          title: "AI processing by Claude",
          text: "Each story is sent to Claude Haiku, Anthropic's fast and efficient AI model. In a single API call, Claude classifies the article into one of 9 categories, writes a concise 2-sentence summary in the article's own language (French or English), and assigns a global importance score from 0 to 100.",
        },
        {
          title: "Importance scoring",
          text: "The scoring scale: 90–100 for global breaking news (wars, major crises, world leader events), 75–89 for major national politics or economy, 50–74 for notable regional or science stories, and 0–49 for routine local news. Only the highest-scored articles surface in the Top Stories section.",
        },
        {
          title: "Instant delivery",
          text: "Processed articles are stored and served instantly to the GlobeVortex interface — no timeouts, no delays. The feed refreshes continuously so the page always reflects the last 7 days of world news.",
        },
      ],
      attribution:
        "Every article links directly back to its original source. GlobeVortex doesn't claim authorship of the reporting — we collect, translate, and summarize it, and always credit the outlet that broke the story.",
    },
    techTitle: "Technologies",
    tech: [
      {
        name: "Next.js 16",
        detail:
          "Server-rendered React with the App Router for instant, SEO-friendly pages and real-time revalidation.",
      },
      {
        name: "Claude Haiku — Anthropic",
        detail:
          "The AI model that classifies, summarizes and scores every story in one single API call — fast, cost-efficient, and neutral.",
      },
      {
        name: "50+ RSS Sources",
        detail:
          "Trusted international outlets aggregated live from every continent — including Le Monde, BBC, CNN, Al Jazeera, Radio-Canada, RFI, La Presse and many more.",
      },
      {
        name: "Vercel",
        detail:
          "Edge deployment for global low-latency delivery, with automated builds on every code push.",
      },
      {
        name: "GitHub Actions",
        detail:
          "Our news pipeline runs as a scheduled cron job every 15 minutes — independent of Vercel's serverless limits.",
      },
    ],
    creator: {
      heading: "The Creator",
      body: [
        "GlobeVortex is created by Yannick Boisclair, an independent developer based in Quebec, Canada, under the DeepVortex brand — a studio building AI-first products that make information faster and clearer for everyone.",
        "It is one expression of a simple idea: that artificial intelligence, used thoughtfully, can give anyone a clearer window on the world — regardless of language or location.",
      ],
    },
    correction: {
      before: "Spotted an error in a summary or category? Let us know at ",
      after: " — corrections are typically applied within hours.",
    },
    ctaHeading: "Ready to explore the world's news?",
    cta: "Enter GlobeVortex",
    lastReviewedPrefix: "Page last reviewed:",
  },
  fr: {
    back: "← Retour aux actualités",
    hero: {
      eyebrow: "Agrégateur de nouvelles IA",
      title: "L'actualité mondiale, distillée par l'IA",
      subtitle:
        "GlobeVortex est un agrégateur de nouvelles international bilingue FR/EN propulsé par l'IA — puisant dans plus de 50 sources mondiales de confiance, résumées et scorées par Claude AI.",
    },
    mission: {
      heading: "Notre mission",
      body: [
        "Le monde produit plus de nouvelles que n'importe quelle personne ne pourrait jamais lire. GlobeVortex existe pour traverser ce bruit : un endroit calme et unique où les histoires internationales les plus importantes de la journée sont rassemblées, organisées et résumées — en français et en anglais.",
        "Nous croyons que rester informé ne devrait pas signifier se noyer dans des onglets ou des paywalls. Notre IA lit les manchettes mondiales pour que vous puissiez saisir l'essentiel en quelques minutes, dans la langue dans laquelle vous pensez.",
      ],
    },
    how: {
      heading: "Comment ça fonctionne",
      steps: [
        {
          title: "Collecte continue",
          text: "Toutes les 15 minutes, notre pipeline automatisé récupère les dernières manchettes de 50+ flux RSS couvrant les grands médias de chaque continent — des affaires mondiales et de la géopolitique à l'économie, la science, le climat, la santé, la culture et les sports.",
        },
        {
          title: "Traitement par Claude AI",
          text: "Chaque article est envoyé à Claude Haiku, le modèle IA rapide et efficace d'Anthropic. En un seul appel API, Claude classifie l'article dans l'une des 9 catégories, rédige un résumé concis en 2 phrases dans la langue de l'article (français ou anglais), et attribue un score d'importance mondiale de 0 à 100.",
        },
        {
          title: "Score d'importance",
          text: "L'échelle de scoring : 90–100 pour les breaking news mondiaux (guerres, crises majeures, événements de chefs d'État), 75–89 pour la politique nationale majeure ou l'économie, 50–74 pour les actualités régionales ou scientifiques notables, et 0–49 pour les nouvelles locales routinières. Seuls les articles avec les scores les plus élevés apparaissent dans la section À la une.",
        },
        {
          title: "Livraison instantanée",
          text: "Les articles traités sont stockés et servis instantanément à l'interface GlobeVortex — sans timeout, sans délai. Le flux se rafraîchit en continu pour que la page reflète toujours les 7 derniers jours de l'actualité mondiale.",
        },
      ],
      attribution:
        "Chaque article renvoie directement vers sa source originale. GlobeVortex ne revendique pas la paternité du reportage — nous le rassemblons, le traduisons et le résumons, en créditant toujours le média qui a publié l'histoire en premier.",
    },
    techTitle: "Technologies",
    tech: [
      {
        name: "Next.js 16",
        detail:
          "React rendu côté serveur avec l'App Router pour des pages instantanées, optimisées SEO et avec revalidation en temps réel.",
      },
      {
        name: "Claude Haiku — Anthropic",
        detail:
          "Le modèle IA qui classifie, résume et score chaque article en un seul appel API — rapide, économique et neutre.",
      },
      {
        name: "50+ sources RSS",
        detail:
          "Médias internationaux de confiance agrégés en direct de chaque continent — dont Le Monde, BBC, CNN, Al Jazeera, Radio-Canada, RFI, La Presse et bien d'autres.",
      },
      {
        name: "Vercel",
        detail:
          "Déploiement sur l'edge pour une livraison mondiale à faible latence, avec builds automatiques à chaque mise à jour du code.",
      },
      {
        name: "GitHub Actions",
        detail:
          "Notre pipeline d'actualités s'exécute comme un cron job toutes les 15 minutes — indépendamment des limites serverless de Vercel.",
      },
    ],
    creator: {
      heading: "Le créateur",
      body: [
        "GlobeVortex est créé par Yannick Boisclair, développeur indépendant basé au Québec, Canada, sous la marque DeepVortex — un studio qui conçoit des produits axés sur l'IA pour rendre l'information plus rapide et plus claire pour tous.",
        "C'est l'expression d'une idée simple : utilisée avec discernement, l'intelligence artificielle peut offrir à quiconque une fenêtre plus claire sur le monde — peu importe la langue ou l'endroit.",
      ],
    },
    correction: {
      before: "Vous avez repéré une erreur dans un résumé ou une catégorie ? Écrivez-nous à ",
      after: " — les corrections sont généralement appliquées en quelques heures.",
    },
    ctaHeading: "Prêt à explorer l'actualité mondiale ?",
    cta: "Entrer dans GlobeVortex",
    lastReviewedPrefix: "Page révisée le :",
  },
};

export default function AboutContent() {
  const [language, setLanguage] = useState<Language>("en");
  const t = COPY[language];

  return (
    <div className="flex min-h-screen flex-col text-white">
      {/* Lightweight header: logo + back link + language toggle */}
      <header className="sticky top-0 z-[60] border-b border-[rgba(201,168,76,0.2)] bg-gv-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
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

          <div className="flex items-center rounded-full border border-gv-border p-0.5">
            {LANGUAGES.map((lang) => {
              const active = lang === language;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors sm:px-3 sm:text-xs ${
                    active ? "bg-gv-gold text-gv-bg" : "text-gv-muted hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-10 sm:px-6">
        <Link
          href="/"
          className="text-sm text-gv-muted transition-colors hover:text-gv-gold"
        >
          {t.back}
        </Link>

        {/* Hero */}
        <section className="mt-10 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="GlobeVortex logo"
            width={96}
            height={96}
            priority
            style={{ filter: "drop-shadow(0 0 16px rgba(201,168,76,0.8))" }}
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-gv-gold">
            {t.hero.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {t.hero.title}
          </h1>
          <span className="mt-6 block h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-gv-gold to-transparent" />
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-gv-muted sm:text-lg">
            {t.hero.subtitle}
          </p>
        </section>

        {/* Mission */}
        <Prose section={t.mission} className="mt-20" />

        {/* How it works */}
        <HowItWorksSection section={t.how} className="mt-16" />

        {/* Technologies */}
        <section className="mt-16">
          <SectionHeading>{t.techTitle}</SectionHeading>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.tech.map((tech) => (
              <div
                key={tech.name}
                className="rounded-2xl border border-gv-border bg-gv-card/60 p-6 transition-colors hover:border-gv-gold/50"
              >
                <h3 className="font-display text-lg font-bold text-gv-gold">{tech.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gv-muted">{tech.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Creator */}
        <Prose section={t.creator} className="mt-16" />

        {/* Correction / feedback */}
        <p className="mt-16 text-center text-sm leading-relaxed text-gv-muted">
          {t.correction.before}
          <a
            href="mailto:admin@globevortex.com"
            className="text-gv-gold transition-colors hover:text-gv-gold-light"
          >
            admin@globevortex.com
          </a>
          {t.correction.after}
        </p>

        {/* CTA back home */}
        <section className="mt-12 flex flex-col items-center text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            {t.ctaHeading}
          </h2>
          <Link
            href="/"
            className="mt-8 inline-flex items-center rounded-full bg-gv-gold px-8 py-3 text-sm font-bold uppercase tracking-wider text-gv-bg shadow-[0_0_24px_rgba(201,168,76,0.35)] transition-colors hover:bg-gv-gold-light"
          >
            {t.cta}
          </Link>
        </section>

        {/* Last reviewed */}
        <p className="mt-16 text-center text-xs opacity-50">
          {t.lastReviewedPrefix}{" "}
          {new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-US", {
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </p>
      </main>

      <Footer language={language} />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {children}
      </h2>
      <span className="mt-3 block h-0.5 w-20 rounded-full bg-gradient-to-r from-gv-gold to-transparent" />
    </div>
  );
}

function Prose({ section, className }: { section: Section; className?: string }) {
  return (
    <section className={className}>
      <SectionHeading>{section.heading}</SectionHeading>
      <div className="mt-6 space-y-4">
        {section.body.map((paragraph, i) => (
          <p key={i} className="text-base leading-relaxed text-gv-muted">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection({ section, className }: { section: HowSection; className?: string }) {
  return (
    <section className={className}>
      <SectionHeading>{section.heading}</SectionHeading>
      <ol className="mt-8 space-y-6">
        {section.steps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gv-gold/40 bg-gv-gold/10 text-xs font-bold text-gv-gold">
              {i + 1}
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-1 text-base leading-relaxed text-gv-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-gv-muted">{section.attribution}</p>
    </section>
  );
}
