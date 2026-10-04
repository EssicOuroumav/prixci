import React, { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { insertSignalement, getLieuxConnus, dejaSignaleAujourdhui } from "@/services/db";
import { prixDeReference, comparerAuPrixOfficiel, libelleReference } from "@/services/reference";
import { syncAvecStore } from "@/services/sync";
import { scoreInitialSignalement, SEUIL_APPUIS } from "@/services/scoring";
import SelecteurZone from "@/components/SelecteurZone";
import Icone from "@/components/Icone";
import SelecteurCategorie from "@/components/SelecteurCategorie";
import {
  Signalement,
  TYPES_LIEU,
  TypeLieu,
  Unite,
  MomentTrajet,
  MOMENTS_TRAJET,
  infoTypeLieu,
} from "@/constants/types";
import {
  PRODUITS_REF,
  LABELS_SOUS_CATEGORIE,
  LABELS_UNITE,
} from "@/constants/produits";

// Lieux proposés pour un produit alimentaire (les transports partent d'une gare ou d'un arrêt)
const TYPES_LIEU_ALIMENTATION = TYPES_LIEU.filter((t) => t.id !== "gare_routiere");
const PRIX_MAX = 500000;

function lirePrix(saisie: string): number {
  return parseFloat(saisie.replace(/\s/g, "").replace(",", "."));
}

/**
 * Position GPS sans jamais bloquer le signalement : dernière position connue,
 * sinon une mesure limitée à 4 secondes, sinon rien.
 */
async function lirePosition(): Promise<{ latitude?: number; longitude?: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return {};
    const connue = await Location.getLastKnownPositionAsync();
    const position =
      connue ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]));
    if (!position) return {};
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return {};
  }
}

export default function SignalerScreen() {
  const router = useRouter();
  const { user, setUser, communeSelectionnee, categorieActive } = useAppStore();

  const [etape, setEtape] = useState<"produit" | "prix" | "lieu">("produit");
  const [produitSelectionne, setProduitSelectionne] = useState<string | null>(null);
  const [prixSaisi, setPrixSaisi] = useState("");
  const [uniteSelectionnee, setUniteSelectionnee] = useState<Unite | null>(null);
  const [communeSelectee, setCommuneSelectee] = useState(communeSelectionnee);
  const [quartier, setQuartier] = useState("");
  const [typeLieu, setTypeLieu] = useState<TypeLieu>("marche_traditionnel");
  const [nomLieu, setNomLieu] = useState("");
  const [moment, setMoment] = useState<MomentTrajet>("normal");
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(false);
  const [lieuxConnus, setLieuxConnus] = useState<{ typeLieu: string; nomLieu: string }[]>([]);

  // Arrivée depuis la fiche d'un commerce : le lieu est déjà connu
  const prerempli = useLocalSearchParams<{ commune?: string; typeLieu?: string; nomLieu?: string }>();
  useEffect(() => {
    if (!prerempli.nomLieu) return;
    setNomLieu(prerempli.nomLieu);
    if (prerempli.typeLieu) setTypeLieu(prerempli.typeLieu as TypeLieu);
    if (prerempli.commune) setCommuneSelectee(prerempli.commune);
  }, [prerempli.nomLieu, prerempli.typeLieu, prerempli.commune]);

  // Commerces déjà cités dans la zone, pour réutiliser exactement le même nom
  useEffect(() => {
    getLieuxConnus(communeSelectee).then(setLieuxConnus).catch(() => setLieuxConnus([]));
  }, [communeSelectee, etape]);

  const produit = PRODUITS_REF.find((p) => p.id === produitSelectionne);
  const estTransport = produit?.categorie === "transport";
  const prixNum = lirePrix(prixSaisi);

  // Prix officiel du produit dans la zone, dans l'unité choisie
  const reference =
    produit && uniteSelectionnee
      ? prixDeReference(produit.id, uniteSelectionnee, communeSelectee)
      : null;
  const comparaison = prixNum > 0 ? comparerAuPrixOfficiel(prixNum, reference) : null;

  const saisieLieu = nomLieu.trim().toLowerCase();
  const suggestions = lieuxConnus
    .filter((l) => !saisieLieu || l.nomLieu.toLowerCase().includes(saisieLieu))
    .filter((l) => l.nomLieu.toLowerCase() !== saisieLieu)
    .slice(0, 6);

  const reinitialiser = () => {
    setEtape("produit");
    setProduitSelectionne(null);
    setPrixSaisi("");
    setUniteSelectionnee(null);
    setQuartier("");
    setTypeLieu("marche_traditionnel");
    setNomLieu("");
    setMoment("normal");
    setRecherche("");
  };

  // ─── Filtrage produits ─────────────────────────────────
  const produitsFiltres = PRODUITS_REF.filter((p) => {
    const matchCategorie = p.categorie === categorieActive;
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

    const prix = prixNum;
    if (isNaN(prix) || prix <= 0) {
      Alert.alert("Prix invalide", "Entre un prix valide en FCFA.");
      return;
    }
    if (prix > PRIX_MAX) {
      Alert.alert("Prix suspect", "Ce prix semble anormalement élevé. Vérifie et réessaie.");
      return;
    }

    // Un commerce ne peut être classé que s'il est nommé
    const lieu = nomLieu.trim().replace(/\s+/g, " ");
    if (!estTransport && lieu.length < 3) {
      Alert.alert(
        "Nom du commerce manquant",
        "Indique le nom du commerce ou du marché : c'est ce qui permet de savoir où ce prix est pratiqué."
      );
      return;
    }

    setLoading(true);
    try {
      if (await dejaSignaleAujourdhui(user.id, produit.id, communeSelectee, lieu)) {
        Alert.alert(
          "Déjà signalé",
          "Tu as déjà signalé ce produit à cet endroit aujourd'hui. Tu pourras le refaire demain."
        );
        return;
      }

      const { latitude, longitude } = await lirePosition();

      const id = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${user.id}_${produit.id}_${Date.now()}`
      );

      const maintenant = new Date().toISOString();
      const signalement: Signalement = {
        id: id.substring(0, 36),
        userId: user.id,
        produitId: produit.id,
        produitNom: produit.nom,
        categorie: produit.categorie,
        sousCategorie: produit.sousCategorie,
        prix,
        unite: uniteSelectionnee,
        commune: communeSelectee,
        quartier: quartier.trim(),
        typeLieu: estTransport ? "gare_routiere" : typeLieu,
        nomLieu: lieu,
        moment: estTransport ? moment : "normal",
        latitude,
        longitude,
        dateSignalement: maintenant,
        scoreFilabilite: scoreInitialSignalement(user.scoreConfiance),
        nbConfirmations: 0,
        nbContestations: 0,
        synced: false,
        createdAt: maintenant,
      };

      await insertSignalement(signalement);
      setUser({ ...user, nbSignalements: user.nbSignalements + 1 });

      // Envoi au serveur sans attendre : rien à faire si le réseau manque
      syncAvecStore();

      const nomProduit = produit.nom;
      reinitialiser();
      Alert.alert(
        "Signalement enregistré",
        `${nomProduit} à ${prix.toLocaleString("fr-FR")} FCFA, ${communeSelectee}.\n\nIl sera vérifié dès que ${SEUIL_APPUIS} citoyens auront constaté le même prix.`,
        [{ text: "OK", onPress: () => router.navigate("/(tabs)") }]
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
          <Text style={styles.headerEtape}>Étape 1 sur 3</Text>
          <Text style={styles.headerTitle}>
            {categorieActive === "transport" ? "Quel trajet ?" : "Quel produit ?"}
          </Text>
        </View>

        <SelecteurCategorie />

        <TextInput
          style={styles.searchInput}
          placeholder={categorieActive === "transport" ? "Rechercher un trajet…" : "Rechercher un produit…"}
          value={recherche}
          onChangeText={setRecherche}
          placeholderTextColor="#AAAAAA"
          autoCorrect={false}
        />

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
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
                  {prixDeReference(p.id, p.uniteDefaut, communeSelectee) && (
                    <Text style={styles.produitRef}>
                      Officiel : {prixDeReference(p.id, p.uniteDefaut, communeSelectee)!.prix.toLocaleString("fr-FR")} FCFA
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.etapeContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.produitChoisi}>{produit?.nom}</Text>

          {reference && (
            <View
              style={[
                styles.refBox,
                comparaison?.statut === "depassement" && { backgroundColor: "#FDECEA" },
              ]}
            >
              <Text
                style={[
                  styles.refText,
                  comparaison?.statut === "depassement" && { color: "#C0392B" },
                ]}
              >
                {libelleReference(reference.type)} à {reference.ville} :{" "}
                <Text style={styles.refPrix}>
                  {reference.prix.toLocaleString("fr-FR")} FCFA
                </Text>
                /{LABELS_UNITE[reference.unite] ?? reference.unite}
                {comparaison?.statut === "depassement"
                  ? `\nLe prix saisi le dépasse de ${comparaison.ecartPct} %.`
                  : ""}
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
            style={[styles.nextBtn, !(prixNum > 0) && styles.nextBtnDisabled]}
            onPress={() => setEtape("lieu")}
            disabled={!(prixNum > 0)}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.etapeContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.recapBox}>
          <Text style={styles.recapText}>
            {produit?.nom} · {(prixNum || 0).toLocaleString("fr-FR")} FCFA
            /{LABELS_UNITE[uniteSelectionnee ?? ""] ?? uniteSelectionnee}
          </Text>
        </View>

        {/* Commune */}
        <Text style={styles.label}>Ville et commune</Text>
        <View style={styles.zoneBox}>
          <SelecteurZone zone={communeSelectee} onChange={setCommuneSelectee} />
        </View>

        {/* Quartier */}
        <Text style={styles.label}>Quartier (optionnel)</Text>
        <TextInput
          style={styles.champ}
          placeholder="Ex: Siporex, Angré, Zone 4…"
          value={quartier}
          onChangeText={setQuartier}
          placeholderTextColor="#AAAAAA"
          maxLength={60}
        />

        {/* Type de lieu : sans objet pour un trajet */}
        {!estTransport && (
          <>
            <Text style={styles.label}>Type de point de vente</Text>
            <View style={styles.typeLieuGrid}>
              {TYPES_LIEU_ALIMENTATION.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeLieuItem, typeLieu === t.id && styles.typeLieuItemActive]}
                  onPress={() => setTypeLieu(t.id)}
                >
                  <Icone nom={t.icone} taille={18} couleur={typeLieu === t.id ? VERT : "#555555"} />
                  <Text style={[styles.typeLieuLabel, typeLieu === t.id && styles.typeLieuLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Nom du commerce (alimentation) ou de la gare (transport) */}
        <Text style={styles.label}>
          {estTransport ? "Gare ou arrêt de départ (optionnel)" : "Nom du commerce ou du marché"}
        </Text>
        <TextInput
          style={styles.champ}
          placeholder={
            estTransport
              ? "Ex: Terminus Selmer, Carrefour Attoban…"
              : "Ex: Marché Siporex, Sococé Yopougon…"
          }
          value={nomLieu}
          onChangeText={setNomLieu}
          placeholderTextColor="#AAAAAA"
          maxLength={80}
        />
        {!estTransport && suggestions.length > 0 && (
          <View style={styles.typeLieuGrid}>
            {suggestions.map((l) => (
              <TouchableOpacity
                key={`${l.typeLieu}|${l.nomLieu}`}
                style={styles.suggestion}
                onPress={() => {
                  setNomLieu(l.nomLieu);
                  setTypeLieu(l.typeLieu as TypeLieu);
                }}
              >
                <Icone nom={infoTypeLieu(l.typeLieu).icone} taille={14} couleur={VERT} />
                <Text style={styles.suggestionText}>{l.nomLieu}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.fieldHint}>
          {estTransport
            ? "Plus tu es précis, plus le tarif est utile aux autres."
            : "Choisis un nom déjà proposé s'il s'agit du même commerce : c'est ce qui permet de le classer."}
        </Text>

        {/* Moment du trajet : le tarif en dépend */}
        {estTransport && (
          <>
            <Text style={styles.label}>Moment du trajet</Text>
            <View style={styles.typeLieuGrid}>
              {MOMENTS_TRAJET.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.typeLieuItem, moment === m.id && styles.typeLieuItemActive]}
                  onPress={() => setMoment(m.id)}
                >
                  <Icone nom={m.icone} taille={18} couleur={moment === m.id ? VERT : "#555555"} />
                  <Text style={[styles.typeLieuLabel, moment === m.id && styles.typeLieuLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.nextBtnDisabled]}
          onPress={soumettre}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Publier le signalement</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Ton signalement est anonyme. Il est vérifié dès que {SEUIL_APPUIS} citoyens constatent le même prix au même endroit.
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
  headerEtape: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  zoneBox: { borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#E8F5EE",
  },
  suggestionText: { fontSize: 12, color: "#0A5F38", fontWeight: "600" },
  champ: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 12,
  },
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
    marginBottom: 8,
    marginTop: -6,
  },
});
