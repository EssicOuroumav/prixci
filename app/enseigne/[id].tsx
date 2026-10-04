import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { getPrixOfficielsByEnseigne, publierPrixOfficiel, supprimerPrixOfficiel, PrixOfficiel } from "@/services/enseignes";

export default function EnseigneDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prix, setPrix] = useState<PrixOfficiel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [produitNom, setProduitNom] = useState("");
  const [prixVal, setPrixVal] = useState("");
  const [unite, setUnite] = useState("kg");
  const [saving, setSaving] = useState(false);

  useEffect(() => { charger(); }, [id]);

  async function charger() {
    setLoading(true);
    try {
      const data = await getPrixOfficielsByEnseigne(id);
      setPrix(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAjouterPrix() {
    if (!produitNom.trim()) return Alert.alert("Erreur", "Le nom du produit est requis.");
    if (!prixVal.trim()) return Alert.alert("Erreur", "Le prix est requis.");
    setSaving(true);
    try {
      await publierPrixOfficiel({
        enseigneId: id,
        produitId: produitNom.toLowerCase().replace(/\s+/g, "_"),
        produitNom,
        categorie: "alimentation",
        prix: parseFloat(prixVal),
        unite,
      });
      setProduitNom("");
      setPrixVal("");
      setShowForm(false);
      await charger();
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSupprimer(prixId: string) {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce prix ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => { await supprimerPrixOfficiel(prixId); await charger(); } }
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Prix officiels</Text>
        <Text style={styles.subtitle}>Gérez vos prix publics</Text>
      </View>
      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator color="#0A5F38" style={{ marginTop: 40 }} />
        ) : (
          <>
            {prix.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun prix publié pour l'instant.</Text>
              </View>
            ) : (
              prix.map((p) => (
                <View key={p.id} style={styles.card}>
                  <View>
                    <Text style={styles.produitNom}>{p.produitNom}</Text>
                    <Text style={styles.produitUnite}>par {p.unite}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.prix}>{p.prix} F</Text>
                    <TouchableOpacity onPress={() => handleSupprimer(p.id)}>
                      <Text style={styles.supprimer}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            {showForm ? (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Ajouter un prix</Text>
                <TextInput style={styles.input} placeholder="Nom du produit (ex: Oignon)" value={produitNom} onChangeText={setProduitNom} />
                <TextInput style={styles.input} placeholder="Prix en FCFA" value={prixVal} onChangeText={setPrixVal} keyboardType="numeric" />
                <View style={styles.row}>
                  {["kg", "tas", "unité", "litre"].map((u) => (
                    <TouchableOpacity key={u} style={[styles.chip, unite === u && styles.chipActive]} onPress={() => setUnite(u)}>
                      <Text style={[styles.chipText, unite === u && styles.chipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.btn} onPress={handleAjouterPrix} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Publier ce prix</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <Text style={styles.annuler}>Annuler</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.btnAjouter} onPress={() => setShowForm(true)}>
                <Text style={styles.btnAjouterText}>+ Ajouter un prix</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { backgroundColor: "#0A5F38", padding: 20, paddingTop: 60 },
  back: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  produitNom: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  produitUnite: { fontSize: 13, color: "#666", marginTop: 2 },
  prix: { fontSize: 20, fontWeight: "700", color: "#0A5F38" },
  supprimer: { fontSize: 20 },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 16, color: "#666" },
  form: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  formTitle: { fontSize: 18, fontWeight: "700", color: "#0A5F38", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: "#fafafa", marginBottom: 12 },
  row: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipActive: { backgroundColor: "#0A5F38", borderColor: "#0A5F38" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  btn: { backgroundColor: "#0A5F38", borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 12 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  annuler: { textAlign: "center", color: "#666", fontSize: 14 },
  btnAjouter: { backgroundColor: "#0A5F38", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16, marginBottom: 32 },
  btnAjouterText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});