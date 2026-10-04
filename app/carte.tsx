import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { getCommerces, Commerce } from "@/services/commerces";
import { actualiserPosition } from "@/services/position";
import Icone from "@/components/Icone";

// ============================================================
// CARTE DES COMMERCES
// Vert : au prix officiel. Rouge : dépassements constatés. Gris : non évalué.
// Seuls les commerces dont la position a été relevée lors d'un signalement
// apparaissent. Route : /carte?commune=…
// ============================================================

const VERT = "#0A5F38";
const ROUGE = "#C0392B";
const GRIS = "#888888";
// Centre d'Abidjan, utilisé quand rien d'autre n'est connu
const CENTRE_PAR_DEFAUT = { latitude: 5.345, longitude: -4.024 };

const COULEUR = { conforme: VERT, depassement: ROUGE, non_evalue: GRIS } as const;
const LIBELLE = {
  conforme: "Au prix officiel",
  depassement: "Dépassements constatés",
  non_evalue: "Non évalué",
} as const;

export default function CarteScreen() {
  const { commune } = useLocalSearchParams<{ commune?: string }>();
  const router = useRouter();
  const { position } = useAppStore();
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      actualiserPosition(true);
      // Toutes les zones : sur une carte, la limite d'une commune n'a pas de sens
      getCommerces()
        .then(setCommerces)
        .finally(() => setLoading(false));
    }, [])
  );

  const localises = commerces.filter((c) => c.latitude !== null && c.longitude !== null);
  const deLaZone = localises.filter((c) => c.commune === commune);

  // Point de départ : la zone demandée, sinon ma position, sinon Abidjan
  const centre =
    deLaZone.length > 0
      ? { latitude: deLaZone[0].latitude!, longitude: deLaZone[0].longitude! }
      : position ?? (localises[0]
          ? { latitude: localises[0].latitude!, longitude: localises[0].longitude! }
          : CENTRE_PAR_DEFAUT);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.titre}>Carte des commerces</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={VERT} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{ ...centre, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
            showsUserLocation
            showsMyLocationButton
          >
            {localises.map((c) => (
              <Marker
                key={`${c.commune}|${c.cle}`}
                coordinate={{ latitude: c.latitude!, longitude: c.longitude! }}
                pinColor={COULEUR[c.statut]}
                title={c.nomLieu}
                description={`${LIBELLE[c.statut]} · ${c.prix.length} prix vérifié${c.prix.length > 1 ? "s" : ""}`}
                onCalloutPress={() =>
                  router.push({ pathname: "/commerce", params: { commune: c.commune, cle: c.cle } })
                }
              />
            ))}
          </MapView>

          {localises.length === 0 ? (
            <View style={styles.vide}>
              <Icone nom="location-outline" taille={22} couleur="#666666" />
              <Text style={styles.videTexte}>
                Aucun commerce n'est encore placé sur la carte. Un commerce y apparaît dès que ses prix sont vérifiés et qu'un signalement a été fait sur place, localisation activée.
              </Text>
            </View>
          ) : (
            <View style={styles.legende}>
              {(["conforme", "depassement", "non_evalue"] as const).map((s) => (
                <View key={s} style={styles.legendeItem}>
                  <View style={[styles.pastille, { backgroundColor: COULEUR[s] }]} />
                  <Text style={styles.legendeTexte}>{LIBELLE[s]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },
  header: { backgroundColor: VERT, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14 },
  back: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 6 },
  titre: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  vide: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 24,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  videTexte: { flex: 1, fontSize: 13, color: "#555555", lineHeight: 18 },
  legende: {
    position: "absolute",
    left: 14,
    bottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    gap: 6,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  legendeItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  pastille: { width: 10, height: 10, borderRadius: 5 },
  legendeTexte: { fontSize: 12, color: "#333333" },
});
