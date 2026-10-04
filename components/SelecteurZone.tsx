import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { COMMUNES_ABIDJAN, VILLES, villeDeZone } from "@/constants/types";

// ============================================================
// SÉLECTEUR DE ZONE
// D'abord la ville ; pour Abidjan, la commune sur une seconde ligne.
// La valeur est la « zone » enregistrée dans un signalement :
// une commune d'Abidjan ou le nom d'une ville de l'intérieur.
// ============================================================

export default function SelecteurZone({
  zone,
  onChange,
}: {
  zone: string;
  onChange: (zone: string) => void;
}) {
  const ville = villeDeZone(zone);

  // Amène la ville et la commune choisies dans la partie visible de la ligne
  const ligneVilles = useRef<ScrollView>(null);
  const ligneCommunes = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const centrer = () => {
    const xVille = positions.current[`v:${ville}`];
    const xCommune = positions.current[`c:${zone}`];
    if (xVille !== undefined) ligneVilles.current?.scrollTo({ x: Math.max(0, xVille - 12), animated: false });
    if (xCommune !== undefined) ligneCommunes.current?.scrollTo({ x: Math.max(0, xCommune - 60), animated: false });
  };
  useEffect(() => {
    const t = setTimeout(centrer, 50);
    return () => clearTimeout(t);
  }, [zone]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={ligneVilles}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ligne}
      >
        {VILLES.map((v) => (
          <TouchableOpacity
            key={v}
            onLayout={(e) => { positions.current[`v:${v}`] = e.nativeEvent.layout.x; }}
            style={[styles.ville, ville === v && styles.villeActive]}
            // Choisir Abidjan garde la commune courante, ou propose Yopougon
            onPress={() => onChange(v === "Abidjan" ? (ville === "Abidjan" ? zone : "Yopougon") : v)}
          >
            <Text style={[styles.villeTexte, ville === v && styles.villeTexteActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {ville === "Abidjan" && (
        <ScrollView
          ref={ligneCommunes}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ligne}
          onContentSizeChange={centrer}
          onLayout={centrer}
        >
          {COMMUNES_ABIDJAN.map((c) => (
            <TouchableOpacity
              key={c}
              onLayout={(e) => { positions.current[`c:${c}`] = e.nativeEvent.layout.x; }}
              style={[styles.commune, zone === c && styles.communeActive]}
              onPress={() => onChange(c)}
            >
              <Text style={[styles.communeTexte, zone === c && styles.communeTexteActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const VERT = "#0A5F38";

const styles = StyleSheet.create({
  container: { backgroundColor: "#FFFFFF", paddingVertical: 6, gap: 6 },
  ligne: { paddingHorizontal: 12, gap: 6 },
  ville: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F0F0F0" },
  villeActive: { backgroundColor: VERT },
  villeTexte: { fontSize: 13, color: "#555555", fontWeight: "600" },
  villeTexteActive: { color: "#FFFFFF", fontWeight: "700" },
  commune: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  communeActive: { borderColor: VERT, backgroundColor: "#E8F5EE" },
  communeTexte: { fontSize: 12, color: "#666666" },
  communeTexteActive: { color: VERT, fontWeight: "700" },
});
