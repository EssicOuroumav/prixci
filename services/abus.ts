import { supabase } from "./auth";

// ============================================================
// SIGNALEMENT DE CONTENUS ABUSIFS
// Les lignes sont traitées par l'équipe dans le tableau de bord Supabase.
// ============================================================

export const MOTIFS_ABUS = [
  "Prix manifestement faux",
  "Nom de lieu injurieux ou diffamatoire",
  "Contenu sans rapport",
] as const;

/** Nécessite le réseau. Un même compte ne peut signaler qu'une fois la même cible. */
export async function signalerAbus(
  cibleType: "signalement" | "enseigne",
  cibleId: string,
  motif: string
): Promise<void> {
  const { error } = await supabase
    .from("abus")
    .insert({ cible_type: cibleType, cible_id: cibleId, motif });
  // 23505 : déjà signalé par ce compte, on le traite comme un succès
  if (error && error.code !== "23505") throw new Error(error.message);
}
