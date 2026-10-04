import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icone from "@/components/Icone";
import { useAppStore } from "@/stores/useAppStore";
import { Categorie, NomIcone } from "@/constants/types";

// ============================================================
// SÉLECTEUR ALIMENTATION / TRANSPORT
// Les deux univers ne sont jamais mélangés : le choix fait ici
// s'applique à l'accueil, à Explorer et au formulaire de signalement.
// ============================================================

const CATEGORIES: { id: Categorie; label: string; icone: NomIcone }[] = [
  { id: "alimentation", label: "Alimentation", icone: "basket-outline" },
  { id: "transport", label: "Transport", icone: "bus-outline" },
];

export default function SelecteurCategorie() {
  const { categorieActive, setCategorieActive } = useAppStore();

  return (
    <View style={styles.container}>
      {CATEGORIES.map((c) => {
        const actif = categorieActive === c.id;
        return (
          <TouchableOpacity
            key={c.id}
            style={[styles.bouton, actif && styles.boutonActif]}
            onPress={() => setCategorieActive(c.id)}
            activeOpacity={0.8}
          >
            <Icone nom={c.icone} taille={18} couleur={actif ? "#FFFFFF" : "#555555"} />
            <Text style={[styles.texte, actif && styles.texteActif]}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  bouton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
  },
  boutonActif: { backgroundColor: "#0A5F38" },
  texte: { fontSize: 14, color: "#555555", fontWeight: "600" },
  texteActif: { color: "#FFFFFF", fontWeight: "700" },
});
