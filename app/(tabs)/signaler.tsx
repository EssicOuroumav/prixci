import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { insertSignalement } from "@/services/db";
import { Signalement, COMMUNES_ABIDJAN, TYPES_LIEU } from "@/constants/types";
import {
  PRODUITS_REF,
  LABELS_SOUS_CATEGORIE,
  LABELS_UNITE,
} from "@/constants/produits";

export default function SignalerScreen() {
  const router = useRouter();
  const { user, communeSelectionnee } = useAppStore();

  const [etape, setEtape] = useState<"produit" | "prix" | "lieu">("produit");
  const [produitSelectionne, setProduitSelectionne] = useState<string | null>(null);
  const [prixSaisi, setPrixSaisi] = useState("");
  const [uniteSelectionnee, setUniteSelectionnee] = useState<string | null>(null);
  const [communeSelectee, setCommuneSelectee] = useState(communeSelectionnee);
  const [quartier, setQuartier] = useState("");
  const [typeLieu, setTypeLieu] = useState<string>("marche_traditionnel");
  const [nomLieu, setNomLieu] = useState("");
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(false);
  const [categorieFiltre, setCategorieFiltre] = useState<"alimentation" | "transport" | null>(null);

  const produit = PRODUITS_REF.find((p) => p.id === produitSelectionne);

  // ─── Filtrage produits ─────────────────────────────────
  const produitsFiltres = PRODUITS_REF.filter((p) => {
    const matchCategorie = !categorieFiltre || p.categorie === categorieFiltre;
    const matchRecherche =
      !recherche ||
      p.nom.toLowerCase().includes(recherche.toLowerCase());
    return matchCategorie && matchRecherche;
  });

  // Grouper par sous-catégorie
  const groupes = produitsFiltres.reduce(
    (acc, p) => {
      if (!acc[p.sousCategorie]) acc[p.sousCategorie] = [];
      acc[p.sousCategorie].push(p);
      return acc;
    },
    {} as Record<string, typeof PRODUITS_REF>
  );

  // ─── Soumission ────────────────────────────────────────
  const soumettre = async () => {
    if (!user || !produit || !prixSaisi || !uniteSelectionnee) return;

    const prix = parseFloat(prixSaisi.replace(/\s/g, "").replace(",", "."));
    if (isNaN(prix) || prix <= 0) {
      Alert.alert("Prix invalide", "Entre un prix valide en FCFA.");
      return;
    }
    if (prix > 500000) {
      Alert.alert("Prix suspect", "Ce prix semble anormalement élevé. Vérifie et réessaie.");
      return;
    }

    setLoading(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      const id = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${user.id}_${produit.id}_${Date.now()}`
      );

      const signalement: Signalement = {
        id: id.substring(0, 36),
        userId: user.id,
        produitId: produit.id,
        produitNom: produit.nom,
        categorie: produit.categorie,
        sousCategorie: produit.sousCategorie,
        prix,
        unite: uniteSelectionnee as any,
        commune: communeSelectee,
        quartier: quartier.trim(),
        typeLieu: typeLieu as any,
        nomLieu: nomLieu.trim(),
        latitude,
        longitude,
        dateSignalement: new Date().toISOString(),
        scoreFilabilite: Math.round(user.scoreConfiance * 0.6),
        nbConfirmations: 0,
        nbContestations: 0,
        synced: false,
        createdAt: new Date().toISOString(),
      };

      await insertSignalement(signalement);

      Alert.alert(
        "Signalement enregistré ✓",
        `Prix de ${produit.nom} signalé à ${prix.toLocaleString("fr-FR")} FCFA à ${communeSelectee}.\n\nIl sera partagé avec la communauté dès que tu auras du réseau.`,
        [{ text: "OK", onPress: () => router.push("/(tabs)/") }]
      );
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'enregistrer le signalement. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Étape 1 : Choix du produit ────────────────────────
  if (etape === "produit") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quel produit ?</Text>
        </View>

        <View style={styles.categorieToggle}>
          {(["alimentation", "transport"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categorieBtn,
                categorieFiltre === cat && styles.categorieBtnActive,
              ]}
              onPress={() =>
                setCategorieFiltre(categorieFiltre === cat ? null : cat)
              }
            >
              <Text
                style={[
                  styles.categorieBtnText,
                  categorieFiltre === cat && styles.categorieBtnTextActive,
                ]}
              >
                {cat === "alimentation" ? "🛒 Alimentation" : "🚌 Transport"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit…"
          value={recherche}
          onChangeText={setRecherche}
          placeholderTextColor="#AAAAAA"
        />

        <ScrollView style={styles.scroll}>
          {Object.entries(groupes).map(([souscat, items]) => (
            <View key={souscat}>
              <Text style={styles.sousCategLabel}>
                {LABELS_SOUS_CATEGORIE[souscat] ?? souscat}
              </Text>
              {items.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.produitItem}
                  onPress={() => {
                    setProduitSelectionne(p.id);
                    setUniteSelectionnee(p.uniteDefaut);
                    setEtape("prix");
                  }}
                >
                  <Text style={styles.produitNom}>{p.nom}</Text>
                  {p.prixReference && (
                    <Text style={styles.produitRef}>
                      Réf: {p.prixReference.toLocaleString("fr-FR")} FCFA
                      /{LABELS_UNITE[p.uniteDefaut]}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Étape 2 : Saisie du prix ──────────────────────────
  if (etape === "prix") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setEtape("produit")}>
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prix observé</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.etapeContent}>
          <Text style={styles.produitChoisi}>{produit?.nom}</Text>

          {produit?.prixReference && (
            <View style={styles.refBox}>
              <Text style={styles.refText}>
                💡 Prix de référence OCPV :{" "}
                <Text style={styles.refPrix}>
                  {produit.prixReference.toLocaleString("fr-FR")} FCFA
                </Text>
                /{LABELS_UNITE[produit.uniteDefaut]}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Prix en FCFA</Text>
          <TextInput
            style={styles.prixInput}
            placeholder="Ex: 500"
            value={prixSaisi}
            onChangeText={setPrixSaisi}
            keyboardType="numeric"
            placeholderTextColor="#AAAAAA"
            autoFocus
          />

          <Text style={styles.label}>Unité</Text>
          <View style={styles.uniteRow}>
            {produit?.unitesDisponibles.map((u) => (
              <TouchableOpacity
                key={u}
                style={[
                  styles.uniteChip,
                  uniteSelectionnee === u && styles.uniteChipActive,
                ]}
                onPress={() => setUniteSelectionnee(u)}
              >
                <Text
                  style={[
                    styles.uniteChipText,
                    uniteSelectionnee === u && styles.uniteChipTextActive,
                  ]}
                >
                  {LABELS_UNITE[u] ?? u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, !prixSaisi && styles.nextBtnDisabled]}
            onPress={() => prixSaisi && setEtape("lieu")}
            disabled={!prixSaisi}
          >
            <Text style={styles.nextBtnText}>Suivant →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Étape 3 : Lieu ────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setEtape("prix")}>
          <Text style={styles.headerBack}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Où as-tu vu ce prix ?</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.etapeContent}>
        <View style={styles.recapBox}>
          <Text style={styles.recapText}>
            {produit?.nom} · {parseFloat(prixSaisi || "0").toLocaleString("fr-FR")} FCFA
            /{LABELS_UNITE[uniteSelectionnee ?? ""] ?? uniteSelectionnee}
          </Text>
        </View>

        {/* Type de lieu */}
        <Text style={styles.label}>Type de point de vente</Text>
        <View style={styles.typeLieuGrid}>
          {TYPES_LIEU.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeLieuItem, typeLieu === t.id && styles.typeLieuItemActive]}
              onPress={() => setTypeLieu(t.id)}
            >
              <Text style={styles.typeLieuEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLieuLabel, typeLieu === t.id && styles.typeLieuLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nom du lieu */}
        <Text style={styles.label}>Nom du lieu (optionnel)</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Ex: Marché Siporex, Sococé Yopougon…"
          value={nomLieu}
          onChangeText={setNomLieu}
          placeholderTextColor="#AAAAAA"
        />
        <Text style={styles.fieldHint}>
          Plus tu es précis, plus les citoyens peuvent trouver le bon endroit.
        </Text>

        {/* Commune */}
        <Text style={styles.label}>Commune</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={styles.communeRow}>
            {COMMUNES_ABIDJAN.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.communeChip, communeSelectee === c && styles.communeChipActive]}
                onPress={() => setCommuneSelectee(c)}
              >
                <Text style={[styles.communeChipText, communeSelectee === c && styles.communeChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.nextBtnDisabled]}
          onPress={soumettre}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>📢 Publier le signalement</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Ton signalement est anonyme. Il sera visible par la communauté après vérification.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const VERT = "#0A5F38";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },
  header: {
    backgroundColor: VERT,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  headerBack: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  scroll: { flex: 1 },
  etapeContent: { padding: 20, gap: 8 },
  categorieToggle: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  categorieBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  categorieBtnActive: { backgroundColor: VERT },
  categorieBtnText: { fontSize: 13, color: "#555555", fontWeight: "600" },
  categorieBtnTextActive: { color: "#FFFFFF" },
  searchInput: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  sousCategLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: VERT,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  produitItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  produitNom: { fontSize: 14, color: "#1A1A1A", fontWeight: "500", flex: 1 },
  produitRef: { fontSize: 12, color: "#888888" },
  produitChoisi: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  refBox: {
    backgroundColor: "#E8F5EE",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  refText: { fontSize: 13, color: "#0A5F38" },
  refPrix: { fontWeight: "700" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  prixInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    borderWidth: 2,
    borderColor: VERT,
    marginBottom: 8,
  },
  uniteRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  uniteChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  uniteChipActive: { backgroundColor: VERT },
  uniteChipText: { fontSize: 13, color: "#555555" },
  uniteChipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  nextBtn: {
    backgroundColor: VERT,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  recapBox: {
    backgroundColor: "#E8F5EE",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  recapText: { fontSize: 15, color: VERT, fontWeight: "600" },
  communeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 0 },
  communeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  communeChipActive: { backgroundColor: VERT },
  communeChipText: { fontSize: 13, color: "#555555" },
  communeChipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  submitBtn: {
    backgroundColor: VERT,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disclaimer: {
    fontSize: 11,
    color: "#AAAAAA",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
  },
  typeLieuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  typeLieuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  typeLieuItemActive: {
    backgroundColor: "#E8F5EE",
    borderColor: "#0A5F38",
  },
  typeLieuEmoji: { fontSize: 18 },
  typeLieuLabel: { fontSize: 12, color: "#555555", fontWeight: "500" },
  typeLieuLabelActive: { color: "#0A5F38", fontWeight: "700" },
  fieldHint: {
    fontSize: 11,
    color: "#AAAAAA",
    marginBottom: 16,
    marginTop: -8,
  },
});
