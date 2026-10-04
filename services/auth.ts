import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "@/constants/types";
import { saveUser, getUser } from "./db";
import * as Crypto from "expo-crypto";

// ============================================================
// CLIENT SUPABASE + AUTH ANONYME
// ============================================================

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// ─── Auth anonyme ──────────────────────────────────────────

/**
 * Crée ou récupère un profil utilisateur anonyme.
 * Ordre de priorité :
 * 1. Session Supabase existante
 * 2. Profil local SQLite
 * 3. Création d'un nouveau compte anonyme
 */
export async function getOrCreateAnonymousUser(): Promise<UserProfile> {
  // 1. Vérifier session existante
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (session?.user?.id) {
    const localUser = await getUser(session.user.id);
    if (localUser) return localUser;
  }

  // 2. Connexion anonyme Supabase
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    // Fallback 100% offline si Supabase indisponible
    return createOfflineUser();
  }

  const userId = data.user.id;
  const existingUser = await getUser(userId);
  if (existingUser) return existingUser;

  // 3. Créer le profil
  const pseudonyme = generatePseudonyme();
  const user: UserProfile = {
    id: userId,
    pseudonyme,
    scoreConfiance: 50,
    nbSignalements: 0,
    nbValidationsRecues: 0,
    dateCreation: new Date().toISOString(),
  };

  await saveUser(user);

  // Sync du profil vers Supabase
  await supabase.from("users").upsert({
    id: user.id,
    pseudonyme: user.pseudonyme,
    score_confiance: user.scoreConfiance,
    nb_signalements: user.nbSignalements,
    date_creation: user.dateCreation,
  });

  return user;
}

/**
 * Création d'utilisateur offline (sans réseau disponible)
 */
async function createOfflineUser(): Promise<UserProfile> {
  // Vérifier si un utilisateur offline existe déjà
  const offlineId = await AsyncStorage.getItem("prixci_offline_user_id");
  if (offlineId) {
    const existing = await getUser(offlineId);
    if (existing) return existing;
  }

  const id = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `offline_${Date.now()}_${Math.random()}`
  );

  const user: UserProfile = {
    id: id.substring(0, 36),
    pseudonyme: generatePseudonyme(),
    scoreConfiance: 50,
    nbSignalements: 0,
    nbValidationsRecues: 0,
    dateCreation: new Date().toISOString(),
  };

  await saveUser(user);
  await AsyncStorage.setItem("prixci_offline_user_id", user.id);
  return user;
}

// ─── Générateur de pseudonyme anonyme ─────────────────────

const ADJECTIFS = [
  "Rapide", "Vigilant", "Courageux", "Honnête", "Alerte",
  "Citoyen", "Libre", "Solidaire", "Actif", "Vaillant",
];

const NOMS = [
  "Éléphant", "Balafon", "Baobab", "Caïman", "Korhogo",
  "Sassandra", "Nimba", "Comoé", "Taï", "Adzopé",
];

function generatePseudonyme(): string {
  const adj = ADJECTIFS[Math.floor(Math.random() * ADJECTIFS.length)];
  const nom = NOMS[Math.floor(Math.random() * NOMS.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  return `${adj}${nom}${num}`;
}

// ─── Déconnexion ──────────────────────────────────────────
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  await AsyncStorage.removeItem("prixci_offline_user_id");
}
