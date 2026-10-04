import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { getPrixAgreges } from "@/services/db";
import { syncIfOnline } from "@/services/sync";
import { COMMUNES_ABIDJAN } from "@/constants/types";
import { LABELS_UNITE } from "@/constants/produits";

// ─── Composant carte prix ──────────────────────────────────
function PrixCard({
  produitNom,
  prixMoyen,
  prixMin,
  prixMax,
  unite,
  nbSignalements,
  derniereMAJ,
}: {
  produitNom: string;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  unite: string;
  nbSignalements: number;
  derniereMAJ: string;
}) {
  const ecart = prixMax - prixMin;
  const alerteEcart = ecart > prixMoyen * 0.3; // alerte si écart > 30%

  const dateRelative = () => {
    const diff = Date.now() - new Date(derniereMAJ).getTime();
    const heures = Math.floor(diff / 3600000);
    if (heures < 1) return "Il y a moins d'1h";
    if (heures < 24) return `Il y a ${heures}h`;
    const jours = Math.floor(heures / 24);
    return `Il y a ${jours}j`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNom} numberOfLines={1}>
          {produitNom}
        </Text>
        {alerteEcart && (
          <View style={styles.alerteBadge}>
            <Text style={styles.alerteText}>⚠ Écart</Text>
          </View>
        )}
      </View>
      <View style={styles.cardPrix}>
        <Text style={styles.prixMoyen}>
          {prixMoyen.toLocaleString("fr-FR")} FCFA
        </Text>
        <Text style={styles.prixUnite}>/ {LABELS_UNITE[unite] ?? unite}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          {prixMin.toLocaleString("fr-FR")} – {prixMax.toLocaleString("fr-FR")} FCFA
        </Text>
        <Text style={styles.cardMeta}>
          {nbSignalements} signal. · {dateRelative()}
        </Text>
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const {
    user,
    communeSelectionnee,
    setCommuneSelectionnee,
    prixAgreges,
    setPrixAgreges,
    syncStatus,
    setSyncStatus,
    setLastSyncAt,
    isInitialized,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const chargerDonnees = useCallback(async () => {
    try {
      const data = await getPrixAgreges(communeSelectionnee);
      setPrixAgreges(
        data.map((d) => ({
          produitId: d.produitId,
          produitNom: d.produitNom,
          commune: communeSelectionnee,
          prixMoyen: d.prixMoyen,
          prixMin: d.prixMin,
          prixMax: d.prixMax,
          unite: d.unite as any,
          nbSignalements: d.nbSignalements,
          derniereMAJ: d.derniereMAJ,
          tendance: "stable",
        }))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communeSelectionnee]);

  useEffect(() => {
    if (isInitialized) {
      setLoading(true);
      chargerDonnees();
    }
  }, [communeSelectionnee, isInitialized]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncIfOnline(communeSelectionnee, (status) => {
      setSyncStatus(status);
      if (status === "success") setLastSyncAt(new Date().toISOString());
    });
    await chargerDonnees();
  }, [communeSelectionnee]);

  const syncIndicator = () => {
    if (syncStatus === "syncing") return "🔄 Synchronisation…";
    if (syncStatus === "offline") return "📵 Hors ligne";
    if (syncStatus === "success") return "✓ Synchronisé";
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PrixCI</Text>
          <Text style={styles.headerSub}>La transparence des prix à Abidjan</Text>
        </View>
        {syncIndicator() && (
          <Text style={styles.syncIndicator}>{syncIndicator()}</Text>
        )}
      </View>

      {/* Sélecteur de commune */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.communeScroll}
        contentContainerStyle={styles.communeScrollContent}
      >
        {COMMUNES_ABIDJAN.map((commune) => (
          <TouchableOpacity
            key={commune}
            style={[
              styles.communeChip,
              communeSelectionnee === commune && styles.communeChipActive,
            ]}
            onPress={() => setCommuneSelectionnee(commune)}
          >
            <Text
              style={[
                styles.communeChipText,
                communeSelectionnee === commune && styles.communeChipTextActive,
              ]}
            >
              {commune}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contenu */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0A5F38" />
          <Text style={styles.loadingText}>Chargement des prix…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0A5F38"]}
              tintColor="#0A5F38"
            />
          }
        >
          {prixAgreges.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyTitle}>
                Aucun prix disponible à {communeSelectionnee}
              </Text>
              <Text style={styles.emptySubtitle}>
                Sois le premier à signaler un prix dans cette commune !
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push("/(tabs)/signaler")}
              >
                <Text style={styles.ctaButtonText}>Signaler un prix</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {prixAgreges.length} produits suivis à {communeSelectionnee}
              </Text>
              {prixAgreges.map((prix) => (
                <PrixCard key={`${prix.produitId}-${prix.unite}`} {...prix} />
              ))}
              <View style={styles.bottomPadding} />
            </>
          )}
        </ScrollView>
      )}

      {/* FAB Signaler */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(tabs)/signaler")}
      >
        <Text style={styles.fabText}>+ Signaler</Text>
      </TouchableOpacity>
    </View>
  );
}

const VERT = "#0A5F38";
const VERT_CLAIR = "#E8F5EE";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },
  header: {
    backgroundColor: VERT,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  syncIndicator: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
  communeScroll: { maxHeight: 50, backgroundColor: "#FFFFFF" },
  communeScrollContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  communeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  communeChipActive: { backgroundColor: VERT },
  communeChipText: { fontSize: 13, color: "#555555", fontWeight: "500" },
  communeChipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    color: "#888888",
    marginBottom: 12,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardNom: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", flex: 1 },
  alerteBadge: {
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  alerteText: { fontSize: 11, color: "#856404", fontWeight: "600" },
  cardPrix: { flexDirection: "row", alignItems: "baseline", marginBottom: 6 },
  prixMoyen: { fontSize: 22, fontWeight: "800", color: VERT },
  prixUnite: { fontSize: 13, color: "#888888", marginLeft: 4 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardMeta: { fontSize: 11, color: "#AAAAAA" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#888888", fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333333", textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: "#888888", textAlign: "center", paddingHorizontal: 20 },
  ctaButton: {
    marginTop: 16,
    backgroundColor: VERT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  ctaButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: VERT,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  bottomPadding: { height: 80 },
});
