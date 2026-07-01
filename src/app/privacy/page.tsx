import type { Metadata } from "next";
import type { Language } from "@/types";
import LegalDoc, { type LegalCopy } from "@/components/LegalDoc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "GlobeVortex privacy policy — anonymous analytics only, no personal data sold. GDPR, Quebec Law 25 and CCPA rights.",
  alternates: { canonical: "https://globevortex.com/privacy" },
  robots: { index: true, follow: true },
};

const COPY: Record<Language, LegalCopy> = {
  en: {
    back: "← Back to news",
    title: "Privacy Policy",
    lastUpdated: "Last updated: June 29, 2026",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "GlobeVortex (globevortex.com) is a bilingual news aggregator created by Yannick Boisclair, Quebec, Canada. Contact: admin@globevortex.com",
        ],
      },
      {
        heading: "What data we collect",
        bullets: [
          "Vercel Analytics: anonymous, aggregated pageview data (pages visited, country, device type). No personal identification. No cross-site tracking.",
          "No user accounts, no login, no registration forms.",
          "No cookies set directly by GlobeVortex.",
          "Article images are loaded from external publisher servers — those servers may log your IP address independently.",
        ],
      },
      {
        heading: "How we use data",
        paragraphs: [
          "Solely to understand site traffic and improve the service. We do not use data for advertising profiling.",
        ],
      },
      {
        heading: "Data sharing",
        paragraphs: [
          "We do not sell, rent, or share your personal data with third parties. Vercel Inc. acts as our analytics processor under their own privacy policy (vercel.com/legal/privacy-policy).",
          "Vercel Analytics data may be processed on servers located outside the EU/EEA, including in the United States, under appropriate safeguards (Standard Contractual Clauses) as described in Vercel's privacy policy (vercel.com/legal/privacy-policy).",
        ],
      },
      {
        heading: "Your rights — EU/EEA residents (GDPR)",
        paragraphs: [
          'You have the right to: access your data, rectification, erasure ("right to be forgotten"), data portability, object to processing, and withdraw consent at any time. To exercise these rights, contact admin@globevortex.com. You may also lodge a complaint with your local data protection authority.',
        ],
      },
      {
        heading: "Your rights — Quebec residents (Law 25 / Bill 64)",
        paragraphs: [
          "Quebec residents have the right to access and correct personal information held about them. Contact admin@globevortex.com to exercise these rights.",
        ],
      },
      {
        heading: "Your rights — California residents (CCPA)",
        paragraphs: [
          "California residents have the right to know what personal information is collected, the right to delete it, and the right to opt-out of its sale. GlobeVortex does NOT sell personal data. We do not discriminate against users who exercise their CCPA rights. Contact admin@globevortex.com.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          'GlobeVortex uses Vercel Analytics in privacy-first mode. If your browser signals a "Do Not Track" preference, analytics are suppressed. You can decline analytics tracking via the banner shown on your first visit.',
        ],
      },
      {
        heading: "Data retention",
        paragraphs: [
          "Vercel Analytics retains aggregated, anonymized data. No personally identifiable information is retained by GlobeVortex.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          "We may update this policy. Continued use of the site after changes constitutes acceptance.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["admin@globevortex.com"],
      },
    ],
  },
  fr: {
    back: "← Retour aux actualités",
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : 29 juin 2026",
    sections: [
      {
        heading: "Qui sommes-nous",
        paragraphs: [
          "GlobeVortex (globevortex.com) est un agrégateur de nouvelles bilingue créé par Yannick Boisclair, Québec, Canada. Contact : admin@globevortex.com",
        ],
      },
      {
        heading: "Données collectées",
        bullets: [
          "Vercel Analytics : données de pages vues anonymes et agrégées (pages visitées, pays, type d'appareil). Aucune identification personnelle. Aucun suivi intersites.",
          "Aucun compte utilisateur, aucune connexion, aucun formulaire d'inscription.",
          "Aucun cookie déposé directement par GlobeVortex.",
          "Les images d'articles sont chargées depuis les serveurs des éditeurs externes — ces serveurs peuvent enregistrer votre adresse IP indépendamment.",
        ],
      },
      {
        heading: "Utilisation des données",
        paragraphs: [
          "Uniquement pour comprendre le trafic du site et améliorer le service. Nous n'utilisons pas les données à des fins de profilage publicitaire.",
        ],
      },
      {
        heading: "Partage des données",
        paragraphs: [
          "Nous ne vendons, ne louons ni ne partageons vos données personnelles avec des tiers. Vercel Inc. agit comme sous-traitant de nos analyses sous sa propre politique de confidentialité.",
          "Les données de Vercel Analytics peuvent être traitées sur des serveurs situés hors de l'UE/EEE, y compris aux États-Unis, sous réserve de garanties appropriées (clauses contractuelles types) telles que décrites dans la politique de confidentialité de Vercel (vercel.com/legal/privacy-policy).",
        ],
      },
      {
        heading: "Vos droits — Résidents UE/EEE (RGPD)",
        paragraphs: [
          "Vous avez le droit d'accéder à vos données, de les rectifier, de les effacer, de les porter, de vous opposer au traitement et de retirer votre consentement à tout moment. Contactez admin@globevortex.com. Vous pouvez également déposer une plainte auprès de votre autorité locale de protection des données.",
        ],
      },
      {
        heading: "Vos droits — Résidents du Québec (Loi 25)",
        paragraphs: [
          "Les résidents du Québec ont le droit d'accéder à leurs renseignements personnels et de les faire corriger. Contactez admin@globevortex.com.",
        ],
      },
      {
        heading: "Vos droits — Résidents de Californie (CCPA)",
        paragraphs: [
          "Les résidents californiens ont le droit de savoir quels renseignements personnels sont collectés, de les faire supprimer et de s'opposer à leur vente. GlobeVortex ne vend PAS de données personnelles. Contactez admin@globevortex.com.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          'GlobeVortex utilise Vercel Analytics en mode respect de la vie privée. Si votre navigateur envoie un signal "Do Not Track", les analyses sont désactivées. Vous pouvez refuser le suivi analytique via la bannière affichée lors de votre première visite.',
        ],
      },
      {
        heading: "Conservation des données",
        paragraphs: [
          "Vercel Analytics conserve des données agrégées et anonymisées. Aucune donnée personnelle identifiable n'est conservée par GlobeVortex.",
        ],
      },
      {
        heading: "Modifications",
        paragraphs: [
          "Nous pouvons mettre à jour cette politique. L'utilisation continue du site après modification vaut acceptation.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["admin@globevortex.com"],
      },
    ],
  },
};

export default function PrivacyPage() {
  return <LegalDoc copy={COPY} />;
}
