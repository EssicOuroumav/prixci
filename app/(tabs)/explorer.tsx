import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useAppStore } from "@/stores/useAppStore";
import {
  getPrixAgreges,
  getPrixParPointDeVente,
  rechercherProduitsSaisis,
  getSignalementsByProduit,
} from "@/services/db";
import { PRODUITS_REF, LABELS_UNITE } from "@/constants/produits";
import { COMMUNES_ABIDJAN, TYPES_LIEU } from "@/constants/types";
import BoutonsValidation from "@/components/BoutonsValidation";
import { useRouter } from "expo-router";

// ─── Constantes visuelles ─────────────────────────────────
const VERT       = "#0A5F38";
const VERT_CLAIR = "#E8F5EE";
const ROUGE      = "#C0392B";
const ORANGE     = "#D4820A";
const GRIS       = "#F5F7F5";

// ─── Helpers ──────────────────────────────────────────────
function dateRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function emojiTypeLieu(type: string): string {
  return TYPES_LIEU.find((t) => t.id === type)?.emoji ?? "📍";
}

function labelTypeLieu(type: string): string {
  return TYPES_LIEU.find((t) => t.id === type)?.label ?? type;
}

// ─── Composant barre de prix comparative ──────────────────
function BarrePrix({
  prix,
  prixMin,
  prixMax,
  isMin,
}: {
  prix: number;
  prixMin: number;
  prixMax: number;
  isMin: boolean;
}) {
  const range = prixMax - prixMin || 1;
  const width = Math.max(8, ((prix - prixMin) / range) * 100);
  return (
    <View style={barreStyles.container}>
      <View
        style={[
          barreStyles.barre,
          { width: `${width}%`, backgroundColor: isMin ? VERT : ORANGE },
        ]}
      />
    </View>
  );
}

const barreStyles = StyleSheet.create({
  container: {
    height: 6,
    backgroundColor: "#E8E8E8",
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden",
  },
  barre: { height: "100%", borderRadius: 3 },
});

// ─── Carte d'un point de vente ────────────────────────────
function CartePointDeVente({
  signalementId,
  userIdAuteur,
  typeLieu,
  nomLieu,
  prixMoyen,
  prixMin,
  prixMax,
  unite,
  nbSignalements,
  nbConfirmations,
  nbContestations,
  derniereMAJ,
  scoreFilabiliteMoyen,
  globalMin,
  globalMax,
  rang,
  produitIdRef,
  communeRef,
}: {
  signalementId?: string;
  userIdAuteur?: string;
  typeLieu: string;
  nomLieu: string;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  unite: string;
  nbSignalements: number;
  nbConfirmations: number;
  nbContestations: number;
  derniereMAJ: string;
  scoreFilabiliteMoyen: number;
  globalMin: number;
  globalMax: number;
  rang: number;
  produitIdRef?: string;
  communeRef?: string;
}) {
  const isLeMoinsCher = prixMoyen === globalMin;
  const isPlusCher = prixMoyen === globalMax;
  const ecartPct = globalMin > 0
    ? Math.round(((prixMoyen - globalMin) / globalMin) * 100)
    : 0;

  return (
    <View style={[carteStyles.container, isLeMoinsCher && carteStyles.containerBest]}>
      {isLeMoinsCher && (
        <View style={carteStyles.bestBadge}>
          <Text style={carteStyles.bestBadgeText}>✓ Moins cher</Text>
        </View>
      )}

      <View style={carteStyles.header}>
        <View style={carteStyles.lieuInfo}>
          <Text style={carteStyles.emoji}>{emojiTypeLieu(typeLieu)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={carteStyles.nomLieu} numberOfLines={1}>
              {nomLieu !== typeLieu ? nomLieu : labelTypeLieu(typeLieu)}
            </Text>
            <Text style={carteStyles.typeLieu}>{labelTypeLieu(typeLieu)}</Text>
          </View>
        </View>
        <View style={carteStyles.rangBadge}>
          <Text style={carteStyles.rangText}>#{rang}</Text>
        </View>
      </View>

      <View style={carteStyles.prixRow}>
        <Text style={[carteStyles.prix, isLeMoinsCher && { color: VERT }, isPlusCher && { color: ROUGE }]}>
          {prixMoyen.toLocaleString("fr-FR")} FCFA
        </Text>
        <Text style={carteStyles.unite}>/ {LABELS_UNITE[unite] ?? unite}</Text>
        {ecartPct > 0 && (
          <View style={[carteStyles.ecartBadge, { backgroundColor: isPlusCher ? "#FDECEA" : "#FFF3CD" }]}>
            <Text style={[carteStyles.ecartText, { color: isPlusCher ? ROUGE : ORANGE }]}>
              +{ecartPct}%
            </Text>
          </View>
        )}
      </View>

      <BarrePrix
        prix={prixMoyen}
        prixMin={globalMin}
        prixMax={globalMax}
        isMin={isLeMoinsCher}
      />

      <View style={carteStyles.footer}>
        {prixMin !== prixMax && (
          <Text style={carteStyles.meta}>
            {prixMin.toLocaleString("fr-FR")} – {prixMax.toLocaleString("fr-FR")} FCFA
          </Text>
        )}
        <Text style={carteStyles.meta}>
          {nbSignalements} signal. · il y a {dateRelative(derniereMAJ)}
        </Text>
      </View>

      {/* ─── VALIDATION COMMUNAUTAIRE ─────────────────── */}
      {signalementId && userIdAuteur && (
        <View style={carteStyles.separateur} />
      )}
      {signalementId && userIdAuteur && (
        <BoutonsValidation
          signalementId={signalementId}
          userIdAuteur={userIdAuteur}
          nbConfirmations={nbConfirmations}
          nbContestations={nbContestations}
          scoreFilabilite={scoreFilabiliteMoyen}
        />
      )}

      {/* ─── LIEN VERS LE DÉTAIL ──────────────────────── */}
      {signalementId && (
        <TouchableOpacity
          style={carteStyles.detailBtn}
          onPress={() =>
            (router as any).push({
              pathname: "/detail/[id]",
              params: {
                id: signalementId,
                produitId: produitIdRef,
                commune: communeRef,
              },
            })
          }
        >
          <Text style={carteStyles.detailBtnText}>
            📈 Voir l'historique et l'évolution du prix →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const carteStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  containerBest: {
    borderColor: VERT,
    backgroundColor: "#FAFFFC",
  },
  bestBadge: {
    alignSelf: "flex-start",
    backgroundColor: VERT,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  bestBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  lieuInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  emoji: { fontSize: 24 },
  nomLieu: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  typeLieu: { fontSize: 12, color: "#888888", marginTop: 1 },
  rangBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  rangText: { fontSize: 12, fontWeight: "700", color: "#555555" },
  prixRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 2,
  },
  prix: { fontSize: 24, fontWeight: "800", color: "#1A1A1A" },
  unite: { fontSize: 13, color: "#888888" },
  ecartBadge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ecartText: { fontSize: 12, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    flexWrap: "wrap",
    gap: 4,
  },
  meta: { fontSize: 11, color: "#AAAAAA" },
  separateur: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginTop: 12,
    marginBottom: 2,
  },
  detailBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  detailBtnText: {
    fontSize: 12,
    color: VERT,
    fontWeight: "700",
  },
});

// ─── Vue résumé d'un produit dans la liste ────────────────
function ProduitResume({
  produitId,
  produitNom,
  prixMoyen,
  prixMin,
  prixMax,
  unite,
  nbSignalements,
  onPress,
}: {
  produitId: string;
  produitNom: string;
  prixMoyen: number;
  prixMin: number;
  prixMax: number;
  unite: string;
  nbSignalements: number;
  onPress: () => void;
}) {
  const ecart = prixMax - prixMin;
  const alerteEcart = ecart > prixMoyen * 0.3;

  return (
    <TouchableOpacity style={resumeStyles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={resumeStyles.left}>
        <Text style={resumeStyles.nom} numberOfLines={1}>{produitNom}</Text>
        <Text style={resumeStyles.nb}>{nbSignalements} signalement{nbSignalements > 1 ? "s" : ""}</Text>
      </View>
      <View style={resumeStyles.right}>
        <Text style={resumeStyles.prix}>
          {prixMoyen.toLocaleString("fr-FR")} F
        </Text>
        <Text style={resumeStyles.unite}>/{LABELS_UNITE[unite] ?? unite}</Text>
        {alerteEcart && <Text style={resumeStyles.alerte}>⚠</Text>}
        <Text style={resumeStyles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const resumeStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  left: { flex: 1, marginRight: 8 },
  nom: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  nb: { fontSize: 11, color: "#AAAAAA", marginTop: 2 },
  right: { flexDirection: "row", alignItems: "center", gap: 3 },
  prix: { fontSize: 16, fontWeight: "800", color: VERT },
  unite: { fontSize: 12, color: "#888888" },
  alerte: { fontSize: 14, marginLeft: 2 },
  chevron: { fontSize: 20, color: "#CCCCCC", marginLeft: 4 },
});

// ─── ÉCRAN PRINCIPAL ──────────────────────────────────────
export default function ExplorerScreen() {
  const { communeSelectionnee, setCommuneSelectionnee } = useAppStore();
  const router = useRouter();

  // ── Mode : liste de produits OU comparaison d'un produit
  const [mode, setMode] = useState<"liste" | "comparaison">("liste");
  const [produitSelectionne, setProduitSelectionne] = useState<{
    id: string;
    nom: string;
    unite: string;
  } | null>(null);

  // ── Données liste
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState<"alimentation" | "transport" | null>(null);

  // ── Données comparaison
  const [pointsDeVente, setPointsDeVente] = useState<any[]>([]);
  const [loadingComparaison, setLoadingComparaison] = useState(false);

  // ─── Charger la liste de produits ─────────────────────
  const chargerProduits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPrixAgreges(communeSelectionnee);
      setProduits(data);
    } finally {
      setLoading(false);
    }
  }, [communeSelectionnee]);

  useEffect(() => {
    chargerProduits();
  }, [communeSelectionnee]);

  // ─── Ouvrir la comparaison d'un produit ───────────────
  const ouvrirComparaison = useCallback(
    async (produitId: string, produitNom: string, unite: string) => {
      setProduitSelectionne({ id: produitId, nom: produitNom, unite });
      setMode("comparaison");
      setLoadingComparaison(true);
      try {
        const data = await getPrixParPointDeVente(produitId, communeSelectionnee);
        setPointsDeVente(data);
      } finally {
        setLoadingComparaison(false);
      }
    },
    [communeSelectionnee]
  );

  // ─── Filtres liste ─────────────────────────────────────
  const produitsFiltres = produits.filter((p) => {
    const produitRef = PRODUITS_REF.find((r) => r.id === p.produitId);
    const matchCategorie =
      !categorieFiltre || produitRef?.categorie === categorieFiltre;
    const matchRecherche =
      !recherche ||
      p.produitNom.toLowerCase().includes(recherche.toLowerCase());
    return matchCategorie && matchRecherche;
  });

  const globalMin = pointsDeVente.length
    ? Math.min(...pointsDeVente.map((p) => p.prixMoyen))
    : 0;
  const globalMax = pointsDeVente.length
    ? Math.max(...pointsDeVente.map((p) => p.prixMoyen))
    : 0;
  const economie = globalMax - globalMin;

  // ─── RENDER : vue comparaison ─────────────────────────
  if (mode === "comparaison" && produitSelectionne) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => { setMode("liste"); setPointsDeVente([]); }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {produitSelectionne.nom}
          </Text>
          <Text style={styles.headerSub}>{communeSelectionnee}</Text>
        </View>

        {loadingComparaison ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={VERT} />
            <Text style={styles.loadingText}>Comparaison en cours…</Text>
          </View>
        ) : pointsDeVente.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>Aucune comparaison disponible</Text>
            <Text style={styles.emptySub}>
              Sois le premier à signaler ce produit dans plusieurs points de vente à {communeSelectionnee}.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Bannière économie potentielle */}
            {economie > 0 && (
              <View style={styles.economieBanner}>
                <Text style={styles.economieTitle}>
                  💰 Économie potentielle : {economie.toLocaleString("fr-FR")} FCFA
                </Text>
                <Text style={styles.economieSub}>
                  Entre le moins cher et le plus cher à {communeSelectionnee}
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>
              {pointsDeVente.length} point{pointsDeVente.length > 1 ? "s" : ""} de vente comparés
            </Text>

            {pointsDeVente.map((pdv, index) => (
              <CartePointDeVente
                key={`${pdv.typeLieu}-${pdv.nomLieu}-${index}`}
                {...pdv}
                globalMin={globalMin}
                globalMax={globalMax}
                rang={index + 1}
                produitIdRef={produitSelectionne?.id}
                communeRef={communeSelectionnee}
              />
            ))}

            {/* Note méthodologique */}
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                ℹ Les prix affichés sont des moyennes basées sur les signalements citoyens des 30 derniers jours. Seuls les signalements avec un score de fiabilité ≥ 30 sont pris en compte.
              </Text>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    );
  }

  // ─── RENDER : vue liste ───────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorer</Text>
        <Text style={styles.headerSub}>Comparer les prix par point de vente</Text>
      </View>

      {/* Sélecteur commune */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.communeScroll}
        contentContainerStyle={styles.communeScrollContent}
      >
        {COMMUNES_ABIDJAN.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, communeSelectionnee === c && styles.chipActive]}
            onPress={() => setCommuneSelectionnee(c)}
          >
            <Text style={[styles.chipText, communeSelectionnee === c && styles.chipTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filtres catégorie */}
      <View style={styles.filtreRow}>
        {(["alimentation", "transport"] as const).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filtreBtn, categorieFiltre === cat && styles.filtreBtnActive]}
            onPress={() => setCategorieFiltre(categorieFiltre === cat ? null : cat)}
          >
            <Text style={[styles.filtreBtnText, categorieFiltre === cat && styles.filtreBtnTextActive]}>
              {cat === "alimentation" ? "🛒 Alim." : "🚌 Transport"}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Barre de recherche */}
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher…"
          value={recherche}
          onChangeText={setRecherche}
          placeholderTextColor="#AAAAAA"
        />
      </View>

      {/* Liste */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={VERT} />
        </View>
      ) : produitsFiltres.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>
            Aucun produit signalé à {communeSelectionnee}
          </Text>
          <Text style={styles.emptySub}>
            {recherche
              ? `Aucun résultat pour "${recherche}"`
              : "Commence par signaler des prix dans cette commune."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={produitsFiltres}
          keyExtractor={(item) => `${item.produitId}-${item.unite}`}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <ProduitResume
              produitId={item.produitId}
              produitNom={item.produitNom}
              prixMoyen={item.prixMoyen}
              prixMin={item.prixMin}
              prixMax={item.prixMax}
              unite={item.unite}
              nbSignalements={item.nbSignalements}
              onPress={() =>
                ouvrirComparaison(item.produitId, item.produitNom, item.unite)
              }
            />
          )}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {produitsFiltres.length} produit{produitsFiltres.length > 1 ? "s" : ""} suivis à {communeSelectionnee}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GRIS },
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
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)" },
  communeScroll: { maxHeight: 48, backgroundColor: "#FFFFFF" },
  communeScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  chipActive: { backgroundColor: VERT },
  chipText: { fontSize: 12, color: "#555555", fontWeight: "500" },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  filtreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  filtreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  filtreBtnActive: { backgroundColor: VERT },
  filtreBtnText: { fontSize: 12, color: "#555555", fontWeight: "600" },
  filtreBtnTextActive: { color: "#FFFFFF" },
  searchInput: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: "#1A1A1A",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 14 },
  sectionLabel: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
    marginBottom: 10,
    marginTop: 4,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 8 },
  loadingText: { color: "#888888", fontSize: 14 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#333333", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#888888", textAlign: "center", lineHeight: 18 },
  economieBanner: {
    backgroundColor: VERT_CLAIR,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: VERT,
  },
  economieTitle: { fontSize: 15, fontWeight: "800", color: VERT },
  economieSub: { fontSize: 12, color: "#555555", marginTop: 2 },
  noteBox: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  noteText: { fontSize: 11, color: "#888888", lineHeight: 16 },
});
