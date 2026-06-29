import Image from "next/image";
import Link from "next/link";
import type { Language } from "@/types";

interface FooterProps {
  language: Language;
}

const footerText: Record<
  Language,
  { tagline: string; rights: string; soon: string; contact: string; about: string; credit: string }
> = {
  en: {
    tagline: "World news powered by AI",
    rights: "© 2025 DeepVortex. All rights reserved.",
    soon: "Coming soon",
    contact: "Contact",
    about: "About",
    credit: "Created by Yannick Boisclair · Powered by Claude (Anthropic)",
  },
  fr: {
    tagline: "L'actualité mondiale propulsée par l'IA",
    rights: "© 2025 DeepVortex. Tous droits réservés.",
    soon: "Prochainement",
    contact: "Contact",
    about: "À propos",
    credit: "Créé par Yannick Boisclair · Propulsé par Claude (Anthropic)",
  },
};

export default function Footer({ language }: FooterProps) {
  const text = footerText[language];

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

        {/* Links row — placeholder pages, not yet live */}
        <div className="flex items-center gap-4 text-sm text-gv-muted">
          <a href="mailto:admin@globevortex.com" className="transition-colors hover:text-gv-gold">
            {text.contact}
          </a>
          <Link href="/about" className="transition-colors hover:text-gv-gold">
            {text.about}
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs opacity-60">{text.rights}</p>
        <p className="text-center text-xs opacity-50">{text.credit}</p>
      </div>
    </footer>
  );
}
