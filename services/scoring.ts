// ============================================================
// LOGIQUE DE SCORE DE CONFIANCE — TYPE WAZE
// ============================================================

/**
 * Calcule le score de fiabilité d'un signalement
 * basé sur le score de l'auteur et les votes communautaires.
 *
 * Formule :
 * - 40% poids de l'auteur (son score de confiance)
 * - 60% ratio de confirmations communautaires
 * - Minimum 3 votes pour influer significativement
 */
export function calculerScoreSignalement(
  scoreAuteur: number,      // 0-100
  nbConfirmations: number,
  nbContestations: number
): number {
  const totalVotes = nbConfirmations + nbContestations;

  if (totalVotes === 0) {
    // Aucun vote : score basé uniquement sur l'auteur
    return Math.round(scoreAuteur * 0.6);
  }

  const ratioConfirmations = nbConfirmations / totalVotes;
  const poidsAuteur = scoreAuteur / 100;

  // Facteur de confiance qui augmente avec le volume de votes
  const facteurVolume = Math.min(1, totalVotes / 5);

  const score =
    poidsAuteur * 0.4 * 100 +
    ratioConfirmations * 0.6 * 100 * facteurVolume +
    scoreAuteur * 0.6 * (1 - facteurVolume);

  return Math.round(Math.max(0, Math.min(100, score)));
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
  emoji: string;
  couleur: string;
} {
  if (score >= 90) return { label: "Expert citoyen",   emoji: "🏆", couleur: "#0A5F38" };
  if (score >= 70) return { label: "Contributeur actif", emoji: "⭐", couleur: "#2E8B57" };
  if (score >= 50) return { label: "Membre",           emoji: "✓",  couleur: "#4A90A4" };
  if (score >= 30) return { label: "Débutant",         emoji: "○",  couleur: "#888888" };
  return { label: "Non fiable", emoji: "⚠", couleur: "#C0392B" };
}
