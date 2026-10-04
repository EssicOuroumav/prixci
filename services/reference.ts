import {
  BULLETIN_EMBARQUE,
  PRIX_OFFICIELS_EMBARQUES,
} from "@/constants/prixOfficiels";
import { villeDeZone } from "@/constants/types";

// ============================================================
// PRIX OFFICIELS DE L'ÉTAT
// Deux natures, à ne jamais confondre :
//   - « plafond » : prix maximum fixé par arrêté. Le dépasser est une infraction.
//   - « moyen »   : coût moyen du marché publié chaque semaine (indicatif).
// ============================================================

export type TypeReference = "plafond" | "moyen";

export interface PrixReference {
  type: TypeReference;
  produitId: string;
  unite: string;
  ville: string;
  prix: number;
  dateDebut: string;
  dateFin: string | null;
  source: string;
}

// Écart toléré avant de dire qu'un commerce dépasse le prix officiel.
// Aucun pour un plafond légal ; 5 % pour un prix moyen, qui est arrondi.
const TOLERANCE: Record<TypeReference, number> = { plafond: 0, moyen: 0.05 };

const index = new Map<string, PrixReference>();
const cle = (ville: string, produitId: string, unite: string) =>
  `${ville}|${produitId}|${unite}`;

function enregistrer(r: PrixReference): void {
  const k = cle(r.ville, r.produitId, r.unite);
  const actuel = index.get(k);
  // Un plafond légal l'emporte toujours ; sinon la référence la plus récente
  if (
    !actuel ||
    (r.type === "plafond" && actuel.type !== "plafond") ||
    (r.type === actuel.type && r.dateDebut >= actuel.dateDebut)
  ) {
    index.set(k, r);
  }
}

/**
 * (Re)construit l'index : le bulletin embarqué d'abord, puis les lignes
 * venues du serveur (plus récentes, ou plafonds légaux).
 */
export function chargerReferences(duServeur: PrixReference[] = []): void {
  index.clear();
  for (const ligne of PRIX_OFFICIELS_EMBARQUES) {
    for (const [ville, prix] of Object.entries(ligne.prix)) {
      enregistrer({
        type: BULLETIN_EMBARQUE.type,
        produitId: ligne.produitId,
        unite: ligne.unite,
        ville,
        prix: prix as number,
        dateDebut: BULLETIN_EMBARQUE.dateDebut,
        dateFin: BULLETIN_EMBARQUE.dateFin,
        source: BULLETIN_EMBARQUE.source,
      });
    }
  }
  duServeur.forEach(enregistrer);
}

/** Prix officiel d'un produit pour une zone (commune d'Abidjan ou ville). */
export function prixDeReference(
  produitId: string,
  unite: string,
  zone: string
): PrixReference | null {
  if (index.size === 0) chargerReferences();
  return index.get(cle(villeDeZone(zone), produitId, unite)) ?? null;
}

/** Toutes les références d'une zone, pour l'écran d'accueil. */
export function referencesDeZone(zone: string): PrixReference[] {
  if (index.size === 0) chargerReferences();
  const ville = villeDeZone(zone);
  return [...index.values()].filter((r) => r.ville === ville);
}

export type Conformite = "conforme" | "depassement" | "sans_reference";

/** Compare un prix constaté au prix officiel. */
export function comparerAuPrixOfficiel(
  prix: number,
  reference: PrixReference | null
): { statut: Conformite; ecartPct: number | null } {
  if (!reference) return { statut: "sans_reference", ecartPct: null };
  const ecartPct = Math.round(((prix - reference.prix) / reference.prix) * 100);
  const limite = reference.prix * (1 + TOLERANCE[reference.type]);
  return { statut: prix <= limite ? "conforme" : "depassement", ecartPct };
}

export function libelleReference(type: TypeReference): string {
  return type === "plafond" ? "Prix plafonné par l'État" : "Prix moyen officiel";
}
