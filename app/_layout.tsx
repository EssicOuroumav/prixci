import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getOrCreateAnonymousUser } from "@/services/auth";
import { getDb } from "@/services/db";
import { syncIfOnline } from "@/services/sync";
import { getUserValidations } from "@/services/db";
import { seedDemoData } from "@/services/demoSeed";
import { useAppStore } from "@/stores/useAppStore";
import Onboarding from "@/components/Onboarding";

export default function RootLayout() {
  const {
    setUser, setSyncStatus, setLastSyncAt, setInitialized,
    addValidation, communeSelectionnee,
  } = useAppStore();

  const [onboardingFait, setOnboardingFait] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Vérifier si l'onboarding a déjà été vu
        const done = await AsyncStorage.getItem("prixci_onboarding_done");
        setOnboardingFait(done === "1");

        // Initialiser la base de données locale
        await getDb();

        // Créer ou récupérer l'utilisateur anonyme
        const user = await getOrCreateAnonymousUser();
        setUser(user);

        // Injecter les données de démo (silencieux si déjà fait)
        await seedDemoData(user.id);

        // Charger les validations déjà effectuées
        const validations = await getUserValidations(user.id);
        validations.forEach(addValidation);

        setInitialized(true);

        // Sync silencieuse en arrière-plan
        syncIfOnline(communeSelectionnee, (status) => {
          setSyncStatus(status);
          if (status === "success") setLastSyncAt(new Date().toISOString());
        });
      } catch (err) {
        console.error("[Init] Erreur :", err);
        setOnboardingFait(false); // Afficher onboarding par défaut si erreur
        setInitialized(true);
      }
    }
    init();
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
      <StatusBar style="light" backgroundColor="#0A5F38" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="detail/[id]"
          options={{
            presentation: "card",
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </>
  );
}
