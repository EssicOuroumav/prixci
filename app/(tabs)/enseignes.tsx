import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getEnseignesByCommune, infoTypeEnseigne, Enseigne } from "@/services/enseignes";
import SelecteurZone from "@/components/SelecteurZone";
import { useAppStore } from "@/stores/useAppStore";
import Icone from "@/components/Icone";

export default function EnseignesScreen() {
  // Même commune que sur les autres onglets
  const { user, communeSelectionnee: commune, setCommuneSelectionnee: setCommune } = useAppStore();
  const [enseignes, setEnseignes] = useState<Enseigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);

  const charger = useCallback(async () => {
    try {
      setEnseignes(await getEnseignesByCommune(commune));
      setHorsLigne(false);
    } catch {
      // Les enseignes viennent du serveur : rien à afficher sans réseau
      setEnseignes([]);
      setHorsLigne(true);
    } finally {
      setLoading(false);
    }
  }, [commune]);

  // Recharge au retour sur l'onglet (après une inscription) et au changement de commune
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      charger();
    }, [charger])
  );

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
      <SelecteurZone zone={commune} onChange={setCommune} />
      <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <ActivityIndicator color="#0A5F38" style={{ marginTop: 40 }} />
        ) : horsLigne ? (
          <View style={styles.empty}>
            <Icone nom="cloud-offline-outline" taille={48} couleur="#B8C4BC" />
            <Text style={styles.emptyTitle}>Connexion nécessaire</Text>
            <Text style={styles.emptyText}>Les enseignes s'affichent dès que le réseau revient. Tire vers le bas pour réessayer.</Text>
          </View>
        ) : enseignes.length === 0 ? (
          <View style={styles.empty}>
            <Icone nom="storefront-outline" taille={48} couleur="#B8C4BC" />
            <Text style={styles.emptyTitle}>Aucune enseigne à {commune}</Text>
            <Text style={styles.emptyText}>Soyez le premier à inscrire votre commerce !</Text>
          </View>
        ) : (
          enseignes.map((e) => (
            <TouchableOpacity key={e.id} style={styles.card} onPress={() => router.push({ pathname: "/enseigne/[id]", params: { id: e.id } })}>
              <View style={styles.cardLeft}>
                <Icone nom={infoTypeEnseigne(e.type).icone} taille={28} couleur="#0A5F38" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNom} numberOfLines={1}>{e.nom}</Text>
                  <Text style={styles.cardType}>{infoTypeEnseigne(e.type).label} · {e.commune}</Text>
                  {e.quartier ? <Text style={styles.cardAdresse}>{e.quartier}</Text> : null}
                </View>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{e.ownerId === user?.id ? "Mon enseigne" : "Officiel"}</Text>
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
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 8, marginTop: 16 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center" },
  btnInscription: { backgroundColor: "#0A5F38", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16, marginBottom: 32 },
  btnInscriptionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});