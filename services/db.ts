import * as SQLite from "expo-sqlite";
import { Signalement, Validation, UserProfile } from "@/constants/types";

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
  // Incrémenter le compteur utilisateur
  await db.runAsync(
    "UPDATE users SET nb_signalements = nb_signalements + 1 WHERE id = ?",
    [s.userId]
  );
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
    // Ne pas écraser les signalements locaux non encore syncés
    const existing = await db.getFirstAsync<any>(
      "SELECT synced FROM signalements WHERE id = ?",
      [s.id]
    );
    if (!existing) {
      await insertSignalement({ ...s, synced: true });
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

  // Mettre à jour les compteurs du signalement
  if (v.vote === "confirme") {
    await db.runAsync(
      `UPDATE signalements SET
        nb_confirmations = nb_confirmations + 1,
        score_fiabilite = MIN(100, score_fiabilite + 5)
       WHERE id = ?`,
      [v.signalementId]
    );
  } else {
    await db.runAsync(
      `UPDATE signalements SET
        nb_contestations = nb_contestations + 1,
        score_fiabilite = MAX(0, score_fiabilite - 8)
       WHERE id = ?`,
      [v.signalementId]
    );
  }
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

export async function getPrixAgreges(commune: string): Promise<
  { produitId: string; produitNom: string; prixMoyen: number; prixMin: number; prixMax: number; unite: string; nbSignalements: number; derniereMAJ: string }[]
> {
  const db = await getDb();
  // Filtre sur les 30 derniers jours, minimum 1 signalement
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT
      produit_id,
      produit_nom,
      unite,
      ROUND(AVG(prix), 0) as prix_moyen,
      MIN(prix) as prix_min,
      MAX(prix) as prix_max,
      COUNT(*) as nb_signalements,
      MAX(date_signalement) as derniere_maj
    FROM signalements
    WHERE commune = ?
      AND date_signalement > ?
      AND score_fiabilite >= 30
    GROUP BY produit_id, unite
    ORDER BY nb_signalements DESC`,
    [commune, depuis]
  );
  return rows.map((r: any) => ({
    produitId: r.produit_id,
    produitNom: r.produit_nom,
    prixMoyen: r.prix_moyen,
    prixMin: r.prix_min,
    prixMax: r.prix_max,
    unite: r.unite,
    nbSignalements: r.nb_signalements,
    derniereMAJ: r.derniere_maj,
  }));
}

/**
 * Comparaison d'un produit entre points de vente dans une commune.
 * C'est la requête centrale de l'écran Explorer.
 */
export async function getPrixParPointDeVente(
  produitId: string,
  commune: string
): Promise<{
  typeLieu: string;
  nomLieu: string;
  commune: string;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  unite: string;
  nbSignalements: number;
  derniereMAJ: string;
  scoreFilabiliteMoyen: number;
}[]> {
  const db = await getDb();
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT
      type_lieu,
      CASE WHEN nom_lieu != '' THEN nom_lieu ELSE type_lieu END as nom_lieu,
      commune,
      unite,
      ROUND(AVG(prix), 0) as prix_moyen,
      MIN(prix) as prix_min,
      MAX(prix) as prix_max,
      COUNT(*) as nb_signalements,
      SUM(nb_confirmations) as nb_confirmations,
      SUM(nb_contestations) as nb_contestations,
      MAX(date_signalement) as derniere_maj,
      ROUND(AVG(score_fiabilite), 0) as score_fiabilite_moyen,
      (SELECT id FROM signalements s2
       WHERE s2.type_lieu = signalements.type_lieu
         AND s2.produit_id = ?
         AND s2.commune = ?
         AND s2.date_signalement > ?
       ORDER BY s2.date_signalement DESC LIMIT 1) as dernier_signalement_id,
      (SELECT user_id FROM signalements s3
       WHERE s3.type_lieu = signalements.type_lieu
         AND s3.produit_id = ?
         AND s3.commune = ?
         AND s3.date_signalement > ?
       ORDER BY s3.date_signalement DESC LIMIT 1) as dernier_user_id
    FROM signalements
    WHERE produit_id = ?
      AND commune = ?
      AND date_signalement > ?
      AND score_fiabilite >= 30
    GROUP BY type_lieu, nom_lieu, commune, unite
    ORDER BY prix_moyen ASC`,
    [produitId, commune, depuis, produitId, commune, depuis, produitId, commune, depuis]
  );
  return rows.map((r: any) => ({
    signalementId: r.dernier_signalement_id ?? undefined,
    userIdAuteur: r.dernier_user_id ?? undefined,
    typeLieu: r.type_lieu,
    nomLieu: r.nom_lieu,
    commune: r.commune,
    prixMoyen: r.prix_moyen,
    prixMin: r.prix_min,
    prixMax: r.prix_max,
    unite: r.unite,
    nbSignalements: r.nb_signalements,
    nbConfirmations: r.nb_confirmations ?? 0,
    nbContestations: r.nb_contestations ?? 0,
    derniereMAJ: r.derniere_maj,
    scoreFilabiliteMoyen: r.score_fiabilite_moyen,
  }));
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
      AND score_fiabilite >= 30
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

// ─── Réinitialisation (dev only) ──────────────────────────
export async function dropAllTables(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS validations;
    DROP TABLE IF EXISTS signalements;
    DROP TABLE IF EXISTS users;
  `);
}
