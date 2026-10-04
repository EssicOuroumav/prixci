import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icone from "@/components/Icone";
import { NomIcone } from "@/constants/types";

// ============================================================
// PREMIER LANCEMENT — trois écrans qui expliquent PrixCI
// Mise en page volontairement simple : elle doit tenir sur un petit écran Android.
// ============================================================

const VERT = "#0A5F38";
const ORANGE = "#F4A024";

const ECRANS: { icone: NomIcone; titre: string; texte: string }[] = [
  {
    icone: "pricetags-outline",
    titre: "Connais le prix officiel",
    texte:
      "Riz, tomate, oignon, viande, poisson… PrixCI affiche les prix publiés par l'État pour ta ville, chaque semaine.",
  },
  {
    icone: "storefront-outline",
    titre: "Trouve où acheter au bon prix",
    texte:
      "Coche ta liste de marché : PrixCI t'indique les commerces près de chez toi qui vendent au prix officiel.",
  },
  {
    icone: "megaphone-outline",
    titre: "Signale les prix que tu vois",
    texte:
      "En 30 secondes et anonymement. Quand 3 citoyens constatent le même prix, le commerce est classé pour tout le monde.",
  },
];

interface OnboardingProps {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const ecran = ECRANS[index];
  const dernier = index === ECRANS.length - 1;

  const terminer = async () => {
    await AsyncStorage.setItem("prixci_onboarding_done", "1");
    onFinish();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.haut}>
        <View style={styles.marque}>
          <Image source={require("../assets/logo-mark.png")} style={styles.logo} />
          <Text style={styles.marqueTexte}>PrixCI</Text>
        </View>
        {!dernier && (
          <TouchableOpacity onPress={terminer} hitSlop={12}>
            <Text style={styles.passer}>Passer</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centre}>
        <View style={styles.cercle}>
          <Icone nom={ecran.icone} taille={72} couleur={VERT} />
        </View>
        <Text style={styles.titre}>{ecran.titre}</Text>
        <Text style={styles.texte}>{ecran.texte}</Text>
      </View>

      <View>
        <View style={styles.points}>
          {ECRANS.map((_, i) => (
            <View key={i} style={[styles.point, i === index && styles.pointActif]} />
          ))}
        </View>
        <TouchableOpacity
          style={styles.bouton}
          onPress={() => (dernier ? terminer() : setIndex(index + 1))}
          activeOpacity={0.85}
        >
          <Text style={styles.boutonTexte}>{dernier ? "Commencer" : "Suivant"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VERT,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  haut: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  marque: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#FFFFFF" },
  marqueTexte: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  passer: { color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: "600" },
  centre: { alignItems: "center", gap: 18 },
  cercle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  titre: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", textAlign: "center", lineHeight: 32 },
  texte: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  points: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  point: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.35)" },
  pointActif: { width: 26, backgroundColor: ORANGE },
  bouton: { backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 17, alignItems: "center" },
  boutonTexte: { color: "#1A1A1A", fontSize: 17, fontWeight: "800" },
});
