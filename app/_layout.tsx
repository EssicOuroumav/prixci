import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getOrCreateAnonymousUser } from "@/services/auth";
import { getDb, purgerDonneesDemo } from "@/services/db";
import { syncAvecStore, initialiserReferences } from "@/services/sync";
import { getUserValidations } from "@/services/db";
import { useAppStore } from "@/stores/useAppStore";
import Onboarding from "@/components/Onboarding";

export default function RootLayout() {
  const { setUser, setInitialized, addValidation } = useAppStore();

  const [onboardingFait, setOnboardingFait] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Vérifier si l'onboarding a déjà été vu
        const done = await AsyncStorage.getItem("prixci_onboarding_done");
        setOnboardingFait(done === "1");

        // Initialiser la base de données locale
        await getDb();
        await purgerDonneesDemo();
        await initialiserReferences();

        // Créer ou récupérer l'utilisateur anonyme
        const user = await getOrCreateAnonymousUser();
        setUser(user);

        // Charger les validations déjà effectuées
        const validations = await getUserValidations(user.id);
        validations.forEach(addValidation);

        setInitialized(true);

        // Sync silencieuse en arrière-plan
        syncAvecStore();
      } catch (err) {
        console.error("[Init] Erreur :", err);
        setOnboardingFait(false); // Afficher onboarding par défaut si erreur
        setInitialized(true);
      }
    }
    init();

    // Nouvelle synchronisation à chaque retour de l'application au premier plan
    const abonnement = AppState.addEventListener("change", (etat) => {
      if (etat === "active" && useAppStore.getState().isInitialized) syncAvecStore();
    });
    return () => abonnement.remove();
  }, []);

  // Attendre la vérification avant de rendre quoi que ce soit
  if (onboardingFait === null) return null;

  // Afficher l'onboarding si pas encore vu
  if (!onboardingFait) {
    return (
      <>
        <StatusBar style="light" />
        <Onboarding onFinish={() => setOnboardingFait(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="detail/[id]"
          options={{
            presentation: "card",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen name="enseigne/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="enseigne/inscription" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="legal" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="commerce" options={{ animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}
