import Image from "next/image";
import Link from "next/link";
import type { Language } from "@/types";

interface FooterProps {
  language: Language;
}

const footerText: Record<
  Language,
  {
    tagline: string;
    rights: string;
    soon: string;
    contact: string;
    about: string;
    privacy: string;
    terms: string;
    credit: string;
    xAria: string;
  }
> = {
  en: {
    tagline: "World news powered by AI",
    rights: "© {year} DeepVortex. All rights reserved.",
    soon: "Coming soon",
    contact: "Contact",
    about: "About",
    privacy: "Privacy Policy",
    terms: "Terms",
    credit: "Created by Yannick Boisclair · Powered by Claude (Anthropic)",
    xAria: "GlobeVortex on X",
  },
  fr: {
    tagline: "L'actualité mondiale propulsée par l'IA",
    rights: "© {year} DeepVortex. Tous droits réservés.",
    soon: "Prochainement",
    contact: "Contact",
    about: "À propos",
    privacy: "Politique de confidentialité",
    terms: "Conditions",
    credit: "Créé par Yannick Boisclair · Propulsé par Claude (Anthropic)",
    xAria: "GlobeVortex sur X",
  },
};

// Official X ("bird-replacement") logo mark, inline so the footer doesn't need
// an icon-library dependency it doesn't already have.
function XLogo() {
  return (
    <svg viewBox="0 0 1200 1227" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
    </svg>
  );
}

export default function Footer({ language }: FooterProps) {
  const text = footerText[language];
  const rights = text.rights.replace("{year}", String(new Date().getFullYear()));

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(201,168,76,0.3)",
        backgroundColor: "#08080D",
        paddingTop: "48px",
        paddingBottom: "48px",
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:px-6">
        {/* Logo + name + tagline */}
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/logo.png"
            alt="GlobeVortex logo"
            width={64}
            height={64}
            style={{ filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.8))' }}
          />
          <span className="font-display text-lg font-bold tracking-wider">
            <span className="text-white">GLOBE</span>
            <span className="text-gv-gold"> VORTEX</span>
          </span>
          <p className="text-sm text-gv-muted">{text.tagline}</p>
        </div>

        {/* Links row */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-gv-muted">
          <a href="mailto:admin@globevortex.com" className="transition-colors hover:text-gv-gold">
            {text.contact}
          </a>
          <span aria-hidden className="text-xs opacity-50">·</span>
          <Link href="/about" className="transition-colors hover:text-gv-gold">
            {text.about}
          </Link>
          <span aria-hidden className="text-xs opacity-50">·</span>
          <Link href="/privacy" className="text-xs transition-colors hover:text-gv-gold">
            {text.privacy}
          </Link>
          <span aria-hidden className="text-xs opacity-50">·</span>
          <Link href="/terms" className="text-xs transition-colors hover:text-gv-gold">
            {text.terms}
          </Link>
        </div>

        {/* Social */}
        <a
          href="https://x.com/GlobeVortex"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={text.xAria}
          className="text-gv-muted transition-colors duration-300 hover:text-gv-gold hover:drop-shadow-[0_0_6px_rgba(201,168,76,0.8)]"
        >
          <XLogo />
        </a>

        {/* Copyright */}
        <p className="text-center text-xs opacity-60">{rights}</p>
        <p className="text-center text-xs opacity-50">{text.credit}</p>
      </div>
    </footer>
  );
}
