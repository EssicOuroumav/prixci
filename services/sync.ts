import * as Network from "expo-network";
import { supabase } from "./auth";
import {
  getUnsyncedSignalements,
  markSignalementSynced,
  getUnsyncedValidations,
  upsertSignalementsFromServer,
} from "./db";
import { Signalement } from "@/constants/types";

// ============================================================
// SERVICE DE SYNCHRONISATION OFFLINE-FIRST
// ============================================================

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline";

let syncInProgress = false;

/**
 * Point d'entrée principal.
 * Appelé au démarrage de l'app et à chaque retour en foreground.
 * Silencieux : ne bloque jamais l'UI.
 */
export async function syncIfOnline(
  commune?: string,
  onStatusChange?: (status: SyncStatus) => void
): Promise<void> {
  if (syncInProgress) return;

  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || !network.isInternetReachable) {
    onStatusChange?.("offline");
    return;
  }

  syncInProgress = true;
  onStatusChange?.("syncing");

  try {
    await Promise.all([
      pushUnsyncedSignalements(),
      pushUnsyncedValidations(),
    ]);

    if (commune) {
      await pullSignalementsFromServer(commune);
    }

    onStatusChange?.("success");
  } catch (err) {
    console.warn("[Sync] Échec silencieux :", err);
    onStatusChange?.("error");
  } finally {
    syncInProgress = false;
  }
}

// ─── PUSH : envoyer les données locales non synchronisées ──

async function pushUnsyncedSignalements(): Promise<void> {
  const unsynced = await getUnsyncedSignalements();
  if (unsynced.length === 0) return;

  const payload = unsynced.map(signalementToRow);

  // Batch insert par lots de 20 pour éviter les timeouts
  const BATCH_SIZE = 20;
  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const batch = payload.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("signalements")
      .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

    if (!error) {
      // Marquer comme syncés
      for (const s of unsynced.slice(i, i + BATCH_SIZE)) {
        await markSignalementSynced(s.id);
      }
    } else {
      console.warn("[Sync] Erreur push signalements :", error.message);
    }
  }
}

async function pushUnsyncedValidations(): Promise<void> {
  const unsynced = await getUnsyncedValidations();
  if (unsynced.length === 0) return;

  const payload = unsynced.map((v) => ({
    id: v.id,
    signalement_id: v.signalementId,
    user_id: v.userId,
    vote: v.vote,
    date_vote: v.dateVote,
  }));

  const { error } = await supabase
    .from("validations")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: true });

  if (error) {
    console.warn("[Sync] Erreur push validations :", error.message);
  }
}

// ─── PULL : récupérer les données du serveur ───────────────

async function pullSignalementsFromServer(commune: string): Promise<void> {
  const depuis = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("signalements")
    .select("*")
    .eq("commune", commune)
    .gte("date_signalement", depuis)
    .gte("score_fiabilite", 30)
    .order("date_signalement", { ascending: false })
    .limit(500);

  if (error || !data) {
    console.warn("[Sync] Erreur pull :", error?.message);
    return;
  }

  const signalements: Signalement[] = data.map(rowToSignalement);
  await upsertSignalementsFromServer(signalements);
}

// ─── Mappers ──────────────────────────────────────────────

function signalementToRow(s: Signalement): Record<string, unknown> {
  return {
    id: s.id,
    user_id: s.userId,
    produit_id: s.produitId,
    produit_nom: s.produitNom,
    categorie: s.categorie,
    sous_categorie: s.sousCategorie,
    prix: s.prix,
    unite: s.unite,
    commune: s.commune,
    quartier: s.quartier,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    date_signalement: s.dateSignalement,
    score_fiabilite: s.scoreFilabilite,
    nb_confirmations: s.nbConfirmations,
    nb_contestations: s.nbContestations,
  };
}

function rowToSignalement(r: Record<string, any>): Signalement {
  return {
    id: r.id,
    userId: r.user_id,
    produitId: r.produit_id,
    produitNom: r.produit_nom,
    categorie: r.categorie,
    sousCategorie: r.sous_categorie,
    prix: r.prix,
    unite: r.unite,
    commune: r.commune,
    quartier: r.quartier ?? "",
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    dateSignalement: r.date_signalement,
    scoreFilabilite: r.score_fiabilite,
    nbConfirmations: r.nb_confirmations,
    nbContestations: r.nb_contestations,
    synced: true,
    createdAt: r.created_at ?? r.date_signalement,
  };
}
