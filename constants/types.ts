// ============================================================
// TYPES CENTRAUX — PrixCI
// ============================================================

import type { ComponentProps } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";

/** Nom d'une icône du jeu Ionicons (voir components/Icone.tsx). */
export type NomIcone = ComponentProps<typeof Ionicons>["name"];

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
  categorie: Categorie;
  /** null tant qu'aucun signalement n'est vérifié */
  prixMoyen: number | null;
  prixMin: number | null;
  prixMax: number | null;
  unite: Unite;
  /** signalements vérifiés */
  nbSignalements: number;
  /** signalements encore à confirmer */
  nbEnAttente: number;
  derniereMAJ: string;
}

// ─── Type de point de vente ────────────────────────────────
export type TypeLieu =
  | "marche_traditionnel"
  | "supermarche"
  | "boutique_quartier"
  | "vendeur_ambulant"
  | "station_service"
  | "bord_route"
  | "gare_routiere"
  | "autre";

export const TYPES_LIEU: { id: TypeLieu; label: string; icone: NomIcone }[] = [
  { id: "marche_traditionnel", label: "Marché traditionnel", icone: "storefront-outline" },
  { id: "supermarche",         label: "Supermarché",         icone: "cart-outline" },
  { id: "boutique_quartier",   label: "Boutique de quartier",icone: "home-outline" },
  { id: "vendeur_ambulant",    label: "Vendeur ambulant",    icone: "walk-outline" },
  { id: "bord_route",          label: "Bord de route",       icone: "trail-sign-outline" },
  { id: "station_service",     label: "Station-service",     icone: "speedometer-outline" },
  { id: "gare_routiere",       label: "Gare / arrêt",        icone: "bus-outline" },
  { id: "autre",               label: "Autre",               icone: "location-outline" },
];

export function infoTypeLieu(type: string) {
  return TYPES_LIEU.find((t) => t.id === type) ?? TYPES_LIEU[TYPES_LIEU.length - 1];
}

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
