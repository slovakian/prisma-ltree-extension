/**
 * The Catarrhini-rooted phylogenetic dataset slice (authoritative topology).
 *
 * Root: `Catarrhini` — theMRCA of Old World monkeys (Cercopithecoidea) and
 * apes (Hominoidea). The Hominoidea branch is detailed down to species,
 * including key extinct *Homo*; Cercopithecoidea is included so cross-clade
 * `lca()` queries settle *at the root* rather than at an opaque path.
 *
 * Every label is a valid ltree label (`[A-Za-z][A-Za-z0-9_]*`, ≤255 chars);
 * spaces in scientific names are replaced with underscores. Each clade's
 * label is the bare scientific clade name (no overlap with species labels of
 * the form `Genus_epithet`).
 *
 * `wiki_url` is the canonical English Wikipedia article. `thumbnail_url` is
 * intentionally *not* set here — it's resolved at seed time by
 * `scripts/seed.ts` via the Wikipedia `pageimages` REST API and cached in the
 * DB so the running app never needs to call Wikipedia.
 *
 * `ma_origin` / `ma_extinct` are approximate million-years-ago values used
 * only for the "era" badge in the UI; they are not authoritative
 * paleontological dates. A null `ma_extinct` on a living taxon just means
 * "still around".
 *
 * Cross-branch MRCA demos this dataset makes possible (each lands on a
 * *named* clade, not an opaque path):
 *   - lca(Homo_sapiens, Pan_troglodytes)        → Hominini
 *   - lca(Homo_sapiens, Gorilla_gorilla)        → Homininae
 *   - lca(Homo_sapiens, Pongo_pygmaeus)         → Hominidae
 *   - lca(Homo_sapiens, Hylobates_lar)          → Hominoidea
 *   - lca(Homo_sapiens, Mandrillus_sphinx)      → Catarrhini (the headline demo)
 *   - lca(Homo_sapiens, Homo_neanderthalensis)  → Homo_heidelbergensis (extinct LCA)
 */
import { randomUUID } from "node:crypto";

export type Taxon = {
  id: string;
  path: string;
  scientificName: string;
  commonName: string | null;
  rank: TaxonRank;
  extinct: boolean;
  maOrigin: number | null;
  maExtinct: number | null;
  wikiUrl: string;
};

export type TaxonRank =
  | "parvorder"
  | "superfamily"
  | "family"
  | "subfamily"
  | "tribe"
  | "genus"
  | "species";

const ROOT = "Catarrhini";

const taxon = (
  path: string,
  scientificName: string,
  commonName: string | null,
  rank: TaxonRank,
  opts: {
    extinct?: boolean;
    maOrigin?: number | null;
    maExtinct?: number | null;
    wikiUrl: string;
  },
): Taxon => ({
  id: randomUUID(),
  path,
  scientificName,
  commonName,
  rank,
  extinct: opts.extinct ?? false,
  maOrigin: opts.maOrigin ?? null,
  maExtinct: opts.maExtinct ?? null,
  wikiUrl: opts.wikiUrl,
});

export const taxa: Taxon[] = [
  // ── Root ──────────────────────────────────────────────────────────────────
  taxon(ROOT, "Catarrhini", "Old World monkeys and apes", "parvorder", {
    maOrigin: 30,
    wikiUrl: "https://en.wikipedia.org/wiki/Catarrhini",
  }),

  // ── Cercopithecoidea (Old World monkeys) branch ───────────────────────────
  taxon(`${ROOT}.Cercopithecoidea`, "Cercopithecoidea", "Old World monkeys", "superfamily", {
    maOrigin: 25,
    wikiUrl: "https://en.wikipedia.org/wiki/Old_World_monkey",
  }),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae`,
    "Cercopithecidae",
    "typical Old World monkeys",
    "family",
    { maOrigin: 12, wikiUrl: "https://en.wikipedia.org/wiki/Cercopithecidae" },
  ),

  // Cercopithecinae (cheek-pouched monkeys)
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae`,
    "Cercopithecinae",
    "cheek-pouched monkeys",
    "subfamily",
    { maOrigin: 10, wikiUrl: "https://en.wikipedia.org/wiki/Cercopithecinae" },
  ),

  // Macaca
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Macaca`,
    "Macaca",
    "macaques",
    "genus",
    { maOrigin: 6, wikiUrl: "https://en.wikipedia.org/wiki/Macaque" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Macaca.Macaca_mulatta`,
    "Macaca mulatta",
    "rhesus macaque",
    "species",
    { maOrigin: 2.5, wikiUrl: "https://en.wikipedia.org/wiki/Rhesus_macaque" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Macaca.Macaca_fuscata`,
    "Macaca fuscata",
    "Japanese macaque",
    "species",
    { maOrigin: 0.5, wikiUrl: "https://en.wikipedia.org/wiki/Japanese_macaque" },
  ),

  // Papio
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Papio`,
    "Papio",
    "baboons",
    "genus",
    { maOrigin: 5, wikiUrl: "https://en.wikipedia.org/wiki/Baboon" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Papio.Papio_anubis`,
    "Papio anubis",
    "olive baboon",
    "species",
    { maOrigin: 1, wikiUrl: "https://en.wikipedia.org/wiki/Olive_baboon" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Papio.Papio_hamadryas`,
    "Papio hamadryas",
    "hamadryas baboon",
    "species",
    { maOrigin: 1, wikiUrl: "https://en.wikipedia.org/wiki/Hamadryas_baboon" },
  ),

  // Mandrillus
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Mandrillus`,
    "Mandrillus",
    "mandrills and drills",
    "genus",
    { maOrigin: 3, wikiUrl: "https://en.wikipedia.org/wiki/Mandrillus" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Mandrillus.Mandrillus_sphinx`,
    "Mandrillus sphinx",
    "mandrill",
    "species",
    { maOrigin: 1, wikiUrl: "https://en.wikipedia.org/wiki/Mandrill" },
  ),

  // Colobinae (leaf-eating monkeys)
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Colobinae`,
    "Colobinae",
    "leaf-eating monkeys",
    "subfamily",
    { maOrigin: 12, wikiUrl: "https://en.wikipedia.org/wiki/Colobinae" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Colobinae.Colobus`,
    "Colobus",
    "colobus monkeys",
    "genus",
    { maOrigin: 5, wikiUrl: "https://en.wikipedia.org/wiki/Colobus_monkey" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Colobinae.Colobus.Colobus_guereza`,
    "Colobus guereza",
    "mantled guereza",
    "species",
    { maOrigin: 0.5, wikiUrl: "https://en.wikipedia.org/wiki/Mantled_guereza" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Colobinae.Semnopithecus`,
    "Semnopithecus",
    "gray langurs",
    "genus",
    { maOrigin: 3, wikiUrl: "https://en.wikipedia.org/wiki/Gray_langur" },
  ),
  taxon(
    `${ROOT}.Cercopithecoidea.Cercopithecidae.Colobinae.Semnopithecus.Semnopithecus_entellus`,
    "Semnopithecus entellus",
    "northern plains gray langur",
    "species",
    { maOrigin: 0.5, wikiUrl: "https://en.wikipedia.org/wiki/Northern_plains_gray_langur" },
  ),

  // ── Hominoidea (apes) branch ──────────────────────────────────────────────
  taxon(`${ROOT}.Hominoidea`, "Hominoidea", "apes", "superfamily", {
    maOrigin: 22,
    wikiUrl: "https://en.wikipedia.org/wiki/Ape",
  }),

  // Hylobatidae (lesser apes — gibbons)
  taxon(`${ROOT}.Hominoidea.Hylobatidae`, "Hylobatidae", "gibbons (lesser apes)", "family", {
    maOrigin: 18,
    wikiUrl: "https://en.wikipedia.org/wiki/Gibbon",
  }),
  taxon(`${ROOT}.Hominoidea.Hylobatidae.Hylobates`, "Hylobates", "gibbons", "genus", {
    maOrigin: 8,
    wikiUrl: "https://en.wikipedia.org/wiki/Hylobates",
  }),
  taxon(
    `${ROOT}.Hominoidea.Hylobatidae.Hylobates.Hylobates_lar`,
    "Hylobates lar",
    "lar gibbon",
    "species",
    { maOrigin: 1, wikiUrl: "https://en.wikipedia.org/wiki/Lar_gibbon" },
  ),
  taxon(`${ROOT}.Hominoidea.Hylobatidae.Symphalangus`, "Symphalangus", "siamang", "genus", {
    maOrigin: 7,
    wikiUrl: "https://en.wikipedia.org/wiki/Symphalangus",
  }),
  taxon(
    `${ROOT}.Hominoidea.Hylobatidae.Symphalangus.Symphalangus_syndactylus`,
    "Symphalangus syndactylus",
    "siamang",
    "species",
    { maOrigin: 1, wikiUrl: "https://en.wikipedia.org/wiki/Siamang" },
  ),

  // Hominidae (great apes)
  taxon(`${ROOT}.Hominoidea.Hominidae`, "Hominidae", "great apes", "family", {
    maOrigin: 16,
    wikiUrl: "https://en.wikipedia.org/wiki/Hominidae",
  }),

  // Ponginae (orangutans)
  taxon(`${ROOT}.Hominoidea.Hominidae.Ponginae`, "Ponginae", "orangutans", "subfamily", {
    maOrigin: 16,
    wikiUrl: "https://en.wikipedia.org/wiki/Ponginae",
  }),
  taxon(`${ROOT}.Hominoidea.Hominidae.Ponginae.Pongo`, "Pongo", "orangutans", "genus", {
    maOrigin: 12,
    wikiUrl: "https://en.wikipedia.org/wiki/Orangutan",
  }),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Ponginae.Pongo.Pongo_pygmaeus`,
    "Pongo pygmaeus",
    "Bornean orangutan",
    "species",
    { maOrigin: 0.7, wikiUrl: "https://en.wikipedia.org/wiki/Bornean_orangutan" },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Ponginae.Pongo.Pongo_abelii`,
    "Pongo abelii",
    "Sumatran orangutan",
    "species",
    { maOrigin: 0.7, wikiUrl: "https://en.wikipedia.org/wiki/Sumatran_orangutan" },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Ponginae.Pongo.Pongo_tapanuliensis`,
    "Pongo tapanuliensis",
    "Tapanuli orangutan",
    "species",
    { maOrigin: 0.5, wikiUrl: "https://en.wikipedia.org/wiki/Tapanuli_orangutan" },
  ),

  // Homininae (African apes)
  taxon(`${ROOT}.Hominoidea.Hominidae.Homininae`, "Homininae", "African apes", "subfamily", {
    maOrigin: 10,
    wikiUrl: "https://en.wikipedia.org/wiki/Homininae",
  }),

  // Gorillini (gorillas)
  taxon(`${ROOT}.Hominoidea.Hominidae.Homininae.Gorillini`, "Gorillini", "gorillas", "tribe", {
    maOrigin: 8,
    wikiUrl: "https://en.wikipedia.org/wiki/Gorillini",
  }),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Gorillini.Gorilla`,
    "Gorilla",
    "gorillas",
    "genus",
    { maOrigin: 2.5, wikiUrl: "https://en.wikipedia.org/wiki/Gorilla" },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Gorillini.Gorilla.Gorilla_gorilla`,
    "Gorilla gorilla",
    "western gorilla",
    "species",
    { maOrigin: 0.1, wikiUrl: "https://en.wikipedia.org/wiki/Western_gorilla" },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Gorillini.Gorilla.Gorilla_beringei`,
    "Gorilla beringei",
    "eastern gorilla",
    "species",
    { maOrigin: 0.1, wikiUrl: "https://en.wikipedia.org/wiki/Eastern_gorilla" },
  ),

  // Hominini (humans and chimpanzees)
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini`,
    "Hominini",
    "humans and chimpanzees",
    "tribe",
    { maOrigin: 7, wikiUrl: "https://en.wikipedia.org/wiki/Hominini" },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Pan`,
    "Pan",
    "chimpanzees and bonobos",
    "genus",
    { maOrigin: 6, wikiUrl: "https://en.wikipedia.org/wiki/Chimpanzee" },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Pan.Pan_troglodytes`,
    "Pan troglodytes",
    "common chimpanzee",
    "species",
    { maOrigin: 0.5, wikiUrl: "https://en.wikipedia.org/wiki/Chimpanzee" },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Pan.Pan_paniscus`,
    "Pan paniscus",
    "bonobo",
    "species",
    { maOrigin: 0.5, wikiUrl: "https://en.wikipedia.org/wiki/Bonobo" },
  ),
  taxon(`${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Homo`, "Homo", "humans", "genus", {
    maOrigin: 2.8,
    wikiUrl: "https://en.wikipedia.org/wiki/Homo",
  }),
  // H. heidelbergensis is modeled as the last common ancestor of modern humans
  // and Neanderthals (mainstream paleoanthropology), so sapiens and
  // neanderthalensis nest UNDER it rather than beside it. The remaining Homo
  // species stay as siblings under the genus because their precise intra-genus
  // ancestry is genuinely contested — asserting a linear chain would be less
  // truthful, not more.
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_heidelbergensis`,
    "Homo heidelbergensis",
    "Heidelberg Man",
    "species",
    {
      extinct: true,
      maOrigin: 0.7,
      maExtinct: 0.2,
      wikiUrl: "https://en.wikipedia.org/wiki/Homo_heidelbergensis",
    },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_heidelbergensis.Homo_sapiens`,
    "Homo sapiens",
    "modern human",
    "species",
    { maOrigin: 0.3, wikiUrl: "https://en.wikipedia.org/wiki/Human" },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_heidelbergensis.Homo_neanderthalensis`,
    "Homo neanderthalensis",
    "Neanderthal",
    "species",
    {
      extinct: true,
      maOrigin: 0.4,
      maExtinct: 0.04,
      wikiUrl: "https://en.wikipedia.org/wiki/Neanderthal",
    },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_erectus`,
    "Homo erectus",
    "Upright man",
    "species",
    {
      extinct: true,
      maOrigin: 1.9,
      maExtinct: 0.1,
      wikiUrl: "https://en.wikipedia.org/wiki/Homo_erectus",
    },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_floresiensis`,
    "Homo floresiensis",
    "Flores Man",
    "species",
    {
      extinct: true,
      maOrigin: 0.7,
      maExtinct: 0.05,
      wikiUrl: "https://en.wikipedia.org/wiki/Homo_floresiensis",
    },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_naledi`,
    "Homo naledi",
    "naledi",
    "species",
    {
      extinct: true,
      maOrigin: 0.3,
      maExtinct: 0.2,
      wikiUrl: "https://en.wikipedia.org/wiki/Homo_naledi",
    },
  ),
  taxon(
    `${ROOT}.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_habilis`,
    "Homo habilis",
    "handy man",
    "species",
    {
      extinct: true,
      maOrigin: 2,
      maExtinct: 1.4,
      wikiUrl: "https://en.wikipedia.org/wiki/Homo_habilis",
    },
  ),
];

if (taxa.length !== 46) {
  // Sanity guard: any future edit that silently changes the dataset size
  // is a regression. Update this assertion if you intentionally add/remove.
  throw new Error(
    `Expected 46 taxa in seed-data, got ${taxa.length}. ` +
      "Update the assertion if you intentionally changed the dataset size.",
  );
}

const seenPaths = new Set<string>();
for (const t of taxa) {
  if (seenPaths.has(t.path)) {
    throw new Error(`Duplicate taxon path in seed-data: ${t.path}`);
  }
  seenPaths.add(t.path);
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/.test(t.path)) {
    throw new Error(`Invalid ltree label in seed-data path: ${t.path}`);
  }
}
