// ============================================================
// TYPES CENTRAUX — PrixCI
// ============================================================

export type Categorie = "alimentation" | "transport";

export type UniteAlimentation =
  | "kg"
  | "g"
  | "litre"
  | "unité"
  | "tas"
  | "botte"
  | "sac_25kg"
  | "sac_50kg"
  | "boite";

export type UniteTransport = "trajet";

export type Unite = UniteAlimentation | UniteTransport;

export type SousCategorie =
  | "legumes_tubercules"
  | "legumes_feuilles"
  | "legumes_fruits"
  | "proteines_viande"
  | "proteines_poisson"
  | "fruits"
  | "cereales_legumineuses"
  | "huiles_condiments"
  | "transport_gbaka"
  | "transport_woro"
  | "transport_taxi";

// ─── Produit de référence (liste statique) ─────────────────
export interface ProduitRef {
  id: string;
  nom: string;
  categorie: Categorie;
  sousCategorie: SousCategorie;
  uniteDefaut: Unite;
  unitesDisponibles: Unite[];
  prixReference?: number; // prix OCPV de référence en FCFA
}

// ─── Signalement utilisateur ───────────────────────────────
export interface Signalement {
  id: string; // UUID local
  userId: string;
  produitId: string;
  produitNom: string; // dénormalisé pour affichage offline
  categorie: Categorie;
  sousCategorie: SousCategorie;
  prix: number; // en FCFA
  unite: Unite;
  commune: string;
  quartier: string;
  typeLieu: TypeLieu;
  nomLieu: string;       // ex: "Marché Siporex", "Sococé Yopougon"
  latitude?: number;
  longitude?: number;
  dateSignalement: string; // ISO 8601
  scoreFilabilite: number; // 0-100
  nbConfirmations: number;
  nbContestations: number;
  synced: boolean;
  createdAt: string;
}

// ─── Validation communautaire ──────────────────────────────
export interface Validation {
  id: string;
  signalementId: string;
  userId: string;
  vote: "confirme" | "conteste";
  dateVote: string;
  synced: boolean;
}

// ─── Profil utilisateur anonyme ────────────────────────────
export interface UserProfile {
  id: string; // UUID Supabase anonymous
  pseudonyme: string;
  scoreConfiance: number; // 0-100, démarre à 50
  nbSignalements: number;
  nbValidationsRecues: number;
  dateCreation: string;
}

// ─── Prix agrégé pour l'affichage ──────────────────────────
export interface PrixAgrege {
  produitId: string;
  produitNom: string;
  commune: string;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  unite: Unite;
  nbSignalements: number;
  derniereMAJ: string;
  tendance: "hausse" | "baisse" | "stable";
}

// ─── Type de point de vente ────────────────────────────────
export type TypeLieu =
  | "marche_traditionnel"
  | "supermarche"
  | "boutique_quartier"
  | "vendeur_ambulant"
  | "station_service"
  | "bord_route"
  | "autre";

export const TYPES_LIEU: { id: TypeLieu; label: string; emoji: string }[] = [
  { id: "marche_traditionnel", label: "Marché traditionnel", emoji: "🏪" },
  { id: "supermarche",         label: "Supermarché",         emoji: "🏬" },
  { id: "boutique_quartier",   label: "Boutique de quartier",emoji: "🏠" },
  { id: "vendeur_ambulant",    label: "Vendeur ambulant",    emoji: "🛒" },
  { id: "bord_route",          label: "Bord de route",       emoji: "🛣️" },
  { id: "station_service",     label: "Station-service",     emoji: "⛽" },
  { id: "autre",               label: "Autre",               emoji: "📍" },
];

// ─── Communes d'Abidjan ────────────────────────────────────
export const COMMUNES_ABIDJAN = [
  "Abobo",
  "Adjamé",
  "Attécoubé",
  "Cocody",
  "Koumassi",
  "Marcory",
  "Plateau",
  "Port-Bouët",
  "Treichville",
  "Yopougon",
] as const;

export type Commune = (typeof COMMUNES_ABIDJAN)[number];
