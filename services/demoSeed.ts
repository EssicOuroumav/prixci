import { Signalement, UserProfile, SousCategorie, Unite, TypeLieu } from "@/constants/types";
import { SEUIL_CONFIRMATIONS, SEUILS } from "./scoring";
import { insertSignalement, saveUser, getUser } from "./db";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// DONNÉES DE DÉMO — SEED RÉALISTE ABIDJAN
// Simule ~3 semaines de signalements citoyens dans 4 communes
// ============================================================

const DEMO_SEED_KEY = "prixci_demo_seeded";

// ─── Utilisateurs fictifs ─────────────────────────────────
const USERS_DEMO: UserProfile[] = [
  { id: "demo-user-001", pseudonyme: "VigilantBaobab12",  scoreConfiance: 78, nbSignalements: 14, nbValidationsRecues: 22, dateCreation: "2025-03-01T08:00:00.000Z" },
  { id: "demo-user-002", pseudonyme: "CitoyenNimba47",    scoreConfiance: 65, nbSignalements: 9,  nbValidationsRecues: 11, dateCreation: "2025-03-05T10:00:00.000Z" },
  { id: "demo-user-003", pseudonyme: "LibreComoé88",      scoreConfiance: 82, nbSignalements: 21, nbValidationsRecues: 34, dateCreation: "2025-02-20T09:00:00.000Z" },
  { id: "demo-user-004", pseudonyme: "AlerteSassandra33", scoreConfiance: 55, nbSignalements: 6,  nbValidationsRecues: 4,  dateCreation: "2025-03-10T14:00:00.000Z" },
  { id: "demo-user-005", pseudonyme: "SolidaireAdzopé71", scoreConfiance: 91, nbSignalements: 38, nbValidationsRecues: 67, dateCreation: "2025-01-15T07:00:00.000Z" },
];

// ─── Helper pour créer un signalement ────────────────────
function mkSignal(
  id: string,
  userId: string,
  produitId: string,
  produitNom: string,
  sousCategorie: SousCategorie,
  prix: number,
  unite: Unite,
  commune: string,
  typeLieu: TypeLieu,
  nomLieu: string,
  joursAvant: number,
  scoreFilabilite: number,
  nbConf: number,
  nbCont: number,
  categorie: "alimentation" | "transport" = "alimentation"
): Signalement {
  const date = new Date(Date.now() - joursAvant * 86400000).toISOString();
  return {
    id,
    userId,
    produitId,
    produitNom,
    categorie,
    sousCategorie,
    prix,
    unite,
    commune,
    quartier: "",
    typeLieu,
    nomLieu,
    latitude: undefined,
    longitude: undefined,
    dateSignalement: date,
    scoreFilabilite,
    // Les signalements fiables de la démo sont présentés comme déjà vérifiés ;
    // les autres restent dans la file « À confirmer ».
    nbConfirmations:
      scoreFilabilite >= SEUILS.FIABLE ? nbConf + SEUIL_CONFIRMATIONS : nbConf,
    nbContestations: nbCont,
    synced: true,
    createdAt: date,
  };
}

// ─── Signalements de démo ────────────────────────────────
// Format : mkSignal(id, userId, produitId, nom, sousCat, prix, unite,
//                   commune, typeLieu, nomLieu, joursAvant, score, conf, cont)

export const SIGNALEMENTS_DEMO: Signalement[] = [

  // ══════════════════════════════════════════════════════
  // YOPOUGON — Marché vs Supermarché vs Boutique
  // ══════════════════════════════════════════════════════

  // Tomate — 3 points de vente Yopougon
  mkSignal("d-001","demo-user-001","tomate-salade","Tomate type salade","legumes_fruits",
    300,"kg","Yopougon","marche_traditionnel","Marché Siporex",2,82,5,0),
  mkSignal("d-002","demo-user-003","tomate-salade","Tomate type salade","legumes_fruits",
    550,"kg","Yopougon","boutique_quartier","Boutique Selmer",3,65,2,1),
  mkSignal("d-003","demo-user-005","tomate-salade","Tomate type salade","legumes_fruits",
    900,"kg","Yopougon","supermarche","Sococé Yopougon",1,74,3,2),

  // Banane plantain — Yopougon
  mkSignal("d-004","demo-user-002","banane-plantain","Banane plantain","legumes_tubercules",
    250,"kg","Yopougon","marche_traditionnel","Marché Siporex",1,79,4,0),
  mkSignal("d-005","demo-user-001","banane-plantain","Banane plantain","legumes_tubercules",
    400,"kg","Yopougon","boutique_quartier","Boutique Total Selmer",4,61,1,1),
  mkSignal("d-006","demo-user-004","banane-plantain","Banane plantain","legumes_tubercules",
    750,"kg","Yopougon","supermarche","Sococé Yopougon",2,55,1,2),

  // Oignon violet — Yopougon
  mkSignal("d-007","demo-user-003","oignon-violet-galmi","Oignon Violet Galmi","legumes_fruits",
    450,"kg","Yopougon","marche_traditionnel","Marché Siporex",3,77,3,0),
  mkSignal("d-008","demo-user-005","oignon-violet-galmi","Oignon Violet Galmi","legumes_fruits",
    700,"kg","Yopougon","supermarche","Sococé Yopougon",5,68,2,1),

  // Huile rouge — Yopougon
  mkSignal("d-009","demo-user-001","huile-rouge","Huile rouge (palme)","huiles_condiments",
    1000,"litre","Yopougon","marche_traditionnel","Marché Siporex",2,85,6,0),
  mkSignal("d-010","demo-user-002","huile-rouge","Huile rouge (palme)","huiles_condiments",
    1500,"litre","Yopougon","boutique_quartier","Chez Aminata Yopougon",6,60,1,1),
  mkSignal("d-011","demo-user-003","huile-rouge","Huile rouge (palme)","huiles_condiments",
    2200,"litre","Yopougon","supermarche","Sococé Yopougon",1,72,2,1),

  // Viande bœuf sans os — Yopougon
  mkSignal("d-012","demo-user-005","boeuf-sans-os","Viande de bœuf sans os","proteines_viande",
    3200,"kg","Yopougon","marche_traditionnel","Marché Siporex",1,88,7,0),
  mkSignal("d-013","demo-user-001","boeuf-sans-os","Viande de bœuf sans os","proteines_viande",
    4500,"kg","Yopougon","supermarche","Sococé Yopougon",3,70,2,1),
  mkSignal("d-014","demo-user-004","boeuf-sans-os","Viande de bœuf sans os","proteines_viande",
    5500,"kg","Yopougon","supermarche","Casino Yopougon",7,52,0,3),

  // Poulet de chair — Yopougon
  mkSignal("d-015","demo-user-002","poulet-chair","Poulet de chair (entier)","proteines_viande",
    2000,"kg","Yopougon","marche_traditionnel","Marché Siporex",2,80,5,0),
  mkSignal("d-016","demo-user-003","poulet-chair","Poulet de chair (entier)","proteines_viande",
    3200,"kg","Yopougon","supermarche","Sococé Yopougon",4,66,2,2),

  // Riz Wita 9 — Yopougon
  mkSignal("d-017","demo-user-005","riz-wita9","Riz local Wita 9","cereales_legumineuses",
    15500,"sac_25kg","Yopougon","marche_traditionnel","Marché Siporex",3,86,8,0),
  mkSignal("d-018","demo-user-001","riz-wita9","Riz local Wita 9","cereales_legumineuses",
    18000,"sac_25kg","Yopougon","boutique_quartier","Boutique Selmer",5,72,3,1),
  mkSignal("d-019","demo-user-002","riz-wita9","Riz local Wita 9","cereales_legumineuses",
    22000,"sac_25kg","Yopougon","supermarche","Sococé Yopougon",1,65,1,2),

  // Attiéké / Manioc — Yopougon
  mkSignal("d-020","demo-user-003","manioc","Manioc","legumes_tubercules",
    150,"kg","Yopougon","vendeur_ambulant","Vendeur Carrefour Siporex",1,75,4,0),
  mkSignal("d-021","demo-user-004","manioc","Manioc","legumes_tubercules",
    300,"kg","Yopougon","boutique_quartier","Chez Konan Yopougon",4,58,1,1),

  // ══════════════════════════════════════════════════════
  // ADJAMÉ — Marché de gros vs détail
  // ══════════════════════════════════════════════════════

  // Tomate — Adjamé (prix grossiste plus bas)
  mkSignal("d-022","demo-user-005","tomate-salade","Tomate type salade","legumes_fruits",
    200,"kg","Adjamé","marche_traditionnel","Grand Marché d'Adjamé",2,90,9,0),
  mkSignal("d-023","demo-user-001","tomate-salade","Tomate type salade","legumes_fruits",
    450,"kg","Adjamé","boutique_quartier","Boutique Rue 12",3,68,2,1),

  // Igname Kponan — Adjamé
  mkSignal("d-024","demo-user-002","igname-kponan","Igname Kponan","legumes_tubercules",
    500,"kg","Adjamé","marche_traditionnel","Grand Marché d'Adjamé",4,80,5,0),
  mkSignal("d-025","demo-user-003","igname-kponan","Igname Kponan","legumes_tubercules",
    800,"kg","Adjamé","boutique_quartier","Chez Yao Adjamé",2,62,1,1),
  mkSignal("d-026","demo-user-005","igname-kponan","Igname Kponan","legumes_tubercules",
    1200,"kg","Adjamé","supermarche","Hypermarché Adjamé",6,55,0,2),

  // Poisson Chinchard — Adjamé
  mkSignal("d-027","demo-user-004","chinchard","Chinchard (Kedjenou)","proteines_poisson",
    1000,"kg","Adjamé","marche_traditionnel","Grand Marché d'Adjamé",1,83,6,0),
  mkSignal("d-028","demo-user-001","chinchard","Chinchard (Kedjenou)","proteines_poisson",
    1500,"kg","Adjamé","boutique_quartier","Poissonnerie Rue Princesse",3,70,3,1),

  // Pâte d'arachide — Adjamé
  mkSignal("d-029","demo-user-002","pate-arachide","Pâte d'arachide","huiles_condiments",
    1200,"kg","Adjamé","marche_traditionnel","Grand Marché d'Adjamé",2,78,4,0),
  mkSignal("d-030","demo-user-003","pate-arachide","Pâte d'arachide","huiles_condiments",
    2000,"kg","Adjamé","supermarche","Hypermarché Adjamé",5,65,1,1),

  // Sucre blanc — Adjamé
  mkSignal("d-031","demo-user-005","sucre-blanc","Sucre blanc","cereales_legumineuses",
    600,"kg","Adjamé","marche_traditionnel","Grand Marché d'Adjamé",3,85,7,0),
  mkSignal("d-032","demo-user-001","sucre-blanc","Sucre blanc","cereales_legumineuses",
    750,"kg","Adjamé","boutique_quartier","Épicerie Diallo Adjamé",4,72,3,0),
  mkSignal("d-033","demo-user-004","sucre-blanc","Sucre blanc","cereales_legumineuses",
    900,"kg","Adjamé","supermarche","Hypermarché Adjamé",1,60,1,2),

  // ══════════════════════════════════════════════════════
  // COCODY — Quartier résidentiel, prix plus élevés
  // ══════════════════════════════════════════════════════

  // Tomate — Cocody (écart fort avec marchés)
  mkSignal("d-034","demo-user-003","tomate-salade","Tomate type salade","legumes_fruits",
    800,"kg","Cocody","supermarche","Carrefour Market Cocody",1,76,3,1),
  mkSignal("d-035","demo-user-005","tomate-salade","Tomate type salade","legumes_fruits",
    1200,"kg","Cocody","supermarche","Cap Sud Cocody",2,68,2,2),
  mkSignal("d-036","demo-user-002","tomate-salade","Tomate type salade","legumes_fruits",
    500,"kg","Cocody","marche_traditionnel","Marché de la Riviera",4,71,4,0),

  // Avocat — Cocody (saison)
  mkSignal("d-037","demo-user-001","avocat","Avocat","fruits",
    200,"unité","Cocody","vendeur_ambulant","Bord route Riviera 2",1,82,5,0),
  mkSignal("d-038","demo-user-004","avocat","Avocat","fruits",
    500,"unité","Cocody","supermarche","Carrefour Market Cocody",3,60,1,2),

  // Viande bœuf — Cocody (abus détecté)
  mkSignal("d-039","demo-user-005","boeuf-sans-os","Viande de bœuf sans os","proteines_viande",
    6500,"kg","Cocody","supermarche","Cap Sud Cocody",2,45,0,4),
  mkSignal("d-040","demo-user-003","boeuf-sans-os","Viande de bœuf sans os","proteines_viande",
    4000,"kg","Cocody","marche_traditionnel","Marché de la Riviera",5,78,4,0),

  // Lait liquide — Cocody
  mkSignal("d-041","demo-user-002","lait-liquide","Lait liquide (litre)","cereales_legumineuses",
    700,"litre","Cocody","supermarche","Carrefour Market Cocody",3,72,3,1),
  mkSignal("d-042","demo-user-001","lait-liquide","Lait liquide (litre)","cereales_legumineuses",
    1100,"litre","Cocody","supermarche","Cap Sud Cocody",1,58,1,3),

  // ══════════════════════════════════════════════════════
  // MARCORY — Zone mixte
  // ══════════════════════════════════════════════════════

  // Poisson Sosso — Marcory
  mkSignal("d-043","demo-user-004","sosso-importe","Sosso importé (congelé)","proteines_poisson",
    1200,"kg","Marcory","marche_traditionnel","Marché Marcory",2,80,5,0),
  mkSignal("d-044","demo-user-005","sosso-importe","Sosso importé (congelé)","proteines_poisson",
    1800,"kg","Marcory","boutique_quartier","Poissonnerie Zone 4",4,65,2,1),

  // Carotte — Marcory
  mkSignal("d-045","demo-user-003","carotte","Carotte","legumes_fruits",
    500,"kg","Marcory","marche_traditionnel","Marché Marcory",3,75,4,0),
  mkSignal("d-046","demo-user-001","carotte","Carotte","legumes_fruits",
    900,"kg","Marcory","supermarche","Score Marcory",1,62,1,2),

  // Ananas — Marcory
  mkSignal("d-047","demo-user-002","ananas","Ananas","fruits",
    300,"unité","Marcory","vendeur_ambulant","Carrefour Marcory-ZAC",1,85,6,0),
  mkSignal("d-048","demo-user-005","ananas","Ananas","fruits",
    800,"unité","Marcory","supermarche","Score Marcory",2,60,1,3),

  // ══════════════════════════════════════════════════════
  // TRANSPORT — Lignes majeures
  // ══════════════════════════════════════════════════════

  mkSignal("d-049","demo-user-001","gbaka-yopougon-adjame","Gbaka Yopougon → Adjamé","transport_gbaka",
    200,"trajet","Yopougon","gare_routiere","Terminus Selmer",1,90,12,0,"transport"),
  mkSignal("d-050","demo-user-003","gbaka-yopougon-adjame","Gbaka Yopougon → Adjamé","transport_gbaka",
    300,"trajet","Yopougon","gare_routiere","Terminus Selmer",2,55,1,5,"transport"),

  mkSignal("d-051","demo-user-002","gbaka-abobo-adjame","Gbaka Abobo → Adjamé","transport_gbaka",
    200,"trajet","Abobo","gare_routiere","Gare Abobo",1,88,9,0,"transport"),
  mkSignal("d-052","demo-user-004","gbaka-abobo-adjame","Gbaka Abobo → Adjamé","transport_gbaka",
    250,"trajet","Abobo","gare_routiere","Gare Abobo",3,60,2,2,"transport"),

  mkSignal("d-053","demo-user-005","woro-cocody-plateau","Woro-woro Cocody → Plateau","transport_woro",
    300,"trajet","Cocody","gare_routiere","Carrefour Attoban",2,85,7,0,"transport"),
  mkSignal("d-054","demo-user-001","woro-cocody-plateau","Woro-woro Cocody → Plateau","transport_woro",
    500,"trajet","Cocody","gare_routiere","Carrefour Attoban",4,42,0,4,"transport"),

  mkSignal("d-055","demo-user-003","woro-marcory-gare-sud","Woro-woro Marcory → Gare Sud","transport_woro",
    250,"trajet","Marcory","gare_routiere","Carrefour ZAC",1,82,6,0,"transport"),

  // ══════════════════════════════════════════════════════
  // ABOBO — Quartier populaire
  // ══════════════════════════════════════════════════════

  mkSignal("d-056","demo-user-004","patate-douce","Patate douce","legumes_tubercules",
    200,"kg","Abobo","marche_traditionnel","Marché Abobo Baoulé",3,78,5,0),
  mkSignal("d-057","demo-user-002","patate-douce","Patate douce","legumes_tubercules",
    400,"kg","Abobo","boutique_quartier","Épicerie Carrefour PK18",2,60,1,1),

  mkSignal("d-058","demo-user-005","gombo-frais","Gombo frais","legumes_fruits",
    100,"tas","Abobo","marche_traditionnel","Marché Abobo Baoulé",1,87,8,0),
  mkSignal("d-059","demo-user-001","gombo-frais","Gombo frais","legumes_fruits",
    300,"tas","Abobo","boutique_quartier","Boutique Bld de France",4,55,1,2),

  mkSignal("d-060","demo-user-003","niebe","Niébé (haricot blanc)","cereales_legumineuses",
    500,"kg","Abobo","marche_traditionnel","Marché Abobo Baoulé",2,80,4,0),
  mkSignal("d-061","demo-user-002","niebe","Niébé (haricot blanc)","cereales_legumineuses",
    800,"kg","Abobo","supermarche","Score Abobo",5,62,1,2),
];

// ─── Fonction principale de seed ─────────────────────────

export async function seedDemoData(currentUserId: string): Promise<void> {
  // Vérifier si déjà seedé
  const done = await AsyncStorage.getItem(DEMO_SEED_KEY);
  if (done === "1") return;

  try {
    // Insérer les utilisateurs fictifs (sauf si l'un d'eux a le même ID que l'user réel)
    for (const u of USERS_DEMO) {
      if (u.id !== currentUserId) {
        const existing = await getUser(u.id);
        if (!existing) await saveUser(u);
      }
    }

    // Insérer les signalements de démo
    // On bypasse le compteur user pour ne pas fausser le profil
    for (const s of SIGNALEMENTS_DEMO) {
      try {
        // insertSignalement incrémente le compteur — on utilise une version légère
        await insertSignalementDemo(s);
      } catch {
        // Ignorer les doublons silencieusement
      }
    }

    await AsyncStorage.setItem(DEMO_SEED_KEY, "1");
    console.log(`[Demo] ${SIGNALEMENTS_DEMO.length} signalements insérés.`);
  } catch (err) {
    console.warn("[Demo] Erreur seed :", err);
  }
}

// Version sans incrément du compteur utilisateur
async function insertSignalementDemo(s: Signalement): Promise<void> {
  const { getDb } = await import("./db");
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO signalements
      (id, user_id, produit_id, produit_nom, categorie, sous_categorie,
       prix, unite, commune, quartier, type_lieu, nom_lieu,
       latitude, longitude, date_signalement, score_fiabilite,
       nb_confirmations, nb_contestations, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.id, s.userId, s.produitId, s.produitNom, s.categorie,
      s.sousCategorie, s.prix, s.unite, s.commune, s.quartier,
      s.typeLieu, s.nomLieu,
      null, null,
      s.dateSignalement, s.scoreFilabilite,
      s.nbConfirmations, s.nbContestations,
      1, s.createdAt,
    ]
  );
}

export async function resetDemoData(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_SEED_KEY);
  const { getDb } = await import("./db");
  const db = await getDb();
  const ids = SIGNALEMENTS_DEMO.map((s) => `'${s.id}'`).join(",");
  await db.runAsync(`DELETE FROM signalements WHERE id IN (${ids})`);
  const userIds = USERS_DEMO.map((u) => `'${u.id}'`).join(",");
  await db.runAsync(`DELETE FROM users WHERE id IN (${userIds})`);
  console.log("[Demo] Données de démo supprimées.");
}
