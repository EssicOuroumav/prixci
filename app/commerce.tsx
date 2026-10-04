import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { getCommerce, Commerce, PrixCommerce } from "@/services/commerces";
import { libelleReference } from "@/services/reference";
import { partager, ouvrirItineraire } from "@/services/partage";
import { SEUIL_APPUIS } from "@/services/scoring";
import { infoTypeLieu } from "@/constants/types";
import { LABELS_UNITE } from "@/constants/produits";
import Icone from "@/components/Icone";
import { HAUT_ECRAN } from "@/constants/layout";

// ============================================================
// FICHE D'UN COMMERCE
// Ses prix vérifiés, comparés un par un au prix officiel.
// Route : /commerce?commune=…&cle=…
// ============================================================

const VERT = "#0A5F38";
const ROUGE = "#C0392B";

function LignePrix({ p }: { p: PrixCommerce }) {
  const couleur =
    p.statut === "conforme" ? VERT : p.statut === "depassement" ? ROUGE : "#888888";
  return (
    <View style={styles.ligne}>
      <Icone
        nom={
          p.statut === "conforme"
            ? "checkmark-circle"
            : p.statut === "depassement"
            ? "alert-circle"
            : "ellipse-outline"
        }
        taille={20}
        couleur={couleur}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.ligneNom} numberOfLines={1}>{p.produitNom}</Text>
        <Text style={styles.ligneRef}>
          {p.reference
            ? `${libelleReference(p.reference.type)} : ${p.reference.prix.toLocaleString("fr-FR")} FCFA`
            : "Pas de prix officiel pour ce produit"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.lignePrix, { color: couleur }]}>
          {p.prix.toLocaleString("fr-FR")} F
          <Text style={styles.ligneUnite}> /{LABELS_UNITE[p.unite] ?? p.unite}</Text>
        </Text>
        {p.ecartPct !== null && p.ecartPct !== 0 && (
          <Text style={[styles.ligneEcart, { color: couleur }]}>
            {p.ecartPct > 0 ? "+" : ""}{p.ecartPct} %
          </Text>
        )}
      </View>
    </View>
  );
}

export default function CommerceScreen() {
  const { commune, cle } = useLocalSearchParams<{ commune: string; cle: string }>();
  const router = useRouter();
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!commune || !cle) return;
      getCommerce(commune, cle)
        .then(setCommerce)
        .finally(() => setLoading(false));
    }, [commune, cle])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={VERT} />
      </View>
    );
  }

  if (!commerce) {
    return (
      <View style={styles.centered}>
        <Icone nom="storefront-outline" taille={40} couleur="#B8C4BC" />
        <Text style={styles.introuvable}>Ce commerce n'a plus de prix vérifié récent.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnPlein}>
          <Text style={styles.btnPleinTexte}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const conforme = commerce.statut === "conforme";
  const depassement = commerce.statut === "depassement";
  const couleur = conforme ? VERT : depassement ? ROUGE : "#888888";
  const type = infoTypeLieu(commerce.typeLieu);

  const messagePartage = conforme
    ? `${commerce.nomLieu} (${commerce.commune}) vend au prix officiel : ${commerce.prix
        .filter((p) => p.statut === "conforme")
        .slice(0, 4)
        .map((p) => `${p.produitNom} ${p.prix.toLocaleString("fr-FR")} F/${LABELS_UNITE[p.unite] ?? p.unite}`)
        .join(", ")}.`
    : `Prix constatés chez ${commerce.nomLieu} (${commerce.commune}) : ${commerce.prix
        .slice(0, 4)
        .map((p) => `${p.produitNom} ${p.prix.toLocaleString("fr-FR")} F/${LABELS_UNITE[p.unite] ?? p.unite}`)
        .join(", ")}.`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.titre} numberOfLines={2}>{commerce.nomLieu}</Text>
        <Text style={styles.sousTitre}>
          {type.label} · {commerce.commune}
          {commerce.quartier ? ` · ${commerce.quartier}` : ""}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Statut */}
        <View style={[styles.statutBox, { backgroundColor: couleur + "12", borderColor: couleur + "40" }]}>
          <Icone
            nom={conforme ? "shield-checkmark" : depassement ? "alert-circle" : "ellipse-outline"}
            taille={28}
            couleur={couleur}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statutTitre, { color: couleur }]}>
              {conforme
                ? "Vend au prix officiel"
                : depassement
                ? "Dépassements constatés"
                : "Pas encore évalué"}
            </Text>
            <Text style={styles.statutTexte}>
              {conforme
                ? `${commerce.nbConformes} produit${commerce.nbConformes > 1 ? "s" : ""} vérifié${commerce.nbConformes > 1 ? "s" : ""} au prix officiel ou en dessous.`
                : depassement
                ? `${commerce.nbDepassements} produit${commerce.nbDepassements > 1 ? "s" : ""} au-dessus du prix officiel, ${commerce.nbConformes} conforme${commerce.nbConformes > 1 ? "s" : ""}.`
                : "Aucun de ses prix vérifiés ne correspond à un produit ayant un prix officiel."}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.action}
            onPress={() =>
              ouvrirItineraire(commerce.nomLieu, commerce.commune, commerce.latitude, commerce.longitude)
            }
          >
            <Icone nom="navigate-outline" taille={18} couleur={VERT} />
            <Text style={styles.actionTexte}>Y aller</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => partager(messagePartage)}>
            <Icone nom="logo-whatsapp" taille={18} couleur={VERT} />
            <Text style={styles.actionTexte}>Partager</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitre}>Prix vérifiés ({commerce.prix.length})</Text>
        {commerce.prix.map((p) => (
          <LignePrix key={`${p.produitId}|${p.unite}`} p={p} />
        ))}

        <TouchableOpacity
          style={styles.btnPlein}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/signaler",
              params: {
                commune: commerce.commune,
                typeLieu: commerce.typeLieu,
                nomLieu: commerce.nomLieu,
              },
            })
          }
        >
          <Text style={styles.btnPleinTexte}>Signaler un prix dans ce commerce</Text>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Text style={styles.noteTexte}>
            Chaque prix affiché a été constaté par au moins {SEUIL_APPUIS} citoyens différents au cours des 30 derniers jours. Le classement d'un commerce évolue avec les nouveaux signalements.
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32, backgroundColor: "#F5F7F5" },
  introuvable: { fontSize: 14, color: "#666666", textAlign: "center" },
  header: { backgroundColor: VERT, paddingHorizontal: 20, paddingTop: HAUT_ECRAN, paddingBottom: 16 },
  back: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 },
  titre: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  sousTitre: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  content: { padding: 14 },
  statutBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  statutTitre: { fontSize: 16, fontWeight: "800" },
  statutTexte: { fontSize: 12, color: "#555555", marginTop: 2, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#DDE5DF",
  },
  actionTexte: { fontSize: 14, fontWeight: "700", color: VERT },
  sectionTitre: { fontSize: 15, fontWeight: "800", color: "#1A1A1A", marginTop: 18, marginBottom: 10 },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  ligneNom: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  ligneRef: { fontSize: 11, color: "#888888", marginTop: 2 },
  lignePrix: { fontSize: 16, fontWeight: "800" },
  ligneUnite: { fontSize: 11, color: "#888888", fontWeight: "400" },
  ligneEcart: { fontSize: 11, fontWeight: "700", marginTop: 1 },
  btnPlein: { backgroundColor: VERT, borderRadius: 14, padding: 15, alignItems: "center", marginTop: 14 },
  btnPleinTexte: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  noteBox: { backgroundColor: "#EEF1EE", borderRadius: 10, padding: 12, marginTop: 12 },
  noteTexte: { fontSize: 12, color: "#666666", lineHeight: 17 },
});
