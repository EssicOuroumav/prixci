import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { inscrireEnseigne, TypeEnseigne, TYPES_ENSEIGNE } from "@/services/enseignes";
import SelecteurZone from "@/components/SelecteurZone";
import { useAppStore } from "@/stores/useAppStore";
import Icone from "@/components/Icone";
import { HAUT_ECRAN } from "@/constants/layout";

export default function InscriptionEnseigne() {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeEnseigne | null>(null);
  const { communeSelectionnee } = useAppStore();
  const [commune, setCommune] = useState<string>(communeSelectionnee);
  const [quartier, setQuartier] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleInscription() {
    if (nom.trim().length < 2) return Alert.alert("Erreur", "Le nom est requis.");
    if (!type) return Alert.alert("Erreur", "Choisissez un type d'enseigne.");
    if (!commune) return Alert.alert("Erreur", "Choisissez une commune.");
    setLoading(true);
    try {
      const enseigne = await inscrireEnseigne({
        nom: nom.trim(),
        type,
        commune,
        quartier: quartier.trim(),
        adresse: adresse.trim(),
        telephone: telephone.trim(),
      });
      Alert.alert("Inscription réussie", `${enseigne.nom} est inscrit sur PrixCI. Tu peux maintenant publier tes prix.`, [
        {
          text: "Publier mes prix",
          onPress: () => router.replace({ pathname: "/enseigne/[id]", params: { id: enseigne.id } }),
        },
      ]);
    } catch {
      Alert.alert("Inscription impossible", "Vérifie ta connexion internet et réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Retour</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Inscrire une enseigne</Text>
      <Text style={styles.subtitle}>Rejoignez PrixCI pour afficher vos prix et attirer des clients.</Text>

      <Text style={styles.label}>Nom de l'enseigne *</Text>
      <TextInput style={styles.input} placeholder="Ex: Supermarché AXA Marcory" value={nom} onChangeText={setNom} maxLength={80} placeholderTextColor="#AAAAAA" />

      <Text style={styles.label}>Type *</Text>
      <View style={styles.row}>
        {TYPES_ENSEIGNE.map((t) => (
          <TouchableOpacity key={t.value} style={[styles.chip, type === t.value && styles.chipActive]} onPress={() => setType(t.value)}>
            <Icone nom={t.icone} taille={16} couleur={type === t.value ? "#FFFFFF" : "#333333"} />
            <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ville et commune *</Text>
      <SelecteurZone zone={commune} onChange={setCommune} />

      <Text style={styles.label}>Quartier</Text>
      <TextInput style={styles.input} placeholder="Ex: Zone 4" value={quartier} onChangeText={setQuartier} />

      <Text style={styles.label}>Adresse</Text>
      <TextInput style={styles.input} placeholder="Ex: Rue des Jardins, face Total" value={adresse} onChangeText={setAdresse} />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput style={styles.input} placeholder="Ex: 07 00 00 00 00" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />

      <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleInscription} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>S'inscrire sur PrixCI</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingTop: HAUT_ECRAN, paddingBottom: 40 },
  back: { color: "#0A5F38", fontSize: 14, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#0A5F38", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: "#fafafa" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipActive: { backgroundColor: "#0A5F38", borderColor: "#0A5F38" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  btn: { backgroundColor: "#0A5F38", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 32 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});