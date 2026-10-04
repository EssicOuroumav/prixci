import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getSignalementDetail,
  getEvolutionPrix,
  getValidationsDetail,
  getHistoriqueSignalements,
} from "@/services/db";
import { TYPES_LIEU } from "@/constants/types";
import { LABELS_UNITE } from "@/constants/produits";
import {
  labelScoreFilabilite,
  labelScoreUser,
  estVerifie,
  SEUIL_CONFIRMATIONS,
} from "@/services/scoring";
import { MOTIFS_ABUS, signalerAbus } from "@/services/abus";
import { useAppStore } from "@/stores/useAppStore";
import BoutonsValidation from "@/components/BoutonsValidation";
import { Signalement } from "@/constants/types";

// ============================================================
// ÉCRAN DÉTAIL D'UN SIGNALEMENT
// Route : /detail/[id]
// ============================================================

const { width: SW } = Dimensions.get("window");
const CHART_W = SW - 48;
const CHART_H = 140;
const VERT    = "#0A5F38";
const ROUGE   = "#C0392B";
const ORANGE  = "#D4820A";
const GRIS    = "#F5F7F5";

// ─── Helpers ─────────────────────────────────────────────
function dateCourteFR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function dateRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "il y a < 1h";
  if (h < 24) return `il y a ${h}h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} jour${j > 1 ? "s" : ""}`;
}

function emojiTypeLieu(type: string): string {
  const found = TYPES_LIEU.find((t) => t.id === type);
  return found?.emoji ?? "📍";
}

function labelTypeLieu(type: string): string {
  const found = TYPES_LIEU.find((t) => t.id === type);
  return found?.label ?? type;
}

// ─── Graphique d'évolution des prix (SVG natif RN) ────────
interface PointEvolution {
  date: string;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  nbSignalements: number;
}

function GraphiquePrix({ points, unite }: { points: PointEvolution[]; unite: string }) {
  if (points.length < 2) {
    return (
      <View style={graphStyles.empty}>
        <Text style={graphStyles.emptyText}>
          Pas encore assez de données pour tracer une courbe.{"\n"}
          Il faut au moins 2 jours de signalements.
        </Text>
      </View>
    );
  }

  const allPrix = points.flatMap((p) => [p.prixMin, p.prixMax]);
  const minPrix = Math.min(...allPrix);
  const maxPrix = Math.max(...allPrix);
  const rangePrix = maxPrix - minPrix || 1;

  // Normalisation Y : 0 = bas du graphe, CHART_H = haut
  const toY = (prix: number) =>
    CHART_H - 16 - ((prix - minPrix) / rangePrix) * (CHART_H - 32);

  // Normalisation X
  const toX = (index: number) =>
    (index / (points.length - 1)) * (CHART_W - 32) + 16;

  // Construire le path SVG de la courbe prix moyen
  const pathMoyen = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.prixMoyen).toFixed(1)}`)
    .join(" ");

  // Zone de remplissage (aire sous la courbe)
  const pathAire =
    `M ${toX(0).toFixed(1)} ${CHART_H} ` +
    points.map((p, i) => `L ${toX(i).toFixed(1)} ${toY(p.prixMoyen).toFixed(1)}`).join(" ") +
    ` L ${toX(points.length - 1).toFixed(1)} ${CHART_H} Z`;

  // Détection tendance
  const premierPrix = points[0].prixMoyen;
  const dernierPrix = points[points.length - 1].prixMoyen;
  const variation = Math.round(((dernierPrix - premierPrix) / premierPrix) * 100);
  const tendance = variation > 3 ? "hausse" : variation < -3 ? "baisse" : "stable";

  const couleurTendance = tendance === "hausse" ? ROUGE : tendance === "baisse" ? VERT : ORANGE;
  const emojiTendance   = tendance === "hausse" ? "↑" : tendance === "baisse" ? "↓" : "→";

  return (
    <View style={graphStyles.container}>
      {/* En-tête tendance */}
      <View style={graphStyles.header}>
        <Text style={graphStyles.titre}>Évolution du prix · 30 jours</Text>
        <View style={[graphStyles.tendanceBadge, { backgroundColor: couleurTendance + "18" }]}>
          <Text style={[graphStyles.tendanceText, { color: couleurTendance }]}>
            {emojiTendance} {Math.abs(variation)}% {tendance}
          </Text>
        </View>
      </View>

      {/* Axe Y — prix min/max */}
      <View style={graphStyles.axeY}>
        <Text style={graphStyles.axeLabel}>{maxPrix.toLocaleString("fr-FR")} F</Text>
        <Text style={graphStyles.axeLabel}>{Math.round((maxPrix + minPrix) / 2).toLocaleString("fr-FR")} F</Text>
        <Text style={graphStyles.axeLabel}>{minPrix.toLocaleString("fr-FR")} F</Text>
      </View>

      {/* Zone graphique — SVG via View + positions absolues */}
      <View style={[graphStyles.svgZone, { height: CHART_H, width: CHART_W - 40 }]}>
        {/* Lignes de grille horizontales */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <View
            key={i}
            style={[
              graphStyles.gridLine,
              { top: pct * (CHART_H - 16) + 8, width: CHART_W - 48 },
            ]}
          />
        ))}

        {/* Aire sous la courbe (simulée avec des View empilées) */}
        {points.map((p, i) => {
          if (i === points.length - 1) return null;
          const x1 = toX(i);
          const x2 = toX(i + 1);
          const y1 = toY(p.prixMoyen);
          const y2 = toY(points[i + 1].prixMoyen);
          const segW = x2 - x1;
          const segH = Math.abs(y2 - y1);
          return (
            <View
              key={`aire-${i}`}
              style={{
                position: "absolute",
                left: x1,
                top: Math.min(y1, y2),
                width: segW,
                height: Math.max(segH, 1),
                backgroundColor: VERT + "14",
              }}
            />
          );
        })}

        {/* Points et barres min-max */}
        {points.map((p, i) => {
          const x = toX(i);
          const y = toY(p.prixMoyen);
          const yMin = toY(p.prixMin);
          const yMax = toY(p.prixMax);
          const hasRange = p.prixMin !== p.prixMax;

          return (
            <React.Fragment key={i}>
              {/* Barre min-max */}
              {hasRange && (
                <View
                  style={{
                    position: "absolute",
                    left: x - 1,
                    top: yMax,
                    width: 2,
                    height: yMin - yMax,
                    backgroundColor: VERT + "40",
                    borderRadius: 1,
                  }}
                />
              )}
              {/* Point central */}
              <View
                style={{
                  position: "absolute",
                  left: x - 5,
                  top: y - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: VERT,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                  shadowColor: VERT,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              />
              {/* Étiquette prix sur dernier point */}
              {i === points.length - 1 && (
                <View
                  style={{
                    position: "absolute",
                    left: x - 30,
                    top: y - 22,
                    backgroundColor: VERT,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "800" }}>
                    {p.prixMoyen.toLocaleString("fr-FR")} F
                  </Text>
                </View>
              )}
            </React.Fragment>
          );
        })}

        {/* Ligne de connexion entre les points */}
        {points.map((p, i) => {
          if (i === points.length - 1) return null;
          const x1 = toX(i);
          const x2 = toX(i + 1);
          const y1 = toY(p.prixMoyen);
          const y2 = toY(points[i + 1].prixMoyen);
          const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
          return (
            <View
              key={`line-${i}`}
              style={{
                position: "absolute",
                left: x1,
                top: y1 - 1.5,
                width: length,
                height: 3,
                backgroundColor: VERT,
                borderRadius: 2,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: "0 50%",
              }}
            />
          );
        })}
      </View>

      {/* Axe X — dates */}
      <View style={graphStyles.axeX}>
        {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
          .filter(Boolean)
          .map((p, i) => (
            <Text key={i} style={graphStyles.axeXLabel}>{dateCourteFR(p.date)}</Text>
          ))}
      </View>

      {/* Légende */}
      <View style={graphStyles.legende}>
        <View style={graphStyles.legendeItem}>
          <View style={[graphStyles.legendeDot, { backgroundColor: VERT }]} />
          <Text style={graphStyles.legendeText}>Prix moyen</Text>
        </View>
        <View style={graphStyles.legendeItem}>
          <View style={[graphStyles.legendeDot, { backgroundColor: VERT + "40", width: 2 }]} />
          <Text style={graphStyles.legendeText}>Fourchette min-max</Text>
        </View>
      </View>
    </View>
  );
}

const graphStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titre: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  tendanceBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tendanceText: { fontSize: 12, fontWeight: "700" },
  axeY: {
    position: "absolute",
    right: 8,
    top: 52,
    height: CHART_H,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  axeLabel: { fontSize: 9, color: "#AAAAAA" },
  svgZone: {
    position: "relative",
    marginBottom: 8,
    marginLeft: 8,
  },
  gridLine: {
    position: "absolute",
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  axeX: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginTop: 4,
  },
  axeXLabel: { fontSize: 10, color: "#AAAAAA" },
  legende: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  legendeItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendeDot: { width: 8, height: 8, borderRadius: 4 },
  legendeText: { fontSize: 11, color: "#888888" },
  empty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: { fontSize: 13, color: "#AAAAAA", textAlign: "center", lineHeight: 20 },
});

// ─── Carte signalement individuel dans l'historique ──────
function CarteHistorique({
  signalement,
  auteurPseudonyme,
  isCurrent,
}: {
  signalement: Signalement & { auteurPseudonyme: string };
  auteurPseudonyme: string;
  isCurrent: boolean;
}) {
  const scoreInfo = labelScoreFilabilite(signalement.scoreFilabilite);

  return (
    <View style={[histoStyles.carte, isCurrent && histoStyles.carteCurrent]}>
      {isCurrent && (
        <View style={histoStyles.currentBadge}>
          <Text style={histoStyles.currentBadgeText}>● Ce signalement</Text>
        </View>
      )}
      <View style={histoStyles.row}>
        <View style={histoStyles.left}>
          <Text style={histoStyles.prix}>
            {signalement.prix.toLocaleString("fr-FR")} FCFA
            <Text style={histoStyles.unite}> / {LABELS_UNITE[signalement.unite] ?? signalement.unite}</Text>
          </Text>
          <View style={histoStyles.lieuRow}>
            <Text style={histoStyles.lieuEmoji}>{emojiTypeLieu(signalement.typeLieu)}</Text>
            <Text style={histoStyles.lieuNom} numberOfLines={1}>
              {signalement.nomLieu || labelTypeLieu(signalement.typeLieu)}
            </Text>
          </View>
        </View>
        <View style={histoStyles.right}>
          <View style={[histoStyles.scoreBadge, { backgroundColor: scoreInfo.couleur + "18" }]}>
            <Text style={[histoStyles.scoreText, { color: scoreInfo.couleur }]}>
              {scoreInfo.label}
            </Text>
          </View>
          <Text style={histoStyles.date}>{dateRelative(signalement.dateSignalement)}</Text>
          <Text style={histoStyles.auteur}>{auteurPseudonyme}</Text>
        </View>
      </View>
      {(signalement.nbConfirmations + signalement.nbContestations) > 0 && (
        <View style={histoStyles.votes}>
          <Text style={histoStyles.votesText}>
            ✓ {signalement.nbConfirmations}  ✗ {signalement.nbContestations}
          </Text>
        </View>
      )}
    </View>
  );
}

const histoStyles = StyleSheet.create({
  carte: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  carteCurrent: { borderColor: VERT, backgroundColor: "#FAFFFC" },
  currentBadge: { marginBottom: 6 },
  currentBadgeText: { fontSize: 11, color: VERT, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  left: { flex: 1, gap: 4 },
  right: { alignItems: "flex-end", gap: 3 },
  prix: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  unite: { fontSize: 12, color: "#888888", fontWeight: "400" },
  lieuRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  lieuEmoji: { fontSize: 14 },
  lieuNom: { fontSize: 12, color: "#555555", flex: 1 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { fontSize: 11, fontWeight: "700" },
  date: { fontSize: 11, color: "#AAAAAA" },
  auteur: { fontSize: 10, color: "#CCCCCC" },
  votes: { marginTop: 8, flexDirection: "row", gap: 8 },
  votesText: { fontSize: 11, color: "#888888" },
});

// ─── Carte vote individuel ────────────────────────────────
function CarteVote({ vote, dateVote, votantPseudonyme, votantScore }: {
  vote: "confirme" | "conteste";
  dateVote: string;
  votantPseudonyme: string;
  votantScore: number;
}) {
  const isConf = vote === "confirme";
  const badgeUser = labelScoreUser(votantScore);

  return (
    <View style={voteStyles.carte}>
      <View style={[voteStyles.indicateur, { backgroundColor: isConf ? VERT : ROUGE }]}>
        <Text style={voteStyles.indicateurIcon}>{isConf ? "✓" : "✗"}</Text>
      </View>
      <View style={voteStyles.contenu}>
        <Text style={voteStyles.pseudo}>{votantPseudonyme}</Text>
        <View style={voteStyles.metaRow}>
          <Text style={[voteStyles.action, { color: isConf ? VERT : ROUGE }]}>
            {isConf ? "A confirmé ce prix" : "A contesté ce prix"}
          </Text>
          <Text style={voteStyles.separateur}>·</Text>
          <Text style={voteStyles.date}>{dateRelative(dateVote)}</Text>
        </View>
      </View>
      <View style={[voteStyles.scoreBadge, { backgroundColor: badgeUser.couleur + "18" }]}>
        <Text style={{ fontSize: 10, color: badgeUser.couleur, fontWeight: "600" }}>
          {badgeUser.emoji} {votantScore}
        </Text>
      </View>
    </View>
  );
}

const voteStyles = StyleSheet.create({
  carte: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    gap: 10,
  },
  indicateur: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  indicateurIcon: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  contenu: { flex: 1, gap: 2 },
  pseudo: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  action: { fontSize: 11, fontWeight: "600" },
  separateur: { fontSize: 11, color: "#CCCCCC" },
  date: { fontSize: 11, color: "#AAAAAA" },
  scoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

// ─── ÉCRAN PRINCIPAL ──────────────────────────────────────
export default function DetailScreen() {
  const { id, produitId, commune } = useLocalSearchParams<{
    id: string;
    produitId: string;
    commune: string;
  }>();
  const router = useRouter();
  const { user } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{
    signalement: Signalement;
    auteurPseudonyme: string;
    auteurScore: number;
  } | null>(null);
  const [evolution, setEvolution] = useState<PointEvolution[]>([]);
  const [validations, setValidations] = useState<any[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [onglet, setOnglet] = useState<"evolution" | "votes" | "historique">("evolution");

  // Le rechargement après un vote ne doit pas réafficher l'écran de chargement
  const charger = useCallback(async () => {
    if (!id) return;
    try {
      const det = await getSignalementDetail(id);
      setDetail(det);
      if (!det) return;
      // Le signalement fait foi : les paramètres de la route peuvent manquer
      const pid = det.signalement.produitId || produitId || "";
      const com = det.signalement.commune || commune || "";
      const [evo, vals, histo] = await Promise.all([
        getEvolutionPrix(pid, com),
        getValidationsDetail(id),
        getHistoriqueSignalements(pid, com),
      ]);
      setEvolution(evo);
      setValidations(vals);
      setHistorique(histo);
    } finally {
      setLoading(false);
    }
  }, [id, produitId, commune]);

  useEffect(() => { charger(); }, [charger]);

  const envoyerAbus = async (motif: string) => {
    if (!id) return;
    try {
      await signalerAbus("signalement", id, motif);
      Alert.alert("Merci", "Ce contenu a été transmis à l'équipe de modération.");
    } catch {
      Alert.alert("Hors ligne", "Connexion nécessaire pour signaler un abus. Réessaie plus tard.");
    }
  };

  const demanderMotifAbus = () =>
    Alert.alert("Signaler un abus", "Quel est le problème ?", [
      ...MOTIFS_ABUS.map((motif) => ({ text: motif, onPress: () => envoyerAbus(motif) })),
      { text: "Annuler", style: "cancel" as const },
    ]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={VERT} />
        <Text style={styles.loadingText}>Chargement du détail…</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 40 }}>🔍</Text>
        <Text style={styles.loadingText}>Signalement introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.retourBtn}>
          <Text style={styles.retourBtnText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { signalement, auteurPseudonyme, auteurScore } = detail;
  const verifie = estVerifie(signalement.nbConfirmations);
  const estLeMien = signalement.userId === user?.id;
  const scoreInfo = labelScoreFilabilite(signalement.scoreFilabilite);
  const badgeAuteur = labelScoreUser(auteurScore);
  const totalVotes = signalement.nbConfirmations + signalement.nbContestations;
  const ratioConf = totalVotes > 0
    ? Math.round((signalement.nbConfirmations / totalVotes) * 100)
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {signalement.produitNom}
        </Text>
        <Text style={styles.headerSub}>{signalement.commune}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero prix ──────────────────────────────────── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroProduit}>{signalement.produitNom}</Text>
          <View
            style={[
              styles.statutBadge,
              { backgroundColor: verifie ? "#E8F5EE" : "#FFF3CD" },
            ]}
          >
            <Text style={[styles.statutText, { color: verifie ? VERT : "#8A5200" }]}>
              {verifie
                ? "✓ Prix vérifié par la communauté"
                : `🗳 À confirmer · ${signalement.nbConfirmations} / ${SEUIL_CONFIRMATIONS} confirmations`}
            </Text>
          </View>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroPrix}>
                {signalement.prix.toLocaleString("fr-FR")} FCFA
              </Text>
              <Text style={styles.heroUnite}>
                / {LABELS_UNITE[signalement.unite] ?? signalement.unite}
              </Text>
            </View>
            <View style={[styles.scoreHeroBadge, { backgroundColor: scoreInfo.couleur + "18" }]}>
              <Text style={[styles.scoreHeroText, { color: scoreInfo.couleur }]}>
                {signalement.scoreFilabilite}%
              </Text>
              <Text style={[styles.scoreHeroLabel, { color: scoreInfo.couleur }]}>
                {scoreInfo.label}
              </Text>
            </View>
          </View>

          {/* Lieu */}
          <View style={styles.lieuHero}>
            <Text style={styles.lieuHeroEmoji}>{emojiTypeLieu(signalement.typeLieu)}</Text>
            <View>
              <Text style={styles.lieuHeroNom}>
                {signalement.nomLieu || labelTypeLieu(signalement.typeLieu)}
              </Text>
              <Text style={styles.lieuHeroType}>
                {labelTypeLieu(signalement.typeLieu)} · {signalement.commune}
                {signalement.quartier ? ` · ${signalement.quartier}` : ""}
              </Text>
            </View>
          </View>

          {/* Auteur + date */}
          <View style={styles.auteurRow}>
            <View style={[styles.auteurBadge, { backgroundColor: badgeAuteur.couleur + "14" }]}>
              <Text style={{ fontSize: 11 }}>{badgeAuteur.emoji}</Text>
              <Text style={[styles.auteurNom, { color: badgeAuteur.couleur }]}>
                {auteurPseudonyme}
              </Text>
              <Text style={[styles.auteurScore, { color: badgeAuteur.couleur }]}>
                · score {auteurScore}
              </Text>
            </View>
            <Text style={styles.dateSignal}>{dateRelative(signalement.dateSignalement)}</Text>
          </View>

          {/* Consensus bar */}
          {totalVotes > 0 && (
            <View style={styles.consensusSection}>
              <View style={styles.consensusBarContainer}>
                <View
                  style={[
                    styles.consensusBarConf,
                    { flex: signalement.nbConfirmations || 0.01 },
                  ]}
                />
                <View
                  style={[
                    styles.consensusBarCont,
                    { flex: signalement.nbContestations || 0.01 },
                  ]}
                />
              </View>
              <Text style={styles.consensusText}>
                {ratioConf}% de confirmations · {totalVotes} vote{totalVotes > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* ── Boutons validation ─────────────────────────── */}
        <View style={styles.section}>
          {estLeMien ? (
            <View style={styles.mienBox}>
              <Text style={styles.mienText}>
                C'est ton signalement. Ce sont les autres citoyens qui le confirment ou le contestent.
              </Text>
            </View>
          ) : (
            <BoutonsValidation
              signalementId={signalement.id}
              userIdAuteur={signalement.userId}
              nbConfirmations={signalement.nbConfirmations}
              nbContestations={signalement.nbContestations}
              scoreFilabilite={signalement.scoreFilabilite}
              onValidationEffectuee={() => charger()}
            />
          )}
        </View>

        {/* ── Onglets ────────────────────────────────────── */}
        <View style={styles.onglets}>
          {(["evolution", "votes", "historique"] as const).map((o) => (
            <TouchableOpacity
              key={o}
              style={[styles.onglet, onglet === o && styles.ongletActive]}
              onPress={() => setOnglet(o)}
            >
              <Text style={[styles.ongletText, onglet === o && styles.ongletTextActive]}>
                {o === "evolution"
                  ? `📈 Évolution`
                  : o === "votes"
                  ? `🗳 Votes (${validations.length})`
                  : `📋 Historique (${historique.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Contenu onglet : Évolution ─────────────────── */}
        {onglet === "evolution" && (
          <>
            <GraphiquePrix points={evolution} unite={signalement.unite} />

            {/* Résumé statistique */}
            {evolution.length >= 2 && (
              <View style={styles.statsGrid}>
                {[
                  {
                    label: "Prix actuel",
                    val: `${evolution[evolution.length - 1].prixMoyen.toLocaleString("fr-FR")} F`,
                    couleur: VERT,
                  },
                  {
                    label: "Prix il y a 30j",
                    val: `${evolution[0].prixMoyen.toLocaleString("fr-FR")} F`,
                    couleur: "#555555",
                  },
                  {
                    label: "Minimum observé",
                    val: `${Math.min(...evolution.map((e) => e.prixMin)).toLocaleString("fr-FR")} F`,
                    couleur: VERT,
                  },
                  {
                    label: "Maximum observé",
                    val: `${Math.max(...evolution.map((e) => e.prixMax)).toLocaleString("fr-FR")} F`,
                    couleur: ROUGE,
                  },
                ].map((stat, i) => (
                  <View key={i} style={styles.statItem}>
                    <Text style={[styles.statVal, { color: stat.couleur }]}>{stat.val}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Contenu onglet : Votes ─────────────────────── */}
        {onglet === "votes" && (
          <View style={styles.section}>
            {validations.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionEmoji}>🗳</Text>
                <Text style={styles.emptySectionText}>
                  Aucun vote pour l'instant. Sois le premier à valider ce prix !
                </Text>
              </View>
            ) : (
              validations.map((v) => (
                <CarteVote key={v.id} {...v} />
              ))
            )}
          </View>
        )}

        {/* ── Contenu onglet : Historique ────────────────── */}
        {onglet === "historique" && (
          <View style={styles.section}>
            <Text style={styles.sectionNote}>
              Tous les signalements pour {signalement.produitNom} à {signalement.commune} (30 derniers jours)
            </Text>
            {historique.map((s) => (
              <CarteHistorique
                key={s.id}
                signalement={s}
                auteurPseudonyme={s.auteurPseudonyme}
                isCurrent={s.id === signalement.id}
              />
            ))}
          </View>
        )}

        {!estLeMien && (
          <TouchableOpacity onPress={demanderMotifAbus} style={styles.abusBtn}>
            <Text style={styles.abusText}>⚑ Signaler un contenu abusif</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GRIS },
  heroProduit: { fontSize: 17, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  statutBadge: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  statutText: { fontSize: 12, fontWeight: "700" },
  mienBox: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14 },
  mienText: { fontSize: 13, color: "#666666", lineHeight: 18 },
  abusBtn: { alignItems: "center", paddingVertical: 12 },
  abusText: { fontSize: 12, color: "#999999", textDecorationLine: "underline" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: GRIS,
  },
  loadingText: { color: "#888888", fontSize: 14 },
  retourBtn: {
    marginTop: 8,
    backgroundColor: VERT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retourBtnText: { color: "#FFFFFF", fontWeight: "700" },
  header: {
    backgroundColor: VERT,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    gap: 2,
  },
  backBtn: { marginBottom: 4 },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroPrix: { fontSize: 34, fontWeight: "900", color: "#1A1A1A", letterSpacing: -1 },
  heroUnite: { fontSize: 14, color: "#888888", marginTop: 2 },
  scoreHeroBadge: {
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    minWidth: 70,
  },
  scoreHeroText: { fontSize: 22, fontWeight: "900" },
  scoreHeroLabel: { fontSize: 10, fontWeight: "700", marginTop: 1 },
  lieuHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: GRIS,
    borderRadius: 10,
    padding: 10,
  },
  lieuHeroEmoji: { fontSize: 24 },
  lieuHeroNom: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  lieuHeroType: { fontSize: 12, color: "#888888", marginTop: 1 },
  auteurRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  auteurBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  auteurNom: { fontSize: 12, fontWeight: "700" },
  auteurScore: { fontSize: 11 },
  dateSignal: { fontSize: 11, color: "#AAAAAA" },
  consensusSection: { gap: 4 },
  consensusBarContainer: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  consensusBarConf: { backgroundColor: VERT },
  consensusBarCont: { backgroundColor: ROUGE },
  consensusText: { fontSize: 11, color: "#888888", textAlign: "center" },
  section: { marginBottom: 14 },
  onglets: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    gap: 2,
  },
  onglet: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
  },
  ongletActive: { backgroundColor: VERT },
  ongletText: { fontSize: 11, color: "#888888", fontWeight: "600", textAlign: "center" },
  ongletTextActive: { color: "#FFFFFF", fontWeight: "700" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 2,
  },
  statVal: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#AAAAAA", textAlign: "center" },
  emptySection: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    gap: 8,
  },
  emptySectionEmoji: { fontSize: 36 },
  emptySectionText: { fontSize: 13, color: "#888888", textAlign: "center", lineHeight: 18 },
  sectionNote: { fontSize: 12, color: "#888888", marginBottom: 10 },
});
