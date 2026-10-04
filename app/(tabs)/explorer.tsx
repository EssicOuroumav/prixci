import React, { useState, useCallback } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import {
  getPrixAgreges,
  getPrixParPointDeVente,
  getSignalementsEnAttente,
  PrixAgregeLocal,
  PointDeVente,
} from "@/services/db";
import {
  getPrixOfficielsCompares,
  infoTypeEnseigne,
  PrixOfficielCompare,
} from "@/services/enseignes";
import { SEUIL_APPUIS } from "@/services/scoring";
import SelecteurZone from "@/components/SelecteurZone";
import { LABELS_UNITE } from "@/constants/produits";
import { infoTypeLieu, infoMoment, Signalement } from "@/constants/types";
import BoutonsValidation from "@/components/BoutonsValidation";
import Icone from "@/components/Icone";
import SelecteurCategorie from "@/components/SelecteurCategorie";

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

function labelTypeLieu(type: string): string {
  return infoTypeLieu(type).label;
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

// ─── Carte d'un point de vente (prix vérifiés) ────────────
function CartePointDeVente({
  pdv,
  globalMin,
  globalMax,
  rang,
  onVoirDetail,
}: {
  pdv: PointDeVente;
  globalMin: number;
  globalMax: number;
  rang: number;
  onVoirDetail: (signalementId: string) => void;
}) {
  const { typeLieu, nomLieu, prixMoyen, prixMin, prixMax, unite } = pdv;
  const isLeMoinsCher = prixMoyen === globalMin;
  const isPlusCher = prixMoyen === globalMax && globalMax !== globalMin;
  const ecartPct = globalMin > 0
    ? Math.round(((prixMoyen - globalMin) / globalMin) * 100)
    : 0;

  return (
    <View style={[carteStyles.container, isLeMoinsCher && carteStyles.containerBest]}>
      {isLeMoinsCher && (
        <View style={carteStyles.bestBadge}>
          <Icone nom="checkmark" taille={12} couleur="#FFFFFF" />
          <Text style={carteStyles.bestBadgeText}>Moins cher</Text>
        </View>
      )}

      <View style={carteStyles.header}>
        <View style={carteStyles.lieuInfo}>
          <Icone nom={infoTypeLieu(typeLieu).icone} taille={24} couleur={VERT} />
          <View style={{ flex: 1 }}>
            <Text style={carteStyles.nomLieu} numberOfLines={1}>
              {nomLieu || labelTypeLieu(typeLieu)}
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
          {pdv.nbSignalements} signal. vérifié{pdv.nbSignalements > 1 ? "s" : ""} · il y a {dateRelative(pdv.derniereMAJ)}
        </Text>
      </View>

      {pdv.signalementId && (
        <TouchableOpacity
          style={carteStyles.detailBtn}
          onPress={() => onVoirDetail(pdv.signalementId!)}
        >
          <Text style={carteStyles.detailBtnText}>
            Voir l'historique et l'évolution du prix →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Carte d'un prix officiel publié par une enseigne ─────
function CartePrixOfficiel({
  officiel,
  onPress,
}: {
  officiel: PrixOfficielCompare;
  onPress: () => void;
}) {
  const type = infoTypeEnseigne(officiel.enseigneType);
  return (
    <TouchableOpacity style={officielStyles.container} onPress={onPress} activeOpacity={0.7}>
      <Icone nom={type.icone} taille={24} couleur={VERT} />
      <View style={{ flex: 1 }}>
        <Text style={carteStyles.nomLieu} numberOfLines={1}>{officiel.enseigneNom}</Text>
        <Text style={carteStyles.typeLieu}>
          {type.label} · mis à jour il y a {dateRelative(officiel.dateMiseAJour)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={officielStyles.prix}>
          {officiel.prix.toLocaleString("fr-FR")} F
          <Text style={carteStyles.unite}> /{LABELS_UNITE[officiel.unite] ?? officiel.unite}</Text>
        </Text>
        <View style={officielStyles.badgeRow}>
          <Icone nom="checkmark-circle" taille={12} couleur={VERT} />
          <Text style={officielStyles.badge}>Officiel</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const officielStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: VERT,
  },
  prix: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  badge: { fontSize: 11, color: VERT, fontWeight: "700" },
});

// ─── Carte d'un signalement encore à confirmer ────────────
function CarteEnAttente({
  signalement,
  estLeMien,
  onVote,
  onVoirDetail,
}: {
  signalement: Signalement;
  estLeMien: boolean;
  onVote: () => void;
  onVoirDetail: () => void;
}) {
  const appuis = signalement.appuis ?? 1;
  const restant = Math.max(0, SEUIL_APPUIS - appuis);
  return (
    <View style={[carteStyles.container, attenteStyles.container]}>
      <View style={carteStyles.header}>
        <View style={carteStyles.lieuInfo}>
          <Icone nom={infoTypeLieu(signalement.typeLieu).icone} taille={24} couleur={VERT} />
          <View style={{ flex: 1 }}>
            <Text style={carteStyles.nomLieu} numberOfLines={1}>
              {signalement.nomLieu || labelTypeLieu(signalement.typeLieu)}
            </Text>
            <Text style={carteStyles.typeLieu}>
              {signalement.categorie === "transport"
                ? infoMoment(signalement.moment).label
                : labelTypeLieu(signalement.typeLieu)}
              {signalement.quartier ? ` · ${signalement.quartier}` : ""} · il y a {dateRelative(signalement.dateSignalement)}
            </Text>
          </View>
        </View>
      </View>

      <View style={carteStyles.prixRow}>
        <Text style={carteStyles.prix}>
          {signalement.prix.toLocaleString("fr-FR")} FCFA
        </Text>
        <Text style={carteStyles.unite}>/ {LABELS_UNITE[signalement.unite] ?? signalement.unite}</Text>
      </View>

      <Text style={attenteStyles.progression}>
        {appuis} / {SEUIL_APPUIS} citoyens l'ont constaté · encore {restant} pour qu'il soit vérifié
      </Text>

      <View style={carteStyles.separateur} />
      {estLeMien ? (
        <Text style={attenteStyles.mien}>
          C'est ton signalement : il attend la confirmation des autres citoyens.
        </Text>
      ) : (
        <BoutonsValidation
          signalementId={signalement.id}
          userIdAuteur={signalement.userId}
          nbConfirmations={signalement.nbConfirmations}
          nbContestations={signalement.nbContestations}
          scoreFilabilite={signalement.scoreFilabilite}
          onValidationEffectuee={onVote}
        />
      )}

      <TouchableOpacity style={carteStyles.detailBtn} onPress={onVoirDetail}>
        <Text style={carteStyles.detailBtnText}>Voir le détail →</Text>
      </TouchableOpacity>
    </View>
  );
}

const attenteStyles = StyleSheet.create({
  container: { borderColor: "#F0DDB5", backgroundColor: "#FFFDF7" },
  progression: { fontSize: 12, color: "#8A5200", fontWeight: "600", marginTop: 6 },
  mien: { fontSize: 12, color: "#888888", marginTop: 10, lineHeight: 17 },
});

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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  produit,
  onPress,
}: {
  produit: PrixAgregeLocal;
  onPress: () => void;
}) {
  const { prixMoyen, prixMin, prixMax, unite, nbSignalements, nbEnAttente } = produit;
  const alerteEcart =
    prixMoyen !== null && prixMin !== null && prixMax !== null &&
    prixMax - prixMin > prixMoyen * 0.3;

  const detail = [
    nbSignalements > 0 ? `${nbSignalements} vérifié${nbSignalements > 1 ? "s" : ""}` : null,
    nbEnAttente > 0 ? `${nbEnAttente} à confirmer` : null,
  ].filter(Boolean).join(" · ");

  return (
    <TouchableOpacity style={resumeStyles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={resumeStyles.left}>
        <Text style={resumeStyles.nom} numberOfLines={1}>{produit.produitNom}</Text>
        <Text style={resumeStyles.nb}>{detail}</Text>
      </View>
      <View style={resumeStyles.right}>
        {prixMoyen !== null ? (
          <>
            <Text style={resumeStyles.prix}>{prixMoyen.toLocaleString("fr-FR")} F</Text>
            <Text style={resumeStyles.unite}>/{LABELS_UNITE[unite] ?? unite}</Text>
            {alerteEcart && <Icone nom="warning-outline" taille={14} couleur="#D4820A" />}
          </>
        ) : (
          <Text style={resumeStyles.aConfirmer}>À confirmer</Text>
        )}
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
  aConfirmer: { fontSize: 12, fontWeight: "700", color: "#8A5200" },
  chevron: { fontSize: 20, color: "#CCCCCC", marginLeft: 4 },
});

// ─── ÉCRAN PRINCIPAL ──────────────────────────────────────
export default function ExplorerScreen() {
  const { user, communeSelectionnee, setCommuneSelectionnee, categorieActive } = useAppStore();
  const router = useRouter();

  // ── Mode : liste de produits OU comparaison d'un produit
  const [produitSelectionne, setProduitSelectionne] = useState<{
    id: string;
    nom: string;
  } | null>(null);

  // ── Données liste
  const [produits, setProduits] = useState<PrixAgregeLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState("");

  // ── Données comparaison
  const [pointsDeVente, setPointsDeVente] = useState<PointDeVente[]>([]);
  const [enAttente, setEnAttente] = useState<Signalement[]>([]);
  const [officiels, setOfficiels] = useState<PrixOfficielCompare[]>([]);
  const [officielsIndisponibles, setOfficielsIndisponibles] = useState(false);
  const [loadingComparaison, setLoadingComparaison] = useState(false);

  // ─── Charger la liste de produits ─────────────────────
  const chargerProduits = useCallback(async () => {
    try {
      setProduits(await getPrixAgreges(communeSelectionnee));
    } finally {
      setLoading(false);
    }
  }, [communeSelectionnee]);

  // ─── Charger la comparaison d'un produit ──────────────
  const chargerComparaison = useCallback(
    async (produitId: string) => {
      const [pdv, attente] = await Promise.all([
        getPrixParPointDeVente(produitId, communeSelectionnee),
        getSignalementsEnAttente(produitId, communeSelectionnee),
      ]);
      setPointsDeVente(pdv);
      setEnAttente(attente);
    },
    [communeSelectionnee]
  );

  // Recharge à chaque retour sur l'onglet et à chaque changement de commune
  useFocusEffect(
    useCallback(() => {
      chargerProduits();
      if (produitSelectionne) chargerComparaison(produitSelectionne.id);
    }, [chargerProduits, chargerComparaison, produitSelectionne])
  );

  const ouvrirComparaison = async (produitId: string, produitNom: string) => {
    setProduitSelectionne({ id: produitId, nom: produitNom });
    setOfficiels([]);
    setOfficielsIndisponibles(false);
    setLoadingComparaison(true);
    try {
      await chargerComparaison(produitId);
    } finally {
      setLoadingComparaison(false);
    }
    // Les prix officiels viennent du serveur : affichés dès qu'ils arrivent
    try {
      setOfficiels(await getPrixOfficielsCompares(produitId, communeSelectionnee));
    } catch {
      setOfficielsIndisponibles(true);
    }
  };

  const fermerComparaison = () => {
    setProduitSelectionne(null);
    setPointsDeVente([]);
    setEnAttente([]);
    setOfficiels([]);
    chargerProduits();
  };

  const voirDetail = (signalementId: string) => {
    if (!produitSelectionne) return;
    router.push({
      pathname: "/detail/[id]",
      params: {
        id: signalementId,
        produitId: produitSelectionne.id,
        commune: communeSelectionnee,
      },
    });
  };

  // ─── Un seul univers à la fois (alimentation OU transport), puis recherche ──
  const terme = recherche.trim().toLowerCase();
  const estTransport = categorieActive === "transport";
  const produitsFiltres = produits.filter(
    (p) =>
      p.categorie === categorieActive &&
      (!terme || p.produitNom.toLowerCase().includes(terme))
  );

  // ─── RENDER : vue comparaison ─────────────────────────
  if (produitSelectionne) {
    const tousLesPrix = [
      ...pointsDeVente.map((p) => p.prixMoyen),
      ...officiels.map((o) => o.prix),
    ];
    const globalMin = pointsDeVente.length
      ? Math.min(...pointsDeVente.map((p) => p.prixMoyen))
      : 0;
    const globalMax = pointsDeVente.length
      ? Math.max(...pointsDeVente.map((p) => p.prixMoyen))
      : 0;
    const economie = tousLesPrix.length > 1
      ? Math.max(...tousLesPrix) - Math.min(...tousLesPrix)
      : 0;
    const rienAAfficher =
      pointsDeVente.length === 0 && enAttente.length === 0 && officiels.length === 0;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={fermerComparaison} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {produitSelectionne.nom}
          </Text>
          <Text style={styles.headerSub}>Comparaison à {communeSelectionnee}</Text>
        </View>

        {loadingComparaison ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={VERT} />
            <Text style={styles.loadingText}>Comparaison en cours…</Text>
          </View>
        ) : rienAAfficher ? (
          <View style={styles.centered}>
            <Icone nom="search-outline" taille={44} couleur="#B8C4BC" />
            <Text style={styles.emptyTitle}>Aucune comparaison disponible</Text>
            <Text style={styles.emptySub}>
              Sois le premier à signaler ce produit à {communeSelectionnee}.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {economie > 0 && (
              <View style={styles.economieBanner}>
                <Text style={styles.economieTitle}>
                  Économie potentielle : {economie.toLocaleString("fr-FR")} FCFA
                </Text>
                <Text style={styles.economieSub}>
                  Entre le moins cher et le plus cher à {communeSelectionnee}
                </Text>
              </View>
            )}

            {/* ── Prix officiels des enseignes ─────────── */}
            {officiels.length > 0 && (
              <>
                <Text style={styles.sectionTitre}>Prix officiels des enseignes</Text>
                {officiels.map((o) => (
                  <CartePrixOfficiel
                    key={`${o.enseigneId}-${o.unite}`}
                    officiel={o}
                    onPress={() =>
                      router.push({ pathname: "/enseigne/[id]", params: { id: o.enseigneId } })
                    }
                  />
                ))}
              </>
            )}
            {officielsIndisponibles && (
              <Text style={styles.sectionLabel}>
                Prix officiels des enseignes indisponibles hors ligne.
              </Text>
            )}

            {/* ── Prix signalés et vérifiés ────────────── */}
            {pointsDeVente.length > 0 && (
              <>
                <Text style={styles.sectionTitre}>
                  Prix signalés par les citoyens ({pointsDeVente.length} lieu{pointsDeVente.length > 1 ? "x" : ""})
                </Text>
                {pointsDeVente.map((pdv, index) => (
                  <CartePointDeVente
                    key={`${pdv.typeLieu}-${pdv.nomLieu}-${pdv.unite}`}
                    pdv={pdv}
                    globalMin={globalMin}
                    globalMax={globalMax}
                    rang={index + 1}
                    onVoirDetail={voirDetail}
                  />
                ))}
              </>
            )}

            {/* ── Signalements à confirmer ─────────────── */}
            {enAttente.length > 0 && (
              <>
                <Text style={styles.sectionTitre}>
                  À confirmer ({enAttente.length})
                </Text>
                <Text style={styles.sectionLabel}>
                  Tu as vu ce prix ? Confirme-le. Il est vérifié quand {SEUIL_APPUIS} citoyens l'ont constaté.
                </Text>
                {enAttente.map((s) => (
                  <CarteEnAttente
                    key={s.id}
                    signalement={s}
                    estLeMien={s.userId === user?.id}
                    onVote={() => chargerComparaison(produitSelectionne.id)}
                    onVoirDetail={() => voirDetail(s.id)}
                  />
                ))}
              </>
            )}

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                Les prix des citoyens sont des moyennes sur 30 jours, calculées sur les prix constatés par au moins {SEUIL_APPUIS} citoyens. Les prix officiels sont publiés par les enseignes elles-mêmes.
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

      <SelecteurZone zone={communeSelectionnee} onChange={setCommuneSelectionnee} />
      <SelecteurCategorie />

      {/* Recherche par nom */}
      <View style={styles.rechercheRow}>
        <Icone nom="search-outline" taille={16} couleur="#999999" />
        <TextInput
          style={styles.searchInput}
          placeholder={estTransport ? "Rechercher un trajet…" : "Rechercher un produit…"}
          value={recherche}
          onChangeText={setRecherche}
          placeholderTextColor="#AAAAAA"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Liste */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={VERT} />
        </View>
      ) : produitsFiltres.length === 0 ? (
        <View style={styles.centered}>
          <Icone
            nom={terme ? "search-outline" : estTransport ? "bus-outline" : "basket-outline"}
            taille={44}
            couleur="#B8C4BC"
          />
          <Text style={styles.emptyTitle}>
            {terme
              ? "Aucun résultat"
              : estTransport
              ? `Aucun tarif de transport signalé à ${communeSelectionnee}`
              : `Aucun prix alimentaire signalé à ${communeSelectionnee}`}
          </Text>
          <Text style={styles.emptySub}>
            {terme
              ? `Rien ne correspond à « ${recherche.trim()} » dans cette commune.`
              : "Sois le premier à en signaler un dans cette commune."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={produitsFiltres}
          keyExtractor={(item) => `${item.produitId}-${item.unite}`}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {produitsFiltres.length} {estTransport ? "trajet" : "produit"}{produitsFiltres.length > 1 ? "s" : ""} à {communeSelectionnee}
            </Text>
          }
          renderItem={({ item }) => (
            <ProduitResume
              produit={item}
              onPress={() => ouvrirComparaison(item.produitId, item.produitNom)}
            />
          )}
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
  rechercheRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  sectionTitre: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1A1A",
    marginTop: 10,
    marginBottom: 8,
  },
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
    paddingVertical: 10,
    fontSize: 14,
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
