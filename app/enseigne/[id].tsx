import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getEnseigneById,
  getPrixOfficielsByEnseigne,
  publierPrixOfficiel,
  supprimerPrixOfficiel,
  infoTypeEnseigne,
  Enseigne,
  PrixOfficiel,
} from "@/services/enseignes";
import { MOTIFS_ABUS, signalerAbus } from "@/services/abus";
import { PRODUITS_REF, LABELS_UNITE } from "@/constants/produits";
import { ProduitRef, Unite } from "@/constants/types";
import { useAppStore } from "@/stores/useAppStore";

// ============================================================
// FICHE D'UNE ENSEIGNE
// Lecture seule pour tout le monde ; le propriétaire gère ses prix.
// Route : /enseigne/[id]
// ============================================================

const PRIX_MAX = 500000;
// Une enseigne vend des produits : les trajets ne la concernent pas
const CATALOGUE = PRODUITS_REF.filter((p) => p.categorie === "alimentation");

export default function EnseigneDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAppStore();

  const [enseigne, setEnseigne] = useState<Enseigne | null>(null);
  const [prix, setPrix] = useState<PrixOfficiel[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Formulaire d'ajout (propriétaire uniquement)
  const [showForm, setShowForm] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [produit, setProduit] = useState<ProduitRef | null>(null);
  const [unite, setUnite] = useState<Unite | null>(null);
  const [prixVal, setPrixVal] = useState("");
  const [saving, setSaving] = useState(false);

  const estProprietaire = !!enseigne?.ownerId && enseigne.ownerId === user?.id;

  const charger = useCallback(async () => {
    if (!id) return;
    try {
      const [ens, liste] = await Promise.all([
        getEnseigneById(id),
        getPrixOfficielsByEnseigne(id),
      ]);
      setEnseigne(ens);
      setPrix(liste);
      setErreur(ens ? null : "Cette enseigne n'existe plus.");
    } catch {
      setErreur("Connexion nécessaire pour afficher cette enseigne.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { charger(); }, [charger]);

  const fermerFormulaire = () => {
    setShowForm(false);
    setRecherche("");
    setProduit(null);
    setUnite(null);
    setPrixVal("");
  };

  async function handleAjouterPrix() {
    if (!id || !produit || !unite) {
      return Alert.alert("Produit manquant", "Choisis un produit dans la liste.");
    }
    const valeur = parseFloat(prixVal.replace(/\s/g, "").replace(",", "."));
    if (isNaN(valeur) || valeur <= 0 || valeur > PRIX_MAX) {
      return Alert.alert("Prix invalide", "Entre un prix valide en FCFA.");
    }
    setSaving(true);
    try {
      await publierPrixOfficiel({
        enseigneId: id,
        produitId: produit.id,
        produitNom: produit.nom,
        categorie: produit.categorie,
        prix: valeur,
        unite,
      });
      fermerFormulaire();
      await charger();
    } catch {
      Alert.alert("Erreur", "Le prix n'a pas pu être publié. Vérifie ta connexion et réessaie.");
    } finally {
      setSaving(false);
    }
  }

  function handleSupprimer(p: PrixOfficiel) {
    Alert.alert("Supprimer ce prix ?", `${p.produitNom} · ${p.prix.toLocaleString("fr-FR")} FCFA`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await supprimerPrixOfficiel(p.id);
            await charger();
          } catch {
            Alert.alert("Erreur", "Suppression impossible. Vérifie ta connexion.");
          }
        },
      },
    ]);
  }

  const envoyerAbus = async (motif: string) => {
    if (!id) return;
    try {
      await signalerAbus("enseigne", id, motif);
      Alert.alert("Merci", "Cette enseigne a été transmise à l'équipe de modération.");
    } catch {
      Alert.alert("Hors ligne", "Connexion nécessaire pour signaler un abus.");
    }
  };

  const demanderMotifAbus = () =>
    Alert.alert("Signaler cette enseigne", "Quel est le problème ?", [
      ...MOTIFS_ABUS.map((motif) => ({ text: motif, onPress: () => envoyerAbus(motif) })),
      { text: "Annuler", style: "cancel" as const },
    ]);

  const terme = recherche.trim().toLowerCase();
  const suggestions = terme
    ? CATALOGUE.filter((p) => p.nom.toLowerCase().includes(terme)).slice(0, 8)
    : [];

  const type = infoTypeEnseigne(enseigne?.type ?? "boutique");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>
          {enseigne ? `${type.emoji} ${enseigne.nom}` : "Enseigne"}
        </Text>
        {enseigne && (
          <Text style={styles.subtitle}>
            {type.label} · {enseigne.commune}
            {enseigne.quartier ? ` · ${enseigne.quartier}` : ""}
          </Text>
        )}
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={VERT} style={{ marginTop: 40 }} />
        ) : erreur ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{erreur}</Text>
            <TouchableOpacity style={styles.btnSecondaire} onPress={() => { setLoading(true); charger(); }}>
              <Text style={styles.btnSecondaireText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {(enseigne?.adresse || enseigne?.telephone) && (
              <View style={styles.infos}>
                {enseigne.adresse ? <Text style={styles.infoText}>📍 {enseigne.adresse}</Text> : null}
                {enseigne.telephone ? <Text style={styles.infoText}>📞 {enseigne.telephone}</Text> : null}
              </View>
            )}

            {estProprietaire && (
              <View style={styles.proprietaireBox}>
                <Text style={styles.proprietaireText}>
                  C'est ton enseigne. Les prix que tu publies ici portent le badge « Officiel ».
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitre}>
              ✅ Prix officiels ({prix.length})
            </Text>

            {prix.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun prix publié pour l'instant.</Text>
              </View>
            ) : (
              prix.map((p) => (
                <View key={p.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.produitNom}>{p.produitNom}</Text>
                    <Text style={styles.produitUnite}>
                      par {LABELS_UNITE[p.unite] ?? p.unite} · mis à jour le{" "}
                      {new Date(p.dateMiseAJour).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.prix}>{p.prix.toLocaleString("fr-FR")} F</Text>
                    {estProprietaire && (
                      <TouchableOpacity onPress={() => handleSupprimer(p)} hitSlop={10}>
                        <Text style={styles.supprimer}>🗑</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}

            {estProprietaire && !showForm && (
              <TouchableOpacity style={styles.btn} onPress={() => setShowForm(true)}>
                <Text style={styles.btnText}>+ Ajouter ou modifier un prix</Text>
              </TouchableOpacity>
            )}

            {estProprietaire && showForm && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Publier un prix</Text>

                {produit ? (
                  <TouchableOpacity
                    style={styles.produitChoisi}
                    onPress={() => { setProduit(null); setUnite(null); }}
                  >
                    <Text style={styles.produitChoisiText}>{produit.nom}</Text>
                    <Text style={styles.changer}>Changer</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Rechercher un produit (ex: Oignon)"
                      value={recherche}
                      onChangeText={setRecherche}
                      placeholderTextColor="#AAAAAA"
                      autoCorrect={false}
                    />
                    {suggestions.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.suggestion}
                        onPress={() => {
                          setProduit(p);
                          setUnite(p.uniteDefaut);
                          setRecherche("");
                        }}
                      >
                        <Text style={styles.suggestionText}>{p.nom}</Text>
                      </TouchableOpacity>
                    ))}
                    {terme !== "" && suggestions.length === 0 && (
                      <Text style={styles.aucun}>Aucun produit du catalogue ne correspond.</Text>
                    )}
                  </>
                )}

                {produit && (
                  <>
                    <View style={styles.row}>
                      {produit.unitesDisponibles.map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.chip, unite === u && styles.chipActive]}
                          onPress={() => setUnite(u)}
                        >
                          <Text style={[styles.chipText, unite === u && styles.chipTextActive]}>
                            {LABELS_UNITE[u] ?? u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Prix en FCFA"
                      value={prixVal}
                      onChangeText={setPrixVal}
                      keyboardType="numeric"
                      placeholderTextColor="#AAAAAA"
                    />
                    <TouchableOpacity style={styles.btn} onPress={handleAjouterPrix} disabled={saving}>
                      {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Publier ce prix</Text>}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={fermerFormulaire}>
                  <Text style={styles.annuler}>Annuler</Text>
                </TouchableOpacity>
              </View>
            )}

            {!estProprietaire && (
              <TouchableOpacity onPress={demanderMotifAbus} style={styles.abusBtn}>
                <Text style={styles.abusText}>⚑ Signaler cette enseigne</Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const VERT = "#0A5F38";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },
  header: { backgroundColor: VERT, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  back: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  content: { flex: 1, padding: 16 },
  infos: { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 6, marginBottom: 12 },
  infoText: { fontSize: 13, color: "#444" },
  proprietaireBox: { backgroundColor: "#E8F5EE", borderRadius: 12, padding: 12, marginBottom: 12 },
  proprietaireText: { fontSize: 13, color: VERT, lineHeight: 18 },
  sectionTitre: { fontSize: 14, fontWeight: "800", color: "#1A1A1A", marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  produitNom: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  produitUnite: { fontSize: 12, color: "#888", marginTop: 2 },
  prix: { fontSize: 18, fontWeight: "800", color: VERT },
  supprimer: { fontSize: 18 },
  empty: { alignItems: "center", paddingVertical: 28, gap: 12 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center" },
  form: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 8 },
  formTitle: { fontSize: 16, fontWeight: "700", color: VERT, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#fafafa", marginBottom: 10, color: "#1A1A1A" },
  suggestion: { paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  suggestionText: { fontSize: 14, color: "#1A1A1A" },
  aucun: { fontSize: 13, color: "#999", marginBottom: 10 },
  produitChoisi: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 12, padding: 14, marginBottom: 12 },
  produitChoisiText: { fontSize: 15, fontWeight: "700", color: VERT, flex: 1 },
  changer: { fontSize: 13, color: VERT, textDecorationLine: "underline" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipActive: { backgroundColor: VERT, borderColor: VERT },
  chipText: { fontSize: 14, color: "#333" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  btn: { backgroundColor: VERT, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8, marginBottom: 12 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnSecondaire: { borderWidth: 1, borderColor: VERT, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  btnSecondaireText: { color: VERT, fontWeight: "700" },
  annuler: { textAlign: "center", color: "#666", fontSize: 14, paddingVertical: 6 },
  abusBtn: { alignItems: "center", paddingVertical: 16 },
  abusText: { fontSize: 12, color: "#999999", textDecorationLine: "underline" },
});
