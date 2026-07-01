// Seeds the permanent `yearly_highlights` table with the curated Jan–Jun 2026
// highlights for the Year in Review page. Idempotent: upserts on the
// (year, month, display_order) unique index, so re-running updates in place.
//
// Usage (from the repo root, after running migration 0004 in Supabase):
//   node scripts/seed-yearly-highlights.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local parser — no dotenv dependency needed for a one-off script.
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// h(month, order, category, date, [fr headline, fr desc], [en headline, en desc])
const h = (month, order, category, date, [hfr, dfr], [hen, den]) => ({
  year: 2026,
  month,
  display_order: order,
  category,
  event_date: date,
  headline_fr: hfr,
  description_fr: dfr,
  headline_en: hen,
  description_en: den,
  image_url: null,
});

const HIGHLIGHTS = [
  // ── January 2026 ──────────────────────────────────────────────────────────
  h(1, 1, "politics", "2026-01-01",
    ["Zohran Mamdani devient maire de New York",
     "Le démocrate socialiste prête serment comme 111e maire de New York, promettant une ville plus abordable."],
    ["Zohran Mamdani becomes mayor of New York",
     "The democratic socialist is sworn in as New York's 111th mayor, promising a more affordable city."]),
  h(1, 2, "conflict", "2026-01-03",
    ["L'armée américaine capture le président vénézuélien Maduro lors d'une offensive majeure",
     "Une opération militaire d'envergure aboutit à la capture de Nicolás Maduro, bouleversant l'équilibre politique de l'Amérique latine."],
    ["US military captures Venezuelan President Maduro in a major offensive",
     "A large-scale military operation ends with the capture of Nicolás Maduro, upending Latin America's political balance."]),
  h(1, 3, "conflict", "2026-01-08",
    ["L'Iran réprime des manifestations nationales, répression la plus meurtrière depuis 1979",
     "Des manifestations à l'échelle du pays sont écrasées dans le sang, la répression la plus meurtrière depuis la révolution de 1979."],
    ["Iran crushes nationwide protests in its deadliest crackdown since 1979",
     "Country-wide demonstrations are violently suppressed in the deadliest repression since the 1979 revolution."]),
  h(1, 4, "politics", "2026-01-20",
    ["Trump menace de tarifs 8 pays européens opposés à sa prise du Groenland",
     "Washington brandit des tarifs douaniers contre huit pays européens qui s'opposent aux ambitions américaines sur le Groenland."],
    ["Trump threatens tariffs on 8 European countries opposing his Greenland takeover",
     "Washington wields tariff threats against eight European countries standing in the way of American ambitions over Greenland."]),
  h(1, 5, "politics", "2026-01-30",
    ["Le DOJ publie plus de 3 millions de pages des « Epstein files »",
     "Le département de la Justice rend publiques plus de 3 millions de pages de documents liés à l'affaire Epstein."],
    ["DOJ releases more than 3 million pages of the Epstein files",
     "The Justice Department makes public over 3 million pages of documents tied to the Epstein case."]),

  // ── February 2026 ─────────────────────────────────────────────────────────
  h(2, 1, "culture", "2026-02-01",
    ["Kendrick Lamar devient l'artiste hip-hop avec le plus de Grammys, 27 au total",
     "Avec 27 trophées, Kendrick Lamar dépasse tous les autres artistes hip-hop de l'histoire des Grammys."],
    ["Kendrick Lamar becomes the most Grammy-awarded hip-hop artist with 27 wins",
     "With 27 trophies, Kendrick Lamar surpasses every other hip-hop artist in Grammy history."]),
  h(2, 2, "sports", "2026-02-06",
    ["Jeux Olympiques d'hiver à Milan/Cortina d'Ampezzo, record de 41 médailles pour la Norvège",
     "Les Jeux d'hiver de Milan-Cortina (6-22 février) voient la Norvège établir un record historique de 41 médailles."],
    ["Winter Olympics in Milan/Cortina d'Ampezzo as Norway sets a record with 41 medals",
     "The Milan-Cortina Winter Games (Feb 6-22) see Norway set an all-time record of 41 medals."]),
  h(2, 3, "sports", "2026-02-08",
    ["Seattle Seahawks remportent le Super Bowl, mi-temps de Bad Bunny en espagnol",
     "Les Seahawks soulèvent le trophée Lombardi tandis que Bad Bunny livre le premier spectacle de mi-temps entièrement en espagnol."],
    ["Seattle Seahawks win the Super Bowl as Bad Bunny performs the halftime show in Spanish",
     "The Seahawks lift the Lombardi Trophy while Bad Bunny delivers the first all-Spanish halftime show."]),
  h(2, 4, "conflict", "2026-02-28",
    ["Frappe militaire US-Israël contre l'Iran, mort du guide suprême Khamenei, fermeture du détroit d'Ormuz",
     "Une frappe conjointe américano-israélienne tue le guide suprême Khamenei; Téhéran riposte en fermant le détroit d'Ormuz."],
    ["US-Israeli military strike on Iran kills Supreme Leader Khamenei; Strait of Hormuz closed",
     "A joint US-Israeli strike kills Supreme Leader Khamenei; Tehran retaliates by closing the Strait of Hormuz."]),

  // ── March 2026 ────────────────────────────────────────────────────────────
  h(3, 1, "conflict", "2026-03-01",
    ["Hezbollah frappe Israël, premières frappes israéliennes sur Beyrouth en un an, USS Abraham Lincoln attaqué",
     "L'escalade régionale s'étend au Liban : le Hezbollah frappe Israël, Beyrouth est bombardée et le porte-avions USS Abraham Lincoln est attaqué."],
    ["Hezbollah strikes Israel; first Israeli strikes on Beirut in a year; USS Abraham Lincoln attacked",
     "The regional escalation spreads to Lebanon: Hezbollah strikes Israel, Beirut is bombed, and the carrier USS Abraham Lincoln comes under attack."]),
  h(3, 2, "conflict", "2026-03-13",
    ["Les USA envoient 2 500 Marines supplémentaires au Moyen-Orient",
     "Washington renforce sa présence militaire au Moyen-Orient avec 2 500 Marines supplémentaires."],
    ["US sends 2,500 additional Marines to the Middle East",
     "Washington bolsters its military presence in the Middle East with 2,500 additional Marines."]),
  h(3, 3, "conflict", "2026-03-26",
    ["Trump prolonge l'ultimatum donné à l'Iran sur le détroit d'Ormuz",
     "La Maison-Blanche accorde un délai supplémentaire à Téhéran pour rouvrir le détroit d'Ormuz avant une riposte militaire."],
    ["Trump extends his ultimatum to Iran over the Strait of Hormuz",
     "The White House gives Tehran extra time to reopen the Strait of Hormuz before a military response."]),
  h(3, 4, "tech", "2026-03-27",
    ["Procès historique : Meta et YouTube jugés négligents pour la dépendance créée chez les jeunes",
     "Un verdict historique déclare Meta et YouTube négligents pour la dépendance que leurs plateformes créent chez les jeunes."],
    ["Landmark trial: Meta and YouTube found negligent over youth addiction",
     "A historic verdict finds Meta and YouTube negligent for the addiction their platforms foster in young users."]),
  h(3, 5, "politics", "2026-03-28",
    ["Manifestations « No Kings », potentiellement la plus grande journée de protestation de l'histoire américaine",
     "Des millions d'Américains descendent dans la rue, potentiellement la plus grande journée de protestation de l'histoire du pays."],
    ["“No Kings” protests, potentially the largest day of protest in American history",
     "Millions of Americans take to the streets in what may be the largest single day of protest in the nation's history."]),

  // ── April 2026 ────────────────────────────────────────────────────────────
  h(4, 1, "science", "2026-04-01",
    ["Lancement d'Artemis II, premier vol habité vers la Lune depuis 1972",
     "La NASA lance Artemis II, renvoyant des astronautes vers la Lune pour la première fois depuis 1972."],
    ["Artemis II launches, the first crewed flight to the Moon since 1972",
     "NASA launches Artemis II, sending astronauts toward the Moon for the first time since 1972."]),
  h(4, 2, "sports", "2026-04-06",
    ["Michigan remporte le championnat NCAA basketball masculin",
     "Les Wolverines du Michigan décrochent le titre national de basketball universitaire masculin."],
    ["Michigan wins the NCAA men's basketball championship",
     "The Michigan Wolverines capture the men's college basketball national title."]),
  h(4, 3, "crime", "2026-04-08",
    ["Rex Heuermann plaide coupable pour les meurtres de Gilgo Beach",
     "L'architecte new-yorkais plaide coupable pour la série de meurtres de Gilgo Beach, clôturant une affaire vieille de plus d'une décennie."],
    ["Rex Heuermann pleads guilty to the Gilgo Beach murders",
     "The New York architect pleads guilty to the Gilgo Beach serial killings, closing a case more than a decade old."]),
  h(4, 4, "politics", "2026-04-09",
    ["Élections en Inde dans quatre États",
     "Quatre États indiens se rendent aux urnes du 9 au 29 avril, un test majeur pour le gouvernement Modi."],
    ["Elections held in four Indian states",
     "Four Indian states head to the polls from April 9 to 29, a major test for the Modi government."]),

  // ── May 2026 ──────────────────────────────────────────────────────────────
  h(5, 1, "economy", "2026-05-01",
    ["Les Émirats arabes unis se retirent de l'OPEP",
     "Abou Dhabi claque la porte de l'OPEP, fragilisant le cartel pétrolier et secouant les marchés de l'énergie."],
    ["The United Arab Emirates withdraws from OPEC",
     "Abu Dhabi walks out of OPEC, weakening the oil cartel and rattling energy markets."]),
  h(5, 2, "sports", "2026-05-02",
    ["Golden Tempo remporte le Kentucky Derby, première victoire d'une entraîneuse",
     "Golden Tempo s'impose au Kentucky Derby, offrant à une femme entraîneuse la première victoire de l'histoire de la course."],
    ["Golden Tempo wins the Kentucky Derby, the first victory for a female trainer",
     "Golden Tempo triumphs at the Kentucky Derby, delivering the race's first-ever win for a female trainer."]),
  h(5, 3, "culture", "2026-05-06",
    ["Mort de Ted Turner, fondateur de CNN, à 87 ans",
     "Le pionnier de l'information en continu et fondateur de CNN s'éteint à l'âge de 87 ans."],
    ["Ted Turner, founder of CNN, dies at 87",
     "The pioneer of 24-hour news and founder of CNN passes away at age 87."]),
  h(5, 4, "health", "2026-05-17",
    ["L'OMS déclare une urgence de santé publique, épidémie d'Ebola en RDC/Ouganda",
     "L'Organisation mondiale de la santé déclare une urgence de portée internationale face à l'épidémie d'Ebola en RDC et en Ouganda."],
    ["WHO declares a public health emergency over the Ebola outbreak in DRC/Uganda",
     "The World Health Organization declares an international emergency over the Ebola outbreak in the DRC and Uganda."]),
  h(5, 5, "tech", "2026-05-25",
    ["Le pape Léon XIV publie sa première encyclique, mettant en garde contre les risques de l'IA",
     "Dans sa première encyclique, Léon XIV met en garde l'humanité contre les risques de l'intelligence artificielle."],
    ["Pope Leo XIV publishes his first encyclical, warning of the risks of AI",
     "In his first encyclical, Leo XIV warns humanity about the risks of artificial intelligence."]),

  // ── June 2026 ─────────────────────────────────────────────────────────────
  h(6, 1, "culture", "2026-06-01",
    ["100e anniversaire de la naissance de Marilyn Monroe",
     "Le monde célèbre le centenaire de la naissance de Marilyn Monroe, icône éternelle du cinéma."],
    ["100th anniversary of Marilyn Monroe's birth",
     "The world marks the centenary of the birth of Marilyn Monroe, cinema's eternal icon."]),
  h(6, 2, "culture", "2026-06-10",
    ["Le pape Léon XIV bénit la tour de la Sagrada Família, centenaire de la mort de Gaudí",
     "À Barcelone, Léon XIV bénit la tour achevée de la Sagrada Família pour le centenaire de la mort d'Antoni Gaudí."],
    ["Pope Leo XIV blesses the Sagrada Família tower on the centenary of Gaudí's death",
     "In Barcelona, Leo XIV blesses the completed Sagrada Família tower marking one hundred years since Antoni Gaudí's death."]),
  h(6, 3, "sports", "2026-06-11",
    ["Coup d'envoi de la Coupe du Monde FIFA 2026, la plus grande édition de l'histoire",
     "La Coupe du Monde 2026 s'ouvre en Amérique du Nord : 48 équipes, trois pays hôtes, la plus grande édition de l'histoire."],
    ["The 2026 FIFA World Cup kicks off, the biggest edition in history",
     "The 2026 World Cup opens across North America: 48 teams, three host countries, the largest edition ever."]),
  h(6, 4, "economy", "2026-06-12",
    ["IPO historique de SpaceX, 75 milliards $ levés, Musk devient le premier trillionnaire",
     "SpaceX lève 75 milliards de dollars lors d'une entrée en bourse record, faisant d'Elon Musk le premier trillionnaire de l'histoire."],
    ["Historic SpaceX IPO raises $75 billion as Musk becomes the first trillionaire",
     "SpaceX raises $75 billion in a record-breaking IPO, making Elon Musk history's first trillionaire."]),
  h(6, 5, "disaster", "2026-06-24",
    ["Séismes dévastateurs au Venezuela, plus de 100 bâtiments effondrés à La Guaira",
     "Des séismes dévastateurs frappent le Venezuela, où plus de 100 bâtiments s'effondrent à La Guaira."],
    ["Devastating earthquakes in Venezuela; more than 100 buildings collapse in La Guaira",
     "Devastating earthquakes strike Venezuela, where more than 100 buildings collapse in La Guaira."]),
];

const { error } = await db
  .from("yearly_highlights")
  .upsert(HIGHLIGHTS, { onConflict: "year,month,display_order" });

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

const { count, error: countError } = await db
  .from("yearly_highlights")
  .select("*", { count: "exact", head: true })
  .eq("year", 2026);

if (countError) {
  console.error("Verification count failed:", countError.message);
  process.exit(1);
}

console.log(`Seeded OK — yearly_highlights now holds ${count} rows for 2026.`);
