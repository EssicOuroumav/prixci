import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { getEnseignesByCommune, Enseigne, TypeEnseigne } from "@/services/enseignes";

const COMMUNES = ["Abobo", "Adjamé", "Attécoubé", "Cocody", "Koumassi", "Marcory", "Plateau", "Port-Bouët", "Treichville", "Yopougon"];
const TYPE_EMOJI: Record<TypeEnseigne, string> = { supermarche: "🏪", boutique: "🏬", pharmacie: "💊", marche: "🛒" };
const TYPE_LABEL: Record<TypeEnseigne, string> = { supermarche: "Supermarché", boutique: "Boutique", pharmacie: "Pharmacie", marche: "Marché" };

export default function EnseignesScreen() {
  const [commune, setCommune] = useState("Abobo");
  const [enseignes, setEnseignes] = useState<Enseigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { charger(); }, [commune]);

  async function charger() {
    setLoading(true);
    try {
      const data = await getEnseignesByCommune(commune);
      setEnseignes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await charger();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enseignes</Text>
        <Text style={styles.subtitle}>Prix officiels par commune</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.communeScroll}>
        {COMMUNES.map((c) => (
          <TouchableOpacity key={c} style={[styles.communeChip, commune === c && styles.communeChipActive]} onPress={() => setCommune(c)}>
            <Text style={[styles.communeText, commune === c && styles.communeTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <ActivityIndicator color="#0A5F38" style={{ marginTop: 40 }} />
        ) : enseignes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏪</Text>
            <Text style={styles.emptyTitle}>Aucune enseigne à {commune}</Text>
            <Text style={styles.emptyText}>Soyez le premier à inscrire votre commerce !</Text>
          </View>
        ) : (
          enseignes.map((e) => (
            <TouchableOpacity key={e.id} style={styles.card} onPress={() => router.push(`/enseigne/${e.id}`)}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardEmoji}>{TYPE_EMOJI[e.type]}</Text>
                <View>
                  <Text style={styles.cardNom}>{e.nom}</Text>
                  <Text style={styles.cardType}>{TYPE_LABEL[e.type]} · {e.commune}</Text>
                  {e.quartier ? <Text style={styles.cardAdresse}>{e.quartier}</Text> : null}
                </View>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>✅ Officiel</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity style={styles.btnInscription} onPress={() => router.push("/enseigne/inscription")}>
          <Text style={styles.btnInscriptionText}>+ Inscrire mon enseigne</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { backgroundColor: "#0A5F38", padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  communeScroll: { backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 16, maxHeight: 56 },
  communeChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f0f0f0", marginRight: 8 },
  communeChipActive: { backgroundColor: "#0A5F38" },
  communeText: { fontSize: 14, color: "#333" },
  communeTextActive: { color: "#fff", fontWeight: "600" },
  list: { flex: 1, padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  cardEmoji: { fontSize: 32 },
  cardNom: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  cardType: { fontSize: 13, color: "#666", marginTop: 2 },
  cardAdresse: { fontSize: 12, color: "#999", marginTop: 2 },
  badge: { backgroundColor: "#e8f5e9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, color: "#0A5F38", fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center" },
  btnInscription: { backgroundColor: "#0A5F38", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16, marginBottom: 32 },
  btnInscriptionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});