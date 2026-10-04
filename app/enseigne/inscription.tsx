import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { inscrireEnseigne, TypeEnseigne } from "@/services/enseignes";

const COMMUNES = ["Abobo", "Adjamé", "Attécoubé", "Cocody", "Koumassi", "Marcory", "Plateau", "Port-Bouët", "Treichville", "Yopougon"];
const TYPES: { value: TypeEnseigne; label: string; emoji: string }[] = [
  { value: "supermarche", label: "Supermarché", emoji: "🏪" },
  { value: "boutique", label: "Boutique", emoji: "🏬" },
  { value: "pharmacie", label: "Pharmacie", emoji: "💊" },
  { value: "marche", label: "Marché", emoji: "🛒" },
];

export default function InscriptionEnseigne() {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeEnseigne | null>(null);
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleInscription() {
    if (!nom.trim()) return Alert.alert("Erreur", "Le nom est requis.");
    if (!type) return Alert.alert("Erreur", "Choisissez un type d'enseigne.");
    if (!commune) return Alert.alert("Erreur", "Choisissez une commune.");
    setLoading(true);
    try {
      await inscrireEnseigne({ nom, type, commune, quartier, adresse, telephone });
      Alert.alert("✅ Inscription réussie", `${nom} est maintenant inscrit sur PrixCI !`, [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Inscrire une enseigne</Text>
      <Text style={styles.subtitle}>Rejoignez PrixCI pour afficher vos prix et attirer des clients.</Text>

      <Text style={styles.label}>Nom de l'enseigne *</Text>
      <TextInput style={styles.input} placeholder="Ex: Supermarché AXA Marcory" value={nom} onChangeText={setNom} />

      <Text style={styles.label}>Type *</Text>
      <View style={styles.row}>
        {TYPES.map((t) => (
          <TouchableOpacity key={t.value} style={[styles.chip, type === t.value && styles.chipActive]} onPress={() => setType(t.value)}>
            <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>{t.emoji} {t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Commune *</Text>
      <View style={styles.row}>
        {COMMUNES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, commune === c && styles.chipActive]} onPress={() => setCommune(c)}>
            <Text style={[styles.chipText, commune === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#0A5F38", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: "#fafafa" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipActive: { backgroundColor: "#0A5F38", borderColor: "#0A5F38" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  btn: { backgroundColor: "#0A5F38", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 32 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});