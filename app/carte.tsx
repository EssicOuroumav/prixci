import React, { useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { getCommerces, Commerce } from "@/services/commerces";
import { actualiserPosition } from "@/services/position";
import { HAUT_ECRAN } from "@/constants/layout";
import Icone from "@/components/Icone";

// ============================================================
// CARTE DES COMMERCES
// Vert : au prix officiel. Rouge : dépassements constatés. Gris : non évalué.
// Seuls les commerces dont la position a été relevée lors d'un signalement
// apparaissent. Route : /carte?commune=…
//
// Fond de carte OpenStreetMap affiché avec Leaflet dans une vue web :
// aucun compte ni clé à créer, même rendu sur Android et iPhone.
// Les tuiles demandent du réseau ; sans réseau la carte reste grise.
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

function pageCarte(
  centre: { latitude: number; longitude: number },
  moi: { latitude: number; longitude: number } | null,
  points: { lat: number; lng: number; nom: string; detail: string; couleur: string; cible: string }[]
): string {
  // Les données passent en JSON : aucun texte saisi par un utilisateur n'est interprété comme du code
  const donnees = JSON.stringify({ centre, moi, points }).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #carte { height: 100%; margin: 0; background: #E9EEEA; }
  .nom { font: 700 14px sans-serif; color: #1A1A1A; }
  .detail { font: 12px sans-serif; color: #555; margin: 2px 0 6px; }
  .voir { font: 700 13px sans-serif; color: ${VERT}; text-decoration: underline; }
</style>
</head>
<body>
<div id="carte"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var d = ${donnees};
  var carte = L.map("carte", { zoomControl: true }).setView([d.centre.latitude, d.centre.longitude], 14);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(carte);
  function texte(s) { var e = document.createElement("div"); e.textContent = s; return e.innerHTML; }
  d.points.forEach(function (p) {
    var m = L.circleMarker([p.lat, p.lng], { radius: 11, color: "#FFFFFF", weight: 3, fillColor: p.couleur, fillOpacity: 1 }).addTo(carte);
    var bulle = document.createElement("div");
    bulle.innerHTML = '<div class="nom">' + texte(p.nom) + '</div><div class="detail">' + texte(p.detail) + '</div><span class="voir">Voir ses prix</span>';
    bulle.onclick = function () { window.ReactNativeWebView.postMessage(p.cible); };
    m.bindPopup(bulle);
  });
  if (d.moi) {
    L.circleMarker([d.moi.latitude, d.moi.longitude], { radius: 8, color: "#FFFFFF", weight: 3, fillColor: "#1E6FD9", fillOpacity: 1 })
      .addTo(carte).bindPopup("Tu es ici");
  }
</script>
</body>
</html>`;
}

export default function CarteScreen() {
  const { commune } = useLocalSearchParams<{ commune?: string }>();
  const router = useRouter();
  const { position } = useAppStore();
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      // Toutes les zones : sur une carte, la limite d'une commune n'a pas de sens
      getCommerces()
        .then(setCommerces)
        .finally(() => setLoading(false));
      // La demande de localisation ouvre une fenêtre système : on attend la fin
      // de l'animation d'arrivée, sinon l'écran reste invisible sur Android.
      const t = setTimeout(() => actualiserPosition(true), 800);
      return () => clearTimeout(t);
    }, [])
  );

  const localises = commerces.filter((c) => c.latitude !== null && c.longitude !== null);

  const html = useMemo(() => {
    const deLaZone = localises.filter((c) => c.commune === commune);
    // Point de départ : la zone demandée, sinon ma position, sinon Abidjan
    const centre =
      deLaZone.length > 0
        ? { latitude: deLaZone[0].latitude!, longitude: deLaZone[0].longitude! }
        : position ??
          (localises[0]
            ? { latitude: localises[0].latitude!, longitude: localises[0].longitude! }
            : CENTRE_PAR_DEFAUT);
    return pageCarte(
      centre,
      position,
      localises.map((c) => ({
        lat: c.latitude!,
        lng: c.longitude!,
        nom: c.nomLieu,
        detail: `${LIBELLE[c.statut]} · ${c.prix.length} prix vérifié${c.prix.length > 1 ? "s" : ""}`,
        couleur: COULEUR[c.statut],
        cible: JSON.stringify({ commune: c.commune, cle: c.cle }),
      }))
    );
  }, [commerces, position, commune]);

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
          <WebView
            style={{ flex: 1 }}
            originWhitelist={["*"]}
            source={{ html }}
            onMessage={(e) => {
              try {
                const cible = JSON.parse(e.nativeEvent.data);
                router.push({ pathname: "/commerce", params: cible });
              } catch {
                // message inattendu : ignoré
              }
            }}
          />

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
  header: { backgroundColor: VERT, paddingHorizontal: 20, paddingTop: HAUT_ECRAN, paddingBottom: 14 },
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
