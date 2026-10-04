import * as Network from "expo-network";
import { supabase, getSessionUserId, pushUserProfile } from "./auth";
import {
  getUnsyncedSignalements,
  markSignalementSynced,
  getUnsyncedValidations,
  markValidationsSynced,
  upsertSignalementsFromServer,
  getUser,
  saveUser,
  saveReferences,
  getReferences,
} from "./db";
import { chargerReferences, PrixReference } from "./reference";
import { SEUILS } from "./scoring";
import { Signalement } from "@/constants/types";
import { useAppStore } from "@/stores/useAppStore";

// ============================================================
// SERVICE DE SYNCHRONISATION OFFLINE-FIRST
// ============================================================

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline";

let syncInProgress = false;

/**
 * Point d'entrée principal.
 * Silencieux : ne bloque jamais l'UI.
 */
export async function syncIfOnline(
  commune?: string,
  onStatusChange?: (status: SyncStatus) => void
): Promise<void> {
  if (syncInProgress) return;

  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) {
    onStatusChange?.("offline");
    return;
  }

  // Sans session Supabase (compte créé hors ligne), rien ne peut être envoyé
  const userId = await getSessionUserId();
  if (!userId) {
    onStatusChange?.("offline");
    return;
  }

  syncInProgress = true;
  onStatusChange?.("syncing");

  try {
    // Le profil doit exister côté serveur avant les signalements (clé étrangère)
    const user = await getUser(userId);
    if (user) await pushUserProfile(user);

    // Les signalements d'abord : les votes y font référence
    const signalementsOk = await pushUnsyncedSignalements();
    const validationsOk = await pushUnsyncedValidations();

    if (commune) await pullSignalementsFromServer(commune);
    await pullUserProfile(userId);
    await pullPrixReference();

    onStatusChange?.(signalementsOk && validationsOk ? "success" : "error");
  } catch (err) {
    console.warn("[Sync] Échec silencieux :", err);
    onStatusChange?.("error");
  } finally {
    syncInProgress = false;
  }
}

/**
 * Lance une synchronisation branchée sur le store global :
 * met à jour l'indicateur d'état puis le profil affiché.
 */
export async function syncAvecStore(): Promise<void> {
  const { communeSelectionnee, setSyncStatus, setLastSyncAt } =
    useAppStore.getState();

  await syncIfOnline(communeSelectionnee, (status) => {
    setSyncStatus(status);
    if (status === "success") setLastSyncAt(new Date().toISOString());
  });

  const { user, setUser } = useAppStore.getState();
  if (user) {
    const aJour = await getUser(user.id);
    if (aJour) setUser(aJour);
  }
}

// ─── PUSH : envoyer les données locales non synchronisées ──

async function pushUnsyncedSignalements(): Promise<boolean> {
  const unsynced = await getUnsyncedSignalements();
  if (unsynced.length === 0) return true;

  let toutEnvoye = true;

  // Lots de 20 pour éviter les timeouts
  const BATCH_SIZE = 20;
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const lot = unsynced.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("signalements")
      .upsert(lot.map(signalementToRow), {
        onConflict: "id",
        ignoreDuplicates: true,
      });

    if (!error) {
      for (const s of lot) await markSignalementSynced(s.id);
      continue;
    }

    // Un seul signalement refusé (limite anti-abus, doublon) fait échouer le lot :
    // on renvoie un par un pour ne pas bloquer les autres.
    for (const s of lot) {
      const { error: erreurLigne } = await supabase
        .from("signalements")
        .upsert(signalementToRow(s), { onConflict: "id", ignoreDuplicates: true });

      if (!erreurLigne || REFUS_DEFINITIFS.includes(erreurLigne.code)) {
        await markSignalementSynced(s.id);
      } else {
        toutEnvoye = false;
        console.warn("[Sync] Erreur push signalement :", erreurLigne.message);
      }
    }
  }
  return toutEnvoye;
}

async function pushUnsyncedValidations(): Promise<boolean> {
  const unsynced = await getUnsyncedValidations();
  if (unsynced.length === 0) return true;

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

  if (!error) {
    await markValidationsSynced(unsynced.map((v) => v.id));
    return true;
  }

  // Un seul vote refusé fait échouer tout le lot : on renvoie un par un
  // pour ne pas bloquer les autres.
  let toutEnvoye = true;
  for (const ligne of payload) {
    const { error: erreurLigne } = await supabase
      .from("validations")
      .upsert(ligne, { onConflict: "id", ignoreDuplicates: true });

    if (!erreurLigne || REFUS_DEFINITIFS.includes(erreurLigne.code)) {
      await markValidationsSynced([ligne.id]);
    } else {
      toutEnvoye = false;
      console.warn("[Sync] Erreur push validation :", erreurLigne.message);
    }
  }
  return toutEnvoye;
}

// Codes Postgres pour lesquels réessayer ne changera rien :
// signalement inconnu du serveur, vote en double, vote sur son propre signalement.
const REFUS_DEFINITIFS = ["23503", "23505", "P0001"];

// ─── PULL : récupérer les données du serveur ───────────────

async function pullSignalementsFromServer(commune: string): Promise<void> {
  // 30 jours : la même fenêtre que les moyennes affichées
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("signalements")
    .select("*")
    .eq("commune", commune)
    .gte("date_signalement", depuis)
    .gte("score_fiabilite", SEUILS.AFFICHAGE_PUBLIC)
    .order("date_signalement", { ascending: false })
    .limit(500);

  if (error || !data) {
    console.warn("[Sync] Erreur pull :", error?.message);
    return;
  }

  await upsertSignalementsFromServer(data.map(rowToSignalement));
}

/** Le score et les compteurs du profil font foi côté serveur. */
async function pullUserProfile(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return;

  await saveUser({
    id: data.id,
    pseudonyme: data.pseudonyme,
    scoreConfiance: data.score_confiance,
    nbSignalements: data.nb_signalements,
    nbValidationsRecues: data.nb_validations_recues,
    dateCreation: data.date_creation,
  });
}

/**
 * Prix officiels en vigueur : plafonds légaux et bulletin de la semaine.
 * Ils sont gardés sur le téléphone pour rester disponibles hors ligne.
 */
async function pullPrixReference(): Promise<void> {
  const { data, error } = await supabase
    .from("prix_reference")
    .select("*")
    .order("date_debut", { ascending: true })
    .limit(2000);

  if (error || !data) return;

  const refs: PrixReference[] = data.map((r: any) => ({
    type: r.type,
    produitId: r.produit_id,
    unite: r.unite,
    ville: r.ville,
    prix: Number(r.prix),
    dateDebut: r.date_debut,
    dateFin: r.date_fin ?? null,
    source: r.source ?? "",
  }));
  await saveReferences(refs);
  chargerReferences(await getReferences());
}

/** Au démarrage : bulletin embarqué + dernière copie locale des prix officiels. */
export async function initialiserReferences(): Promise<void> {
  chargerReferences(await getReferences());
}

// ─── Mappers ──────────────────────────────────────────────

// Le score et les compteurs de votes ne sont pas envoyés : le serveur les calcule.
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
    type_lieu: s.typeLieu,
    nom_lieu: s.nomLieu,
    moment: s.moment,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    date_signalement: s.dateSignalement,
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
    prix: Number(r.prix),
    unite: r.unite,
    commune: r.commune,
    quartier: r.quartier ?? "",
    typeLieu: r.type_lieu ?? "autre",
    nomLieu: r.nom_lieu ?? "",
    moment: r.moment ?? "normal",
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    dateSignalement: r.date_signalement,
    scoreFilabilite: Number(r.score_fiabilite),
    nbConfirmations: r.nb_confirmations,
    nbContestations: r.nb_contestations,
    synced: true,
    createdAt: r.created_at ?? r.date_signalement,
  };
}
