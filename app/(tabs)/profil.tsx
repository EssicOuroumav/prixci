import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { labelScoreUser, estVerifie, SEUIL_CONFIRMATIONS } from "@/services/scoring";
import { getMesSignalements, getUser } from "@/services/db";
import { getMesEnseignes, infoTypeEnseigne, Enseigne } from "@/services/enseignes";
import { LABELS_UNITE } from "@/constants/produits";
import { Signalement, NomIcone } from "@/constants/types";
import Icone from "@/components/Icone";

function statutSignalement(s: Signalement): { label: string; icone: NomIcone; couleur: string } {
  if (estVerifie(s.nbConfirmations)) {
    return { label: "Vérifié", icone: "checkmark-circle", couleur: "#0A5F38" };
  }
  if (!s.synced) {
    return { label: "En attente de réseau", icone: "hourglass-outline", couleur: "#888888" };
  }
  return {
    label: `${s.nbConfirmations} / ${SEUIL_CONFIRMATIONS} confirmations`,
    icone: "people-outline",
    couleur: "#8A5200",
  };
}

export default function ProfilScreen() {
  const router = useRouter();
  const { user, setUser } = useAppStore();
  const [mesSignalements, setMesSignalements] = useState<Signalement[]>([]);
  const [mesEnseignes, setMesEnseignes] = useState<Enseigne[]>([]);

  const userId = user?.id;

  // Recharge à chaque retour sur l'onglet
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      getUser(userId).then((u) => u && setUser(u));
      getMesSignalements(userId).then(setMesSignalements);
      // Les enseignes viennent du serveur : on garde l'affichage précédent hors ligne
      getMesEnseignes(userId).then(setMesEnseignes).catch(() => {});
    }, [userId])
  );

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
  const estEnseigne = mesEnseignes.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon profil</Text>
        <Text style={styles.headerSub}>
          {estEnseigne ? "Compte enseigne" : "Compte citoyen · identité anonyme"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar & pseudonyme */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {estEnseigne ? (
              <Icone nom="storefront" taille={34} couleur="#FFFFFF" />
            ) : (
              <Text style={styles.avatarText}>{user.pseudonyme.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.pseudonyme}>
            {estEnseigne ? mesEnseignes[0].nom : user.pseudonyme}
          </Text>
          {estEnseigne && <Text style={styles.sousPseudo}>{user.pseudonyme}</Text>}
          <View style={[styles.badgeContainer, { backgroundColor: badge.couleur + "20" }]}>
            <Icone
              nom={estEnseigne ? "checkmark-circle" : badge.icone}
              taille={14}
              couleur={badge.couleur}
            />
            <Text style={[styles.badgeText, { color: badge.couleur }]}>
              {estEnseigne ? "Enseigne officielle" : badge.label}
            </Text>
          </View>
        </View>

        {/* Espace enseigne */}
        <View style={styles.bloc}>
          <Text style={styles.blocTitre}>
            {estEnseigne ? "Mes enseignes" : "Vous êtes commerçant ?"}
          </Text>
          {mesEnseignes.map((e) => (
            <TouchableOpacity
              key={e.id}
              style={styles.ligne}
              onPress={() => router.push({ pathname: "/enseigne/[id]", params: { id: e.id } })}
            >
              <Icone nom={infoTypeEnseigne(e.type).icone} taille={24} couleur={VERT} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ligneTitre} numberOfLines={1}>{e.nom}</Text>
                <Text style={styles.ligneSub}>{e.commune} · gérer mes prix officiels</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
          {!estEnseigne && (
            <Text style={styles.blocTexte}>
              Inscris ton commerce pour publier tes prix officiels et attirer des clients.
            </Text>
          )}
          <TouchableOpacity
            style={styles.btnContour}
            onPress={() => router.push("/enseigne/inscription")}
          >
            <Text style={styles.btnContourText}>
              {estEnseigne ? "+ Inscrire une autre enseigne" : "+ Inscrire mon enseigne"}
            </Text>
          </TouchableOpacity>
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
            +3 quand un de tes prix est confirmé, −5 quand il est contesté, +1 à chaque vote que tu donnes.
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
            <Text style={styles.statLabel}>Confirmations reçues</Text>
          </View>
        </View>

        {/* Mes signalements */}
        <View style={styles.bloc}>
          <Text style={styles.blocTitre}>Mes signalements</Text>
          {mesSignalements.length === 0 ? (
            <Text style={styles.blocTexte}>Tu n'as encore signalé aucun prix.</Text>
          ) : (
            mesSignalements.map((s) => {
              const statut = statutSignalement(s);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.ligne}
                  onPress={() =>
                    router.push({
                      pathname: "/detail/[id]",
                      params: { id: s.id, produitId: s.produitId, commune: s.commune },
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ligneTitre} numberOfLines={1}>{s.produitNom}</Text>
                    <Text style={styles.ligneSub}>
                      {s.prix.toLocaleString("fr-FR")} FCFA /{LABELS_UNITE[s.unite] ?? s.unite} · {s.commune}
                    </Text>
                    <View style={styles.statutRow}>
                      <Icone nom={statut.icone} taille={12} couleur={statut.couleur} />
                      <Text style={[styles.ligneStatut, { color: statut.couleur }]}>{statut.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.anonNotice}>
          <Icone nom="lock-closed-outline" taille={16} couleur="#0A5F38" />
          <Text style={styles.anonNoticeText}>
            Ton identité est anonyme. Ton pseudonyme est généré automatiquement et ne contient aucune information personnelle.
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.push("/legal")} style={styles.lienLegal}>
          <Text style={styles.lienLegalText}>Conditions d'utilisation et confidentialité</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#E8F5EE",
    borderRadius: 10,
    padding: 14,
  },
  anonNoticeText: { fontSize: 13, color: "#0A5F38", lineHeight: 18, flex: 1 },
  sousPseudo: { fontSize: 12, color: "#888888", marginTop: -4 },
  bloc: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, gap: 10 },
  blocTitre: { fontSize: 12, color: "#888888", fontWeight: "600", textTransform: "uppercase" },
  blocTexte: { fontSize: 13, color: "#666666", lineHeight: 18 },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  ligneEmoji: { fontSize: 24 },
  ligneTitre: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  ligneSub: { fontSize: 12, color: "#888888", marginTop: 2 },
  statutRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  ligneStatut: { fontSize: 11, fontWeight: "700" },
  chevron: { fontSize: 20, color: "#CCCCCC" },
  btnContour: {
    borderWidth: 1.5,
    borderColor: VERT,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnContourText: { color: VERT, fontSize: 14, fontWeight: "700" },
  lienLegal: { alignItems: "center", paddingVertical: 4 },
  lienLegalText: { fontSize: 12, color: "#888888", textDecorationLine: "underline" },
});
