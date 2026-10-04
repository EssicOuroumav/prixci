import * as SQLite from "expo-sqlite";
import { Signalement, Validation, UserProfile } from "@/constants/types";
import { SEUIL_CONFIRMATIONS, SEUILS, DELTA_FIABILITE } from "./scoring";

// ============================================================
// SERVICE BASE DE DONNÉES LOCALE — SQLite (expo-sqlite v14)
// ============================================================

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("prixci.db");
  await initSchema(db);
  return db;
}

// ─── Initialisation du schéma ──────────────────────────────
async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      pseudonyme TEXT NOT NULL,
      score_confiance INTEGER NOT NULL DEFAULT 50,
      nb_signalements INTEGER NOT NULL DEFAULT 0,
      nb_validations_recues INTEGER NOT NULL DEFAULT 0,
      date_creation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signalements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      produit_id TEXT NOT NULL,
      produit_nom TEXT NOT NULL,
      categorie TEXT NOT NULL,
      sous_categorie TEXT NOT NULL,
      prix REAL NOT NULL,
      unite TEXT NOT NULL,
      commune TEXT NOT NULL,
      quartier TEXT NOT NULL DEFAULT '',
      type_lieu TEXT NOT NULL DEFAULT 'autre',
      nom_lieu TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      date_signalement TEXT NOT NULL,
      score_fiabilite REAL NOT NULL DEFAULT 50,
      nb_confirmations INTEGER NOT NULL DEFAULT 0,
      nb_contestations INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS validations (
      id TEXT PRIMARY KEY,
      signalement_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote TEXT NOT NULL CHECK(vote IN ('confirme', 'conteste')),
      date_vote TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (signalement_id) REFERENCES signalements(id)
    );

    CREATE INDEX IF NOT EXISTS idx_signalements_commune
      ON signalements(commune);
    CREATE INDEX IF NOT EXISTS idx_signalements_produit
      ON signalements(produit_id);
    CREATE INDEX IF NOT EXISTS idx_signalements_synced
      ON signalements(synced);
    CREATE INDEX IF NOT EXISTS idx_validations_signalement
      ON validations(signalement_id);
  `);
}

// ─── USERS ─────────────────────────────────────────────────

export async function saveUser(user: UserProfile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO users
      (id, pseudonyme, score_confiance, nb_signalements, nb_validations_recues, date_creation)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.pseudonyme,
      user.scoreConfiance,
      user.nbSignalements,
      user.nbValidationsRecues,
      user.dateCreation,
    ]
  );
}

export async function getUser(id: string): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );
  if (!row) return null;
  return rowToUser(row);
}

export async function updateUserScore(
  userId: string,
  delta: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE users SET
      score_confiance = MAX(0, MIN(100, score_confiance + ?))
     WHERE id = ?`,
    [delta, userId]
  );
}

// ─── SIGNALEMENTS ──────────────────────────────────────────

export async function insertSignalement(s: Signalement): Promise<void> {
  const db = await getDb();
  await insertSignalementBrut(s);
  // Incrémenter le compteur utilisateur
  await db.runAsync(
    "UPDATE users SET nb_signalements = nb_signalements + 1 WHERE id = ?",
    [s.userId]
  );
}

/** Insertion sans toucher au compteur de l'auteur (données venues du serveur). */
async function insertSignalementBrut(s: Signalement): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO signalements
      (id, user_id, produit_id, produit_nom, categorie, sous_categorie,
       prix, unite, commune, quartier, type_lieu, nom_lieu,
       latitude, longitude, date_signalement, score_fiabilite,
       nb_confirmations, nb_contestations, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.id, s.userId, s.produitId, s.produitNom, s.categorie,
      s.sousCategorie, s.prix, s.unite, s.commune, s.quartier,
      s.typeLieu, s.nomLieu,
      s.latitude ?? null, s.longitude ?? null, s.dateSignalement,
      s.scoreFilabilite, s.nbConfirmations, s.nbContestations,
      s.synced ? 1 : 0, s.createdAt,
    ]
  );
}

/** Signalements de l'utilisateur, du plus récent au plus ancien. */
export async function getMesSignalements(
  userId: string,
  limit = 30
): Promise<Signalement[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM signalements
     WHERE user_id = ?
     ORDER BY date_signalement DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows.map(rowToSignalement);
}

export async function getSignalementsByCommune(
  commune: string,
  limit = 100
): Promise<Signalement[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM signalements
     WHERE commune = ?
     ORDER BY date_signalement DESC
     LIMIT ?`,
    [commune, limit]
  );
  return rows.map(rowToSignalement);
}

export async function getSignalementsByProduit(
  produitId: string,
  commune?: string
): Promise<Signalement[]> {
  const db = await getDb();
  const query = commune
    ? `SELECT * FROM signalements WHERE produit_id = ? AND commune = ? ORDER BY date_signalement DESC LIMIT 50`
    : `SELECT * FROM signalements WHERE produit_id = ? ORDER BY date_signalement DESC LIMIT 50`;
  const params = commune ? [produitId, commune] : [produitId];
  const rows = await db.getAllAsync<any>(query, params);
  return rows.map(rowToSignalement);
}

export async function getUnsyncedSignalements(): Promise<Signalement[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM signalements WHERE synced = 0 ORDER BY created_at ASC"
  );
  return rows.map(rowToSignalement);
}

export async function markSignalementSynced(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE signalements SET synced = 1 WHERE id = ?",
    [id]
  );
}

export async function upsertSignalementsFromServer(
  signalements: Signalement[]
): Promise<void> {
  const db = await getDb();
  for (const s of signalements) {
    const existing = await db.getFirstAsync<any>(
      "SELECT synced FROM signalements WHERE id = ?",
      [s.id]
    );
    if (!existing) {
      await insertSignalementBrut({ ...s, synced: true });
    } else if (existing.synced === 1) {
      // Déjà connu du serveur : reprendre les votes des autres utilisateurs.
      // MAX sur les compteurs pour ne pas perdre un vote local pas encore envoyé.
      await db.runAsync(
        `UPDATE signalements SET
          nb_confirmations = MAX(nb_confirmations, ?),
          nb_contestations = MAX(nb_contestations, ?),
          score_fiabilite = ?
         WHERE id = ?`,
        [s.nbConfirmations, s.nbContestations, s.scoreFilabilite, s.id]
      );
    }
  }
}

// ─── VALIDATIONS ──────────────────────────────────────────

export async function insertValidation(v: Validation): Promise<void> {
  const db = await getDb();
  // Vérifier doublon
  const existing = await db.getFirstAsync<any>(
    "SELECT id FROM validations WHERE signalement_id = ? AND user_id = ?",
    [v.signalementId, v.userId]
  );
  if (existing) throw new Error("Tu as déjà voté pour ce signalement.");

  await db.runAsync(
    `INSERT INTO validations
      (id, signalement_id, user_id, vote, date_vote, synced)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [v.id, v.signalementId, v.userId, v.vote, v.dateVote, v.synced ? 1 : 0]
  );

  // Mettre à jour les compteurs du signalement (même règle que le serveur)
  const colonne = v.vote === "confirme" ? "nb_confirmations" : "nb_contestations";
  await db.runAsync(
    `UPDATE signalements SET
      ${colonne} = ${colonne} + 1,
      score_fiabilite = MAX(0, MIN(100, score_fiabilite + ?))
     WHERE id = ?`,
    [DELTA_FIABILITE[v.vote], v.signalementId]
  );
}

export async function markValidationsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const marques = ids.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE validations SET synced = 1 WHERE id IN (${marques})`,
    ids
  );
}

/**
 * Rattache les données saisies hors ligne (compte provisoire) au compte
 * anonyme créé une fois le réseau revenu.
 */
export async function reassignerUtilisateur(
  ancienId: string,
  nouveauId: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE signalements SET user_id = ? WHERE user_id = ?",
    [nouveauId, ancienId]
  );
  await db.runAsync(
    "UPDATE validations SET user_id = ? WHERE user_id = ?",
    [nouveauId, ancienId]
  );
  await db.runAsync("DELETE FROM users WHERE id = ?", [ancienId]);
}

export async function getUserValidations(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT signalement_id FROM validations WHERE user_id = ?",
    [userId]
  );
  return rows.map((r: any) => r.signalement_id);
}

export async function getUnsyncedValidations(): Promise<Validation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM validations WHERE synced = 0"
  );
  return rows.map(rowToValidation);
}

// ─── AGRÉGATION (pour l'écran explorer) ───────────────────

export interface PrixAgregeLocal {
  produitId: string;
  produitNom: string;
  categorie: "alimentation" | "transport";
  unite: string;
  /** null tant qu'aucun signalement n'a atteint le seuil de confirmations */
  prixMoyen: number | null;
  prixMin: number | null;
  prixMax: number | null;
  /** nombre de signalements vérifiés */
  nbSignalements: number;
  /** nombre de signalements encore à confirmer */
  nbEnAttente: number;
  derniereMAJ: string;
}

/**
 * Produits signalés dans une commune sur 30 jours.
 * Les prix (moyenne, min, max) ne comptent que les signalements vérifiés.
 */
export async function getPrixAgreges(commune: string): Promise<PrixAgregeLocal[]> {
  const db = await getDb();
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT
      produit_id,
      produit_nom,
      categorie,
      unite,
      ROUND(AVG(CASE WHEN nb_confirmations >= ? THEN prix END), 0) as prix_moyen,
      MIN(CASE WHEN nb_confirmations >= ? THEN prix END) as prix_min,
      MAX(CASE WHEN nb_confirmations >= ? THEN prix END) as prix_max,
      SUM(CASE WHEN nb_confirmations >= ? THEN 1 ELSE 0 END) as nb_verifies,
      SUM(CASE WHEN nb_confirmations < ? THEN 1 ELSE 0 END) as nb_en_attente,
      MAX(date_signalement) as derniere_maj
    FROM signalements
    WHERE commune = ?
      AND date_signalement > ?
      AND score_fiabilite >= ?
    GROUP BY produit_id, unite
    ORDER BY nb_verifies DESC, nb_en_attente DESC`,
    [
      SEUIL_CONFIRMATIONS, SEUIL_CONFIRMATIONS, SEUIL_CONFIRMATIONS,
      SEUIL_CONFIRMATIONS, SEUIL_CONFIRMATIONS,
      commune, depuis, SEUILS.AFFICHAGE_PUBLIC,
    ]
  );
  return rows.map((r: any) => ({
    produitId: r.produit_id,
    produitNom: r.produit_nom,
    categorie: r.categorie,
    unite: r.unite,
    prixMoyen: r.prix_moyen ?? null,
    prixMin: r.prix_min ?? null,
    prixMax: r.prix_max ?? null,
    nbSignalements: r.nb_verifies ?? 0,
    nbEnAttente: r.nb_en_attente ?? 0,
    derniereMAJ: r.derniere_maj,
  }));
}

export interface PointDeVente {
  /** signalement vérifié le plus récent du lieu, pour ouvrir le détail */
  signalementId?: string;
  typeLieu: string;
  nomLieu: string;
  commune: string;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  unite: string;
  nbSignalements: number;
  derniereMAJ: string;
}

/**
 * Comparaison d'un produit entre points de vente dans une commune.
 * Ne compte que les signalements vérifiés (seuil de confirmations atteint).
 */
export async function getPrixParPointDeVente(
  produitId: string,
  commune: string
): Promise<PointDeVente[]> {
  const db = await getDb();
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT
      s.type_lieu,
      s.nom_lieu,
      s.commune,
      s.unite,
      ROUND(AVG(s.prix), 0) as prix_moyen,
      MIN(s.prix) as prix_min,
      MAX(s.prix) as prix_max,
      COUNT(*) as nb_signalements,
      MAX(s.date_signalement) as derniere_maj,
      (SELECT s2.id FROM signalements s2
       WHERE s2.produit_id = s.produit_id
         AND s2.commune = s.commune
         AND s2.type_lieu = s.type_lieu
         AND s2.nom_lieu = s.nom_lieu
         AND s2.unite = s.unite
         AND s2.nb_confirmations >= ?
       ORDER BY s2.date_signalement DESC LIMIT 1) as dernier_signalement_id
    FROM signalements s
    WHERE s.produit_id = ?
      AND s.commune = ?
      AND s.date_signalement > ?
      AND s.score_fiabilite >= ?
      AND s.nb_confirmations >= ?
    GROUP BY s.type_lieu, s.nom_lieu, s.commune, s.unite
    ORDER BY prix_moyen ASC`,
    [
      SEUIL_CONFIRMATIONS, produitId, commune, depuis,
      SEUILS.AFFICHAGE_PUBLIC, SEUIL_CONFIRMATIONS,
    ]
  );
  return rows.map((r: any) => ({
    signalementId: r.dernier_signalement_id ?? undefined,
    typeLieu: r.type_lieu,
    nomLieu: r.nom_lieu,
    commune: r.commune,
    prixMoyen: r.prix_moyen,
    prixMin: r.prix_min,
    prixMax: r.prix_max,
    unite: r.unite,
    nbSignalements: r.nb_signalements,
    derniereMAJ: r.derniere_maj,
  }));
}

/**
 * Signalements d'un produit qui n'ont pas encore atteint le seuil de
 * confirmations : c'est la file où la communauté vote.
 */
export async function getSignalementsEnAttente(
  produitId: string,
  commune: string,
  limit = 30
): Promise<Signalement[]> {
  const db = await getDb();
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM signalements
     WHERE produit_id = ?
       AND commune = ?
       AND date_signalement > ?
       AND score_fiabilite >= ?
       AND nb_confirmations < ?
     ORDER BY date_signalement DESC
     LIMIT ?`,
    [produitId, commune, depuis, SEUILS.AFFICHAGE_PUBLIC, SEUIL_CONFIRMATIONS, limit]
  );
  return rows.map(rowToSignalement);
}

/**
 * Recherche de produits par nom (autocomplétion Explorer).
 */
export async function rechercherProduitsSaisis(
  terme: string,
  commune?: string
): Promise<{ produitId: string; produitNom: string; nbSignalements: number }[]> {
  const db = await getDb();
  const query = commune
    ? `SELECT produit_id, produit_nom, COUNT(*) as nb
       FROM signalements
       WHERE produit_nom LIKE ? AND commune = ?
       GROUP BY produit_id ORDER BY nb DESC LIMIT 20`
    : `SELECT produit_id, produit_nom, COUNT(*) as nb
       FROM signalements
       WHERE produit_nom LIKE ?
       GROUP BY produit_id ORDER BY nb DESC LIMIT 20`;
  const params = commune ? [`%${terme}%`, commune] : [`%${terme}%`];
  const rows = await db.getAllAsync<any>(query, params);
  return rows.map((r: any) => ({
    produitId: r.produit_id,
    produitNom: r.produit_nom,
    nbSignalements: r.nb,
  }));
}

// ─── DÉTAIL SIGNALEMENT ───────────────────────────────────

/**
 * Récupère un signalement par son ID avec son auteur.
 */
export async function getSignalementDetail(id: string): Promise<{
  signalement: Signalement;
  auteurPseudonyme: string;
  auteurScore: number;
} | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT s.*, u.pseudonyme, u.score_confiance
     FROM signalements s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [id]
  );
  if (!row) return null;
  return {
    signalement: rowToSignalement(row),
    auteurPseudonyme: row.pseudonyme ?? "Anonyme",
    auteurScore: row.score_confiance ?? 50,
  };
}

/**
 * Évolution du prix d'un produit sur 30 jours dans une commune.
 * Groupé par semaine pour lisibilité.
 * Retourne les points triés du plus ancien au plus récent.
 */
export async function getEvolutionPrix(
  produitId: string,
  commune: string,
  typeLieu?: string
): Promise<{
  date: string;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  nbSignalements: number;
}[]> {
  const db = await getDb();
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const whereTypeLieu = typeLieu ? "AND type_lieu = ?" : "";
  const params: any[] = typeLieu
    ? [produitId, commune, depuis, typeLieu]
    : [produitId, commune, depuis];

  // Groupement par jour (SQLite : substr sur ISO date)
  const rows = await db.getAllAsync<any>(
    `SELECT
      substr(date_signalement, 1, 10) as jour,
      ROUND(AVG(prix), 0)  as prix_moyen,
      MIN(prix)            as prix_min,
      MAX(prix)            as prix_max,
      COUNT(*)             as nb_signalements
    FROM signalements
    WHERE produit_id = ?
      AND commune = ?
      AND date_signalement > ?
      AND score_fiabilite >= ${SEUILS.AFFICHAGE_PUBLIC}
      AND nb_confirmations >= ${SEUIL_CONFIRMATIONS}
      ${whereTypeLieu}
    GROUP BY jour
    ORDER BY jour ASC`,
    params
  );

  return rows.map((r: any) => ({
    date: r.jour,
    prixMoyen: r.prix_moyen,
    prixMin: r.prix_min,
    prixMax: r.prix_max,
    nbSignalements: r.nb_signalements,
  }));
}

/**
 * Récupère les validations d'un signalement avec pseudonyme des votants.
 */
export async function getValidationsDetail(signalementId: string): Promise<{
  id: string;
  vote: "confirme" | "conteste";
  dateVote: string;
  votantPseudonyme: string;
  votantScore: number;
}[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT v.*, u.pseudonyme, u.score_confiance
     FROM validations v
     LEFT JOIN users u ON u.id = v.user_id
     WHERE v.signalement_id = ?
     ORDER BY v.date_vote DESC
     LIMIT 20`,
    [signalementId]
  );
  return rows.map((r: any) => ({
    id: r.id,
    vote: r.vote,
    dateVote: r.date_vote,
    votantPseudonyme: r.pseudonyme ?? "Anonyme",
    votantScore: r.score_confiance ?? 50,
  }));
}

/**
 * Tous les signalements récents d'un produit dans une commune,
 * pour afficher l'historique complet dans l'écran de détail.
 */
export async function getHistoriqueSignalements(
  produitId: string,
  commune: string,
  limit = 15
): Promise<(Signalement & { auteurPseudonyme: string })[]> {
  const db = await getDb();
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT s.*, u.pseudonyme
     FROM signalements s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.produit_id = ?
       AND s.commune = ?
       AND s.date_signalement > ?
     ORDER BY s.date_signalement DESC
     LIMIT ?`,
    [produitId, commune, depuis, limit]
  );
  return rows.map((r: any) => ({
    ...rowToSignalement(r),
    auteurPseudonyme: r.pseudonyme ?? "Anonyme",
  }));
}

// ─── Helpers de mapping ────────────────────────────────────

function rowToUser(r: any): UserProfile {
  return {
    id: r.id,
    pseudonyme: r.pseudonyme,
    scoreConfiance: r.score_confiance,
    nbSignalements: r.nb_signalements,
    nbValidationsRecues: r.nb_validations_recues,
    dateCreation: r.date_creation,
  };
}

function rowToSignalement(r: any): Signalement {
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
    quartier: r.quartier,
    typeLieu: r.type_lieu ?? "autre",
    nomLieu: r.nom_lieu ?? "",
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    dateSignalement: r.date_signalement,
    scoreFilabilite: r.score_fiabilite,
    nbConfirmations: r.nb_confirmations,
    nbContestations: r.nb_contestations,
    synced: r.synced === 1,
    createdAt: r.created_at,
  };
}

function rowToValidation(r: any): Validation {
  return {
    id: r.id,
    signalementId: r.signalement_id,
    userId: r.user_id,
    vote: r.vote,
    dateVote: r.date_vote,
    synced: r.synced === 1,
  };
}

/**
 * Supprime les données de démonstration qu'une ancienne version installait
 * au premier lancement. Sans effet sur une installation neuve.
 */
export async function purgerDonneesDemo(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM validations WHERE signalement_id IN
      (SELECT id FROM signalements WHERE user_id LIKE 'demo-user-%');
    DELETE FROM signalements WHERE user_id LIKE 'demo-user-%';
    DELETE FROM users WHERE id LIKE 'demo-user-%';
  `);
}

// ─── Réinitialisation (dev only) ──────────────────────────
export async function dropAllTables(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS validations;
    DROP TABLE IF EXISTS signalements;
    DROP TABLE IF EXISTS users;
  `);
}
