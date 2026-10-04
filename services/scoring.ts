// ============================================================
// LOGIQUE DE SCORE DE CONFIANCE — TYPE WAZE
// ============================================================

import { NomIcone } from "@/constants/types";

/**
 * Nombre de confirmations à partir duquel un signalement est « vérifié » :
 * il entre alors dans les moyennes, les comparaisons et les graphiques.
 * En dessous, il reste dans la file « À confirmer » où la communauté vote.
 */
export const SEUIL_CONFIRMATIONS = 10;

export function estVerifie(nbConfirmations: number): boolean {
  return nbConfirmations >= SEUIL_CONFIRMATIONS;
}

/**
 * Score de fiabilité d'un signalement. Règle unique, appliquée à l'identique
 * par l'application et par le serveur (voir supabase_migration_v2.sql) :
 * - départ : 60 % du score de confiance de l'auteur
 * - chaque confirmation : +5
 * - chaque contestation : -8
 * - borné entre 0 et 100
 */
export const DELTA_FIABILITE = { confirme: 5, conteste: -8 } as const;

export function scoreInitialSignalement(scoreAuteur: number): number {
  return Math.round(scoreAuteur * 0.6);
}

export function scoreApresVote(
  score: number,
  vote: "confirme" | "conteste"
): number {
  return Math.max(0, Math.min(100, score + DELTA_FIABILITE[vote]));
}

/**
 * Delta de score utilisateur après une validation reçue.
 * Appliqué à l'auteur du signalement quand quelqu'un vote.
 */
export function deltaScoreApresValidation(vote: "confirme" | "conteste"): number {
  return vote === "confirme" ? +3 : -5;
}

/**
 * Delta de score utilisateur quand il valide le signalement d'un autre.
 * Récompense la participation communautaire.
 */
export const DELTA_SCORE_POUR_VALIDATION_DONNEE = +1;

/**
 * Seuils d'affichage et de confiance.
 */
export const SEUILS = {
  AFFICHAGE_PUBLIC: 30,      // Score minimum pour apparaître dans la liste
  FIABLE: 60,                // Score à partir duquel on affiche "fiable"
  TRES_FIABLE: 80,           // Score à partir duquel on affiche "très fiable"
  SCORE_INITIAL_USER: 50,    // Score de départ d'un nouvel utilisateur
  MIN: 0,
  MAX: 100,
};

/**
 * Label lisible selon le score.
 */
export function labelScoreFilabilite(score: number): {
  label: string;
  couleur: string;
} {
  if (score >= SEUILS.TRES_FIABLE) return { label: "Très fiable", couleur: "#0A5F38" };
  if (score >= SEUILS.FIABLE)      return { label: "Fiable",      couleur: "#2E8B57" };
  if (score >= SEUILS.AFFICHAGE_PUBLIC) return { label: "À vérifier", couleur: "#D4820A" };
  return { label: "Non fiable", couleur: "#C0392B" };
}

/**
 * Label du badge utilisateur selon son score de confiance.
 */
export function labelScoreUser(score: number): {
  label: string;
  icone: NomIcone;
  couleur: string;
} {
  if (score >= 90) return { label: "Expert citoyen",     icone: "trophy",           couleur: "#0A5F38" };
  if (score >= 70) return { label: "Contributeur actif", icone: "star",             couleur: "#2E8B57" };
  if (score >= 50) return { label: "Membre",             icone: "checkmark-circle", couleur: "#4A90A4" };
  if (score >= 30) return { label: "Débutant",           icone: "ellipse-outline",  couleur: "#888888" };
  return { label: "Non fiable", icone: "warning", couleur: "#C0392B" };
}
