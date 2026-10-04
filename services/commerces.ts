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
export function construireCommerces(
  commune: string,
  lignes: PrixCommerceLigne[]
): Commerce[] {
  const parCle = new Map<string, Commerce>();

  for (const ligne of lignes) {
    const cle = cleCommerce(ligne.typeLieu, ligne.nomLieu);
    let commerce = parCle.get(cle);
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
      parCle.set(cle, commerce);
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

export async function getCommerces(commune: string): Promise<Commerce[]> {
  return construireCommerces(commune, await getPrixParCommerce(commune));
}

export async function getCommerce(commune: string, cle: string): Promise<Commerce | null> {
  return (await getCommerces(commune)).find((c) => c.cle === cle) ?? null;
}
