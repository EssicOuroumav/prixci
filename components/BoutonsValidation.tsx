import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import * as Crypto from "expo-crypto";
import { Validation } from "@/constants/types";
import { insertValidation } from "@/services/db";
import { updateUserScore } from "@/services/db";
import { deltaScoreApresValidation, DELTA_SCORE_POUR_VALIDATION_DONNEE } from "@/services/scoring";
import { useAppStore } from "@/stores/useAppStore";

// ============================================================
// COMPOSANT BOUTONS DE VALIDATION COMMUNAUTAIRE
// ============================================================

interface BoutonsValidationProps {
  signalementId: string;
  userIdAuteur: string;         // pour mettre à jour le score de l'auteur
  nbConfirmations: number;
  nbContestations: number;
  scoreFilabilite: number;
  onValidationEffectuee?: (vote: "confirme" | "conteste", nouveauScore: number) => void;
}

export default function BoutonsValidation({
  signalementId,
  userIdAuteur,
  nbConfirmations,
  nbContestations,
  scoreFilabilite,
  onValidationEffectuee,
}: BoutonsValidationProps) {
  const { user, validationsEffectuees, addValidation, updateUserScore: updateStoreScore } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [nbConf, setNbConf] = useState(nbConfirmations);
  const [nbCont, setNbCont] = useState(nbContestations);
  const [score, setScore] = useState(scoreFilabilite);
  const [voteLocal, setVoteLocal] = useState<"confirme" | "conteste" | null>(null);

  const dejaVote = validationsEffectuees.has(signalementId) || voteLocal !== null;
  const totalVotes = nbConf + nbCont;
  const ratioConf = totalVotes > 0 ? (nbConf / totalVotes) * 100 : 50;

  const voter = async (vote: "confirme" | "conteste") => {
    if (!user) {
      Alert.alert("Connexion requise", "Tu dois être connecté pour valider.");
      return;
    }
    if (dejaVote) return;

    // Empêcher l'auteur de voter sur son propre signalement
    if (user.id === userIdAuteur) {
      Alert.alert("Non autorisé", "Tu ne peux pas voter sur ton propre signalement.");
      return;
    }

    setLoading(true);

    try {
      const id = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${user.id}_${signalementId}_${Date.now()}`
      );

      const validation: Validation = {
        id: id.substring(0, 36),
        signalementId,
        userId: user.id,
        vote,
        dateVote: new Date().toISOString(),
        synced: false,
      };

      // Enregistrement local SQLite (met aussi à jour les compteurs du signalement)
      await insertValidation(validation);

      // Mise à jour optimiste de l'UI
      if (vote === "confirme") {
        setNbConf((n) => n + 1);
        const nouveauScore = Math.min(100, score + 5);
        setScore(nouveauScore);
      } else {
        setNbCont((n) => n + 1);
        const nouveauScore = Math.max(0, score - 8);
        setScore(nouveauScore);
      }

      setVoteLocal(vote);
      addValidation(signalementId);

      // Mettre à jour le score de l'auteur du signalement
      const deltaAuteur = deltaScoreApresValidation(vote);
      await updateUserScore(userIdAuteur, deltaAuteur);

      // Récompenser le votant
      await updateUserScore(user.id, DELTA_SCORE_POUR_VALIDATION_DONNEE);
      updateStoreScore(DELTA_SCORE_POUR_VALIDATION_DONNEE);

      onValidationEffectuee?.(vote, score);
    } catch (err: any) {
      if (err.message?.includes("déjà voté")) {
        Alert.alert("Vote déjà enregistré", "Tu as déjà voté sur ce signalement.");
        addValidation(signalementId);
      } else {
        Alert.alert("Erreur", "Impossible d'enregistrer ton vote. Réessaie.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Rendu si déjà voté ───────────────────────────────
  if (dejaVote) {
    return (
      <View style={styles.container}>
        <View style={styles.dejaVoteContainer}>
          <View style={[
            styles.dejaVoteBadge,
            { backgroundColor: voteLocal === "confirme" ? "#E8F5EE" : "#FDECEA" }
          ]}>
            <Text style={[
              styles.dejaVoteText,
              { color: voteLocal === "confirme" ? "#0A5F38" : "#C0392B" }
            ]}>
              {voteLocal === "confirme" ? "✓ Tu as confirmé ce prix" : "✗ Tu as contesté ce prix"}
            </Text>
          </View>
          <BarreConsensus conf={nbConf} cont={nbCont} />
          <Text style={styles.totalVotes}>
            {nbConf + nbCont} vote{nbConf + nbCont > 1 ? "s" : ""} · {Math.round(ratioConf)}% de confirmations
          </Text>
        </View>
      </View>
    );
  }

  // ─── Rendu boutons actifs ─────────────────────────────
  return (
    <View style={styles.container}>
      {/* Barre de consensus actuelle */}
      {totalVotes > 0 && (
        <View style={styles.consensusPreview}>
          <BarreConsensus conf={nbConf} cont={nbCont} />
          <Text style={styles.totalVotes}>
            {totalVotes} vote{totalVotes > 1 ? "s" : ""} — {Math.round(ratioConf)}% confirment
          </Text>
        </View>
      )}

      <Text style={styles.questionLabel}>Ce prix est-il exact ?</Text>

      <View style={styles.boutonsRow}>
        {/* CONFIRMER */}
        <TouchableOpacity
          style={[styles.btnBase, styles.btnConfirmer]}
          onPress={() => voter("confirme")}
          disabled={loading}
          activeOpacity={0.75}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#0A5F38" />
          ) : (
            <>
              <Text style={styles.btnIcon}>✓</Text>
              <View>
                <Text style={styles.btnLabel}>Confirmer</Text>
                <Text style={styles.btnCount}>{nbConf} confirmation{nbConf > 1 ? "s" : ""}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* CONTESTER */}
        <TouchableOpacity
          style={[styles.btnBase, styles.btnContester]}
          onPress={() => voter("conteste")}
          disabled={loading}
          activeOpacity={0.75}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#C0392B" />
          ) : (
            <>
              <Text style={[styles.btnIcon, { color: "#C0392B" }]}>✗</Text>
              <View>
                <Text style={[styles.btnLabel, { color: "#C0392B" }]}>Contester</Text>
                <Text style={[styles.btnCount, { color: "#C0392B" }]}>{nbCont} contestation{nbCont > 1 ? "s" : ""}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Explication du système */}
      <Text style={styles.hint}>
        +1 pt · Ta participation améliore la fiabilité des données
      </Text>
    </View>
  );
}

// ─── Barre de consensus visuelle ─────────────────────────
function BarreConsensus({ conf, cont }: { conf: number; cont: number }) {
  const total = conf + cont;
  if (total === 0) return null;
  const pctConf = (conf / total) * 100;

  return (
    <View style={barre.container}>
      <View style={[barre.segment, { width: `${pctConf}%`, backgroundColor: "#0A5F38" }]} />
      <View style={[barre.segment, { width: `${100 - pctConf}%`, backgroundColor: "#C0392B" }]} />
    </View>
  );
}

const barre = StyleSheet.create({
  container: {
    height: 6,
    borderRadius: 3,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "#E8E8E8",
    width: "100%",
  },
  segment: { height: "100%" },
});

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
  },
  consensusPreview: { gap: 4 },
  totalVotes: { fontSize: 11, color: "#AAAAAA", textAlign: "center" },
  questionLabel: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  boutonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnBase: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  btnConfirmer: {
    backgroundColor: "#E8F5EE",
    borderColor: "#0A5F38",
  },
  btnContester: {
    backgroundColor: "#FDECEA",
    borderColor: "#C0392B",
  },
  btnIcon: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A5F38",
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0A5F38",
  },
  btnCount: {
    fontSize: 10,
    color: "#0A5F38",
    opacity: 0.7,
  },
  hint: {
    fontSize: 11,
    color: "#AAAAAA",
    textAlign: "center",
  },
  dejaVoteContainer: { gap: 6, alignItems: "center" },
  dejaVoteBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dejaVoteText: { fontSize: 13, fontWeight: "700" },
});
