import type { Metadata } from "next";
import type { Language } from "@/types";
import LegalDoc, { type LegalCopy } from "@/components/LegalDoc";

const SITE = "https://globevortex.com";

type TermsPageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "en";
  return {
    title: "Terms of Service",
    description:
      "GlobeVortex terms of service — news aggregator that summarizes and links to third-party publishers. Governed by the laws of Quebec, Canada.",
    alternates: {
      canonical: `${SITE}/${locale}/terms`,
      languages: {
        en: `${SITE}/en/terms`,
        fr: `${SITE}/fr/terms`,
        "x-default": `${SITE}/en/terms`,
      },
    },
    robots: { index: true, follow: true },
  };
}

const COPY: Record<Language, LegalCopy> = {
  en: {
    back: "← Back to news",
    title: "Terms of Service",
    lastUpdated: "Last updated: June 29, 2026",
    sections: [
      {
        heading: "About GlobeVortex",
        paragraphs: [
          "GlobeVortex is a news aggregator that collects, summarizes, and links to articles from third-party publishers. We do not produce original journalism.",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "All original articles belong to their respective publishers. GlobeVortex displays AI-generated summaries for informational purposes only. If you are a publisher and wish to have your content removed, contact admin@globevortex.com and we will act promptly.",
        ],
      },
      {
        heading: "Accuracy",
        paragraphs: [
          "AI-generated summaries may contain errors or omissions. GlobeVortex makes no guarantee of accuracy, completeness, or timeliness of information. Always refer to the original source.",
        ],
      },
      {
        heading: "External links",
        paragraphs: [
          "GlobeVortex links to third-party websites. We are not responsible for the content, privacy practices, or availability of those sites.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "You may not scrape, crawl, or automate access to GlobeVortex without prior written permission. You may not use the service for illegal purposes.",
        ],
      },
      {
        heading: "Minimum age",
        paragraphs: [
          "GlobeVortex is not directed at children under 13 (or under 16 in the EU/EEA). By using the service, you represent that you meet the applicable minimum age in your jurisdiction.",
        ],
      },
      {
        heading: "Disclaimer of warranties",
        paragraphs: [
          'The service is provided "as is" without warranty of any kind. GlobeVortex is not liable for any damages arising from your use of the service.',
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, GlobeVortex and its operator shall not be liable for any indirect, incidental, or consequential damages.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by the laws of Quebec, Canada. Users outside Canada agree to submit to Quebec jurisdiction for any disputes.",
        ],
      },
      {
        heading: "Severability",
        paragraphs: [
          "If any provision of these Terms is found unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will continue in full force and effect.",
        ],
      },
      {
        heading: "US users",
        paragraphs: [
          "For US residents: dispute resolution shall be handled through binding arbitration in Quebec, Canada, except where prohibited by applicable law.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: [
          "We reserve the right to modify these terms at any time. Continued use constitutes acceptance.",
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
    title: "Conditions d'utilisation",
    lastUpdated: "Dernière mise à jour : 29 juin 2026",
    sections: [
      {
        heading: "À propos de GlobeVortex",
        paragraphs: [
          "GlobeVortex est un agrégateur de nouvelles qui collecte, résume et renvoie vers des articles de tiers. Nous ne produisons pas de journalisme original.",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          "Les articles originaux appartiennent à leurs éditeurs respectifs. GlobeVortex affiche des résumés générés par IA à titre informatif uniquement. Si vous êtes éditeur et souhaitez faire retirer votre contenu, contactez admin@globevortex.com.",
        ],
      },
      {
        heading: "Exactitude",
        paragraphs: [
          "Les résumés générés par IA peuvent contenir des erreurs. GlobeVortex ne garantit pas l'exactitude, l'exhaustivité ou l'actualité des informations. Référez-vous toujours à la source originale.",
        ],
      },
      {
        heading: "Liens externes",
        paragraphs: [
          "GlobeVortex renvoie vers des sites tiers. Nous ne sommes pas responsables du contenu, des pratiques de confidentialité ou de la disponibilité de ces sites.",
        ],
      },
      {
        heading: "Utilisation acceptable",
        paragraphs: [
          "Il est interdit d'extraire, d'explorer ou d'automatiser l'accès à GlobeVortex sans autorisation écrite préalable. Il est interdit d'utiliser le service à des fins illégales.",
        ],
      },
      {
        heading: "Âge minimum",
        paragraphs: [
          "GlobeVortex ne s'adresse pas aux enfants de moins de 13 ans (ou de moins de 16 ans dans l'UE/EEE). En utilisant le service, vous déclarez respecter l'âge minimum applicable dans votre juridiction.",
        ],
      },
      {
        heading: "Absence de garantie",
        paragraphs: [
          'Le service est fourni "tel quel" sans garantie d\'aucune sorte. GlobeVortex n\'est pas responsable des dommages résultant de l\'utilisation du service.',
        ],
      },
      {
        heading: "Limitation de responsabilité",
        paragraphs: [
          "Dans toute la mesure permise par la loi, GlobeVortex et son exploitant ne sauraient être tenus responsables de dommages indirects, accessoires ou consécutifs.",
        ],
      },
      {
        heading: "Droit applicable",
        paragraphs: [
          "Les présentes conditions sont régies par les lois du Québec, Canada. Les utilisateurs hors Canada acceptent la juridiction québécoise.",
        ],
      },
      {
        heading: "Divisibilité",
        paragraphs: [
          "Si une disposition des présentes conditions est jugée inapplicable ou invalide, cette disposition sera limitée ou éliminée dans la mesure minimale nécessaire, et les autres dispositions demeureront pleinement en vigueur.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["admin@globevortex.com"],
      },
    ],
  },
};

export default async function TermsPage({ params }: TermsPageProps) {
  const { lang } = await params;
  const language = (lang === "fr" ? "fr" : "en") as Language;
  return <LegalDoc copy={COPY[language]} language={language} path="terms" />;
}
