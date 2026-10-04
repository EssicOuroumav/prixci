import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useAppStore } from "@/stores/useAppStore";
import { labelScoreUser } from "@/services/scoring";
import { resetDemoData, seedDemoData } from "@/services/demoSeed";

export default function ProfilScreen() {
  const { user } = useAppStore();
  const [demoLoading, setDemoLoading] = useState(false);

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon profil</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </View>
    );
  }

  const badge = labelScoreUser(user.scoreConfiance);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon profil</Text>
        <Text style={styles.headerSub}>Identité anonyme</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar & pseudonyme */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.pseudonyme.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.pseudonyme}>{user.pseudonyme}</Text>
          <View style={[styles.badgeContainer, { backgroundColor: badge.couleur + "20" }]}>
            <Text style={[styles.badgeText, { color: badge.couleur }]}>
              {badge.emoji} {badge.label}
            </Text>
          </View>
        </View>

        {/* Score de confiance */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Score de confiance</Text>
          <Text style={styles.scoreValue}>{user.scoreConfiance}/100</Text>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${user.scoreConfiance}%` },
              ]}
            />
          </View>
          <Text style={styles.scoreInfo}>
            Augmente en signalant des prix exacts validés par la communauté.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.nbSignalements}</Text>
            <Text style={styles.statLabel}>Signalements</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.nbValidationsRecues}</Text>
            <Text style={styles.statLabel}>Validations reçues</Text>
          </View>
        </View>

        <View style={styles.anonNotice}>
          <Text style={styles.anonNoticeText}>
            🔒 Ton identité est 100% anonyme. Ton pseudonyme est généré automatiquement et ne contient aucune information personnelle.
          </Text>
        </View>

        {/* ─── Contrôles MODE DÉMO ───────────────────── */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>🧪 Mode démo</Text>
          <Text style={styles.demoSub}>
            Recharger ou supprimer les données de test pour voir l'app avec un écran vide.
          </Text>
          <View style={styles.demoBtns}>
            <TouchableOpacity
              style={[styles.demoBtn, { backgroundColor: "#E8F5EE" }]}
              disabled={demoLoading}
              onPress={async () => {
                setDemoLoading(true);
                try {
                  await resetDemoData();
                  await seedDemoData(user?.id ?? "");
                  Alert.alert("✓ Données rechargées", "61 signalements de démo réinitialisés.");
                } finally { setDemoLoading(false); }
              }}
            >
              {demoLoading
                ? <ActivityIndicator size="small" color="#0A5F38" />
                : <Text style={[styles.demoBtnText, { color: "#0A5F38" }]}>↺ Recharger la démo</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBtn, { backgroundColor: "#FDECEA" }]}
              disabled={demoLoading}
              onPress={() =>
                Alert.alert(
                  "Supprimer les données de démo ?",
                  "L'app sera vide jusqu'au prochain rechargement.",
                  [
                    { text: "Annuler", style: "cancel" },
                    {
                      text: "Supprimer",
                      style: "destructive",
                      onPress: async () => {
                        setDemoLoading(true);
                        try { await resetDemoData(); }
                        finally { setDemoLoading(false); }
                      },
                    },
                  ]
                )
              }
            >
              <Text style={[styles.demoBtnText, { color: "#C0392B" }]}>✕ Vider les données</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
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
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#888888" },
  content: { padding: 20, gap: 16 },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: VERT,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 32, color: "#FFFFFF", fontWeight: "800" },
  pseudonyme: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  badgeContainer: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 13, fontWeight: "600" },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  scoreLabel: { fontSize: 12, color: "#888888", fontWeight: "600", textTransform: "uppercase" },
  scoreValue: { fontSize: 32, fontWeight: "800", color: VERT },
  scoreBar: {
    height: 8,
    backgroundColor: "#E8EDE9",
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    backgroundColor: VERT,
    borderRadius: 4,
  },
  scoreInfo: { fontSize: 12, color: "#AAAAAA", lineHeight: 16 },
  statsRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 28, fontWeight: "800", color: "#1A1A1A" },
  statLabel: { fontSize: 12, color: "#888888" },
  statDivider: { width: 1, height: 40, backgroundColor: "#E8E8E8" },
  anonNotice: {
    backgroundColor: "#E8F5EE",
    borderRadius: 10,
    padding: 14,
  },
  anonNoticeText: { fontSize: 13, color: "#0A5F38", lineHeight: 18 },
  demoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderStyle: "dashed",
  },
  demoTitle: { fontSize: 14, fontWeight: "700", color: "#555555" },
  demoSub: { fontSize: 12, color: "#AAAAAA", lineHeight: 16 },
  demoBtns: { flexDirection: "row", gap: 8, marginTop: 4 },
  demoBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  demoBtnText: { fontSize: 12, fontWeight: "700" },
});
