import { getPrixParCommerce, PrixCommerceLigne } from "./db";
import {
  comparerAuPrixOfficiel,
  prixDeReference,
  Conformite,
  PrixReference,
} from "./reference";

// ============================================================
// CLASSEMENT DES COMMERCES
// Le cœur de PrixCI : repérer les commerces qui vendent au prix officiel.
// Un commerce n'est jugé que sur des prix vérifiés (3 observations concordantes).
// ============================================================

export interface PrixCommerce extends PrixCommerceLigne {
  reference: PrixReference | null;
  statut: Conformite;
  ecartPct: number | null;
}

export type StatutCommerce = "conforme" | "depassement" | "non_evalue";

export interface Commerce {
  /** identifiant stable dans une zone : type de lieu + nom normalisé */
  cle: string;
  commune: string;
  typeLieu: string;
  nomLieu: string;
  quartier: string;
  latitude: number | null;
  longitude: number | null;
  prix: PrixCommerce[];
  nbConformes: number;
  nbDepassements: number;
  statut: StatutCommerce;
  derniereMAJ: string;
}

export function cleCommerce(typeLieu: string, nomLieu: string): string {
  return `${typeLieu}|${nomLieu.trim().toLowerCase()}`;
}

/** Regroupe les prix vérifiés par commerce et les compare aux prix officiels. */
export function construireCommerces(lignes: PrixCommerceLigne[]): Commerce[] {
  const parCle = new Map<string, Commerce>();

  for (const ligne of lignes) {
    const { commune } = ligne;
    const cle = cleCommerce(ligne.typeLieu, ligne.nomLieu);
    // Deux commerces de même nom dans deux zones restent distincts
    const cleGlobale = `${commune}|${cle}`;
    let commerce = parCle.get(cleGlobale);
    if (!commerce) {
      commerce = {
        cle,
        commune,
        typeLieu: ligne.typeLieu,
        nomLieu: ligne.nomLieu,
        quartier: ligne.quartier,
        latitude: ligne.latitude,
        longitude: ligne.longitude,
        prix: [],
        nbConformes: 0,
        nbDepassements: 0,
        statut: "non_evalue",
        derniereMAJ: ligne.derniereMAJ,
      };
      parCle.set(cleGlobale, commerce);
    }

    const reference = prixDeReference(ligne.produitId, ligne.unite, commune);
    const { statut, ecartPct } = comparerAuPrixOfficiel(ligne.prix, reference);
    commerce.prix.push({ ...ligne, reference, statut, ecartPct });

    if (statut === "conforme") commerce.nbConformes++;
    if (statut === "depassement") commerce.nbDepassements++;
    if (ligne.derniereMAJ > commerce.derniereMAJ) commerce.derniereMAJ = ligne.derniereMAJ;
    if (commerce.latitude === null && ligne.latitude !== null) {
      commerce.latitude = ligne.latitude;
      commerce.longitude = ligne.longitude;
    }
  }

  const commerces = [...parCle.values()];
  for (const c of commerces) {
    // Un seul dépassement suffit à retirer le statut « au prix officiel »
    c.statut =
      c.nbDepassements > 0 ? "depassement" : c.nbConformes > 0 ? "conforme" : "non_evalue";
    c.prix.sort((a, b) => a.produitNom.localeCompare(b.produitNom, "fr"));
  }

  // Les commerces au prix officiel d'abord, les plus documentés en tête
  const rang: Record<StatutCommerce, number> = { conforme: 0, non_evalue: 1, depassement: 2 };
  return commerces.sort(
    (a, b) =>
      rang[a.statut] - rang[b.statut] ||
      b.nbConformes - a.nbConformes ||
      a.nomLieu.localeCompare(b.nomLieu, "fr")
  );
}

/** Commerces d'une zone, ou de toutes les zones si aucune n'est précisée. */
export async function getCommerces(commune?: string): Promise<Commerce[]> {
  return construireCommerces(await getPrixParCommerce(commune));
}

export async function getCommerce(commune: string, cle: string): Promise<Commerce | null> {
  return (await getCommerces(commune)).find((c) => c.cle === cle) ?? null;
}

// ─── Faire mon marché ─────────────────────────────────────

export interface CommercePourListe {
  commerce: Commerce;
  /** produits de la liste vendus ici au prix officiel ou en dessous */
  auPrixOfficiel: PrixCommerce[];
  /** produits de la liste vendus ici au-dessus du prix officiel */
  auDessus: PrixCommerce[];
  /** produits de la liste vendus ici, sans prix officiel pour comparer */
  sansReference: PrixCommerce[];
  distanceKm: number | null;
}

/**
 * Où acheter une liste de produits : les commerces qui en vendent le plus
 * au prix officiel d'abord, puis les plus proches.
 */
export function commercesPourListe(
  commerces: Commerce[],
  produitIds: string[],
  distance: (c: Commerce) => number | null
): CommercePourListe[] {
  const voulus = new Set(produitIds);
  return commerces
    .map((commerce) => {
      const concernes = commerce.prix.filter((p) => voulus.has(p.produitId));
      return {
        commerce,
        auPrixOfficiel: concernes.filter((p) => p.statut === "conforme"),
        auDessus: concernes.filter((p) => p.statut === "depassement"),
        sansReference: concernes.filter((p) => p.statut === "sans_reference"),
        distanceKm: distance(commerce),
      };
    })
    .filter((r) => r.auPrixOfficiel.length + r.auDessus.length + r.sansReference.length > 0)
    .sort(
      (a, b) =>
        b.auPrixOfficiel.length - a.auPrixOfficiel.length ||
        a.auDessus.length - b.auDessus.length ||
        (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    );
}
