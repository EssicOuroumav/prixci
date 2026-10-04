import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Exécute les scripts SQL dans un Postgres embarqué qui imite Supabase
// (rôles anon / authenticated, auth.uid()) puis vérifie droits, votes et enseignes.
// Lancer avec : npm run test:sql
const P = fileURLToPath(new URL("../", import.meta.url));
const db = new PGlite();
let echecs = 0;
const ok = (nom, cond, detail = "") => { console.log(cond ? "OK   " : "ÉCHEC", nom, detail); if (!cond) echecs++; };

// ── Imitation minimale de l'environnement Supabase ──
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
    $$ SELECT current_user::text $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
`);
for (const f of ["supabase_schema.sql", "supabase_migration_sprint3.sql", "supabase_migration_v2.sql", "supabase_migration_v2.sql"]) {
  try { await db.exec(readFileSync(P + f, "utf8")); ok("script exécuté : " + f, true); }
  catch (e) { ok("script exécuté : " + f, false, e.message); }
}

const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222", C = "33333333-3333-3333-3333-333333333333";
const en = async (uid, sql, params) => {
  await db.exec(`RESET ROLE; SET request.jwt.claim.sub = '${uid ?? ""}'; SET ROLE ${uid ? "authenticated" : "anon"};`);
  try { return await db.query(sql, params); } finally { await db.exec("RESET ROLE"); }
};
const refuse = async (nom, uid, sql, params) => {
  try { const r = await en(uid, sql, params); ok(nom, r.affectedRows === 0, "(0 ligne touchée)"); }
  catch (e) { ok(nom, true, "→ " + e.message.slice(0, 70)); }
};
const admin = (sql, p) => db.query(sql, p);

// ── Profils : comme pushUserProfile (INSERT … ON CONFLICT DO NOTHING) ──
for (const u of [A, B, C])
  await en(u, `INSERT INTO users (id, pseudonyme, score_confiance, date_creation) VALUES ($1, 'p', 99, NOW()) ON CONFLICT (id) DO NOTHING`, [u]);
ok("profil : le score envoyé (99) est remplacé par 50", (await admin(`SELECT score_confiance FROM users WHERE id=$1`, [A])).rows[0].score_confiance === 50);
await refuse("profil : impossible de modifier son propre score", A, `UPDATE users SET score_confiance = 100 WHERE id = $1`, [A]);
await refuse("profil : impossible de créer le profil d'un autre", A, `INSERT INTO users (id, pseudonyme, date_creation) VALUES ('44444444-4444-4444-4444-444444444444','x',NOW())`);

// ── Signalement : comme sync.ts (avec lieu, sans score ni compteurs) ──
const ins = `INSERT INTO signalements (id,user_id,produit_id,produit_nom,categorie,sous_categorie,prix,unite,commune,quartier,type_lieu,nom_lieu,latitude,longitude,date_signalement)
  VALUES ($1,$2,'tomate','Tomate','alimentation','legumes_fruits',300,'kg','Yopougon','Siporex',$3,'Marché Siporex',NULL,NULL,NOW()) ON CONFLICT (id) DO NOTHING`;
await en(A, ins, ["s1", A, "marche_traditionnel"]);
let s = (await admin(`SELECT * FROM signalements WHERE id='s1'`)).rows[0];
ok("signalement : lieu enregistré", s.type_lieu === "marche_traditionnel" && s.nom_lieu === "Marché Siporex");
ok("signalement : score initial = 60 % de 50 = 30", Number(s.score_fiabilite) === 30);
ok("signalement : compteur de l'auteur incrémenté", (await admin(`SELECT nb_signalements FROM users WHERE id=$1`, [A])).rows[0].nb_signalements === 1);
await en(A, ins, ["s1", A, "marche_traditionnel"]);
ok("signalement : renvoi du même identifiant sans doublon ni double comptage", (await admin(`SELECT nb_signalements FROM users WHERE id=$1`, [A])).rows[0].nb_signalements === 1);
await en(A, ins, ["s2", A, "gare_routiere"]);
ok("signalement : type de lieu gare_routiere accepté", (await admin(`SELECT COUNT(*)::int n FROM signalements`)).rows[0].n === 2);
await refuse("signalement : impossible de signaler au nom d'un autre", B, ins, ["s3", A, "autre"]);
await refuse("signalement : compteurs forgés ignorés ou refusés", B, `UPDATE signalements SET nb_confirmations = 50 WHERE id='s1'`);

// ── Votes ──
const vote = `INSERT INTO validations (id, signalement_id, user_id, vote, date_vote) VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (id) DO NOTHING`;
await en(B, vote, ["v1", "s1", B, "confirme"]);
s = (await admin(`SELECT * FROM signalements WHERE id='s1'`)).rows[0];
ok("vote : confirmation → 1 confirmation, score 35", s.nb_confirmations === 1 && Number(s.score_fiabilite) === 35);
let ua = (await admin(`SELECT * FROM users WHERE id=$1`, [A])).rows[0], ub = (await admin(`SELECT * FROM users WHERE id=$1`, [B])).rows[0];
ok("vote : auteur +3 (53) et 1 confirmation reçue, votant +1 (51)", ua.score_confiance === 53 && ua.nb_validations_recues === 1 && ub.score_confiance === 51);
await en(C, vote, ["v2", "s1", C, "conteste"]);
s = (await admin(`SELECT * FROM signalements WHERE id='s1'`)).rows[0];
ua = (await admin(`SELECT * FROM users WHERE id=$1`, [A])).rows[0];
ok("vote : contestation → score 27, auteur −5 (48)", s.nb_contestations === 1 && Number(s.score_fiabilite) === 27 && ua.score_confiance === 48);
await refuse("vote : interdit sur son propre signalement", A, vote, ["v3", "s1", A, "confirme"]);
await refuse("vote : un seul vote par personne", B, vote, ["v4", "s1", B, "confirme"]);
await refuse("vote : impossible de voter au nom d'un autre", B, vote, ["v5", "s2", C, "confirme"]);

// ── Visibilité ──
ok("lecture : signalement à 27 masqué pour les autres", (await en(B, `SELECT id FROM signalements WHERE id='s1'`)).rows.length === 0);
ok("lecture : mais toujours visible par son auteur", (await en(A, `SELECT id FROM signalements WHERE id='s1'`)).rows.length === 1);

// ── Enseignes ──
const e = await en(A, `INSERT INTO enseignes (nom,type,commune,quartier,adresse,telephone,email) VALUES ('Boutique A','boutique','Yopougon','','','','') RETURNING *`);
const eid = e.rows[0].id;
ok("enseigne : propriétaire fixé par le serveur", e.rows[0].owner_id === A && e.rows[0].statut === "actif");
ok("enseigne : lisible sans compte (plus de « permission denied »)", (await en(null, `SELECT id FROM enseignes`)).rows.length === 1);
await refuse("enseigne : impossible de choisir le propriétaire", B, `INSERT INTO enseignes (nom,type,commune,owner_id) VALUES ('X','boutique','Abobo',$1)`, [A]);
await refuse("enseigne : inscription refusée sans compte", null, `INSERT INTO enseignes (nom,type,commune) VALUES ('Y','boutique','Abobo')`);
await refuse("enseigne : un autre compte ne peut pas la modifier", B, `UPDATE enseignes SET nom='Piratée' WHERE id=$1`, [eid]);
await refuse("enseigne : le propriétaire ne peut pas changer son statut", A, `UPDATE enseignes SET statut='actif' WHERE id=$1`, [eid]);

const up = `INSERT INTO prix_officiels (enseigne_id,produit_id,produit_nom,categorie,prix,unite,date_mise_a_jour) VALUES ($1,'tomate','Tomate','alimentation',$2,'kg',NOW())
  ON CONFLICT (enseigne_id,produit_id,unite) DO UPDATE SET prix = EXCLUDED.prix, date_mise_a_jour = EXCLUDED.date_mise_a_jour`;
await en(A, up, [eid, 400]);
await en(A, up, [eid, 450]);
const po = (await admin(`SELECT * FROM prix_officiels`)).rows;
ok("prix officiel : publication puis mise à jour sans doublon", po.length === 1 && Number(po[0].prix) === 450);
await refuse("prix officiel : un autre compte ne peut pas publier pour cette enseigne", B, up, [eid, 1]);
await refuse("prix officiel : un autre compte ne peut pas supprimer", B, `DELETE FROM prix_officiels WHERE enseigne_id=$1`, [eid]);
ok("prix officiel : le prix est resté à 450", Number((await admin(`SELECT prix FROM prix_officiels`)).rows[0].prix) === 450);
ok("prix officiel : le propriétaire peut supprimer", (await en(A, `DELETE FROM prix_officiels WHERE enseigne_id=$1`, [eid])).affectedRows === 1);

// ── Abus ──
await en(B, `INSERT INTO abus (cible_type,cible_id,motif) VALUES ('signalement','s1','Prix manifestement faux')`);
ok("abus : enregistré avec son auteur", (await admin(`SELECT auteur_id FROM abus`)).rows[0].auteur_id === B);
await refuse("abus : illisible par les utilisateurs", B, `SELECT * FROM abus`);

console.log(`\n${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
