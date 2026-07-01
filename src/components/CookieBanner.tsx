"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BannerLang = "en" | "fr";

const TEXT: Record<BannerLang, { message: string; link: string; accept: string; decline: string }> = {
  en: {
    message:
      "GlobeVortex uses Vercel Analytics to measure anonymous traffic. No personal data is collected or sold. — ",
    link: "Privacy Policy",
    accept: "Accept",
    decline: "Decline",
  },
  fr: {
    message:
      "GlobeVortex utilise Vercel Analytics pour mesurer le trafic anonyme. Aucune donnée personnelle n'est collectée ou vendue. — ",
    link: "Politique de confidentialité",
    accept: "Accepter",
    decline: "Refuser",
  },
};

export default function CookieBanner({ lang = "en" }: { lang?: BannerLang }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Banner language now follows the URL locale (passed from the [lang] layout)
  // instead of a localStorage flag nothing ever set.
  const language = lang;

  // Read consent only after mount: localStorage is client-only, and starting
  // hidden keeps the SSR markup (null) identical to the first client render.
  useEffect(() => {
    const consent = localStorage.getItem("gv-cookie-consent");
    if (consent === "accepted" || consent === "declined") return;
    setVisible(true);
  }, []);

  function dismiss(choice: "accepted" | "declined") {
    localStorage.setItem("gv-cookie-consent", choice);
    setLeaving(true);
    // Match the 300ms opacity transition before unmounting.
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  const t = TEXT[language];

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        backgroundColor: "#0A0A0F",
        borderTop: "1px solid rgba(201,168,76,0.3)",
        padding: "16px 24px",
        opacity: leaving ? 0 : 1,
        transition: "opacity 300ms ease",
      }}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-4 sm:flex-row sm:justify-between"
    >
      <p className="max-w-3xl text-sm text-gv-muted">
        {t.message}
        <Link href={`/${language}/privacy`} className="text-gv-gold transition-colors hover:text-gv-gold-light">
          {t.link}
        </Link>
      </p>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => dismiss("declined")}
          className="rounded border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5"
        >
          {t.decline}
        </button>
        <button
          type="button"
          onClick={() => dismiss("accepted")}
          style={{ backgroundColor: "#C9A84C" }}
          className="rounded px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          {t.accept}
        </button>
      </div>
    </div>
  );
}
