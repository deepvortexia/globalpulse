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
  how: Section;
  techTitle: string;
  tech: Tech[];
  creator: Section;
  ctaHeading: string;
  cta: string;
}

// Full page copy in both languages. SEO keywords are woven into the prose
// naturally rather than stuffed: "world news aggregator", "AI news",
// "bilingual news FR EN", "actualités mondiales", "agrégateur nouvelles IA",
// "international news powered by AI".
const COPY: Record<Language, Copy> = {
  en: {
    back: "← Back to news",
    hero: {
      eyebrow: "World News AI Aggregator",
      title: "Where the World's News Spirals In",
      subtitle:
        "GlobeVortex is a bilingual FR/EN, AI-powered world news aggregator — international news powered by AI, drawn from 50+ trusted sources worldwide and distilled by Claude.",
    },
    mission: {
      heading: "Our Mission",
      body: [
        "The world produces more news than any person could ever read. GlobeVortex exists to cut through that noise: a single, calm place where the day's most important international news is gathered, organized, and summarized — in both English and French.",
        "We believe staying informed shouldn't mean drowning in tabs or paywalls. Our AI news engine reads the world's headlines so you can grasp what matters in minutes, whether you think in English or in French.",
      ],
    },
    how: {
      heading: "How It Works",
      body: [
        "GlobeVortex continuously pulls live headlines from 50+ RSS feeds spanning major outlets across every continent — from world affairs and politics to economy, science, climate, health, culture and sports.",
        "Each story is then processed by Anthropic's Claude AI, which writes concise, neutral summaries in both English and French. The result is a fast, bilingual news aggregator that respects your time and your language.",
      ],
    },
    techTitle: "Technologies",
    tech: [
      {
        name: "Next.js 16",
        detail: "Server-rendered React with the App Router for instant, SEO-friendly pages.",
      },
      {
        name: "Anthropic Claude Haiku",
        detail: "The AI model that reads, classifies and summarizes every story in FR and EN.",
      },
      {
        name: "50+ RSS Sources",
        detail: "Trusted international outlets aggregated live from around the globe.",
      },
    ],
    creator: {
      heading: "The Creator",
      body: [
        "GlobeVortex is built by Yannick Boisclair under the DeepVortex brand — an independent studio crafting AI-first products that make information faster and clearer for everyone.",
        "It is one expression of a simple idea: that artificial intelligence, used thoughtfully, can give anyone a clearer window on the world.",
      ],
    },
    ctaHeading: "Ready to explore the world's news?",
    cta: "Enter GlobeVortex",
  },
  fr: {
    back: "← Retour aux actualités",
    hero: {
      eyebrow: "Agrégateur de nouvelles IA",
      title: "Là où l'actualité mondiale tourbillonne",
      subtitle:
        "GlobeVortex est un agrégateur de nouvelles IA bilingue FR/EN — l'actualité internationale propulsée par l'IA, puisée dans plus de 50 sources fiables à travers le monde et synthétisée par Claude.",
    },
    mission: {
      heading: "Notre mission",
      body: [
        "Le monde produit plus d'actualités qu'une personne ne pourra jamais en lire. GlobeVortex existe pour percer ce bruit : un seul endroit, apaisé, où les actualités mondiales les plus importantes du jour sont rassemblées, organisées et résumées — en français comme en anglais.",
        "Nous croyons que rester informé ne devrait pas signifier se noyer dans les onglets ou les murs payants. Notre moteur d'actualités IA lit les manchettes du monde pour que vous saisissiez l'essentiel en quelques minutes, que vous pensiez en français ou en anglais.",
      ],
    },
    how: {
      heading: "Comment ça marche",
      body: [
        "GlobeVortex récupère en continu les manchettes en direct de plus de 50 flux RSS issus de grands médias de tous les continents — des affaires mondiales et de la politique à l'économie, la science, le climat, la santé, la culture et le sport.",
        "Chaque article est ensuite traité par Claude, l'IA d'Anthropic, qui rédige des résumés concis et neutres en français et en anglais. Le résultat : un agrégateur de nouvelles bilingue et rapide, qui respecte votre temps et votre langue.",
      ],
    },
    techTitle: "Technologies",
    tech: [
      {
        name: "Next.js 16",
        detail: "React rendu côté serveur avec l'App Router pour des pages instantanées et optimisées SEO.",
      },
      {
        name: "Anthropic Claude Haiku",
        detail: "Le modèle d'IA qui lit, classe et résume chaque article en FR et EN.",
      },
      {
        name: "Plus de 50 sources RSS",
        detail: "Des médias internationaux de confiance agrégés en direct du monde entier.",
      },
    ],
    creator: {
      heading: "Le créateur",
      body: [
        "GlobeVortex est conçu par Yannick Boisclair sous la marque DeepVortex — un studio indépendant qui façonne des produits axés sur l'IA pour rendre l'information plus rapide et plus claire pour tous.",
        "C'est l'expression d'une idée simple : utilisée avec discernement, l'intelligence artificielle peut offrir à chacun une fenêtre plus nette sur le monde.",
      ],
    },
    ctaHeading: "Prêt à explorer l'actualité mondiale ?",
    cta: "Entrer dans GlobeVortex",
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
        <Prose section={t.how} className="mt-16" />

        {/* Technologies */}
        <section className="mt-16">
          <SectionHeading>{t.techTitle}</SectionHeading>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

        {/* CTA back home */}
        <section className="mt-20 flex flex-col items-center text-center">
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
