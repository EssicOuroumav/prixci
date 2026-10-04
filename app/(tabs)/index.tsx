import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { getPrixAgreges, PrixAgregeLocal } from "@/services/db";
import { syncAvecStore } from "@/services/sync";
import { getCommerces, Commerce } from "@/services/commerces";
import {
  referencesDeZone,
  comparerAuPrixOfficiel,
  libelleReference,
  PrixReference,
} from "@/services/reference";
import { SEUIL_APPUIS } from "@/services/scoring";
import { infoTypeLieu, villeDeZone, NomIcone } from "@/constants/types";
import { LABELS_UNITE, getProduitById } from "@/constants/produits";
import Icone from "@/components/Icone";
import SelecteurCategorie from "@/components/SelecteurCategorie";
import SelecteurZone from "@/components/SelecteurZone";
import { HAUT_ECRAN } from "@/constants/layout";

// ============================================================
// ACCUEIL
// Alimentation : les commerces qui vendent au prix officiel, puis les prix
// officiels de la semaine. Transport : les tarifs constatés et vérifiés.
// ============================================================

const VERT = "#0A5F38";
const ROUGE = "#C0392B";
const ORANGE = "#D4820A";

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

// ─── Carte d'un commerce ──────────────────────────────────
function CarteCommerce({ commerce, onPress }: { commerce: Commerce; onPress: () => void }) {
  const conforme = commerce.statut === "conforme";
  const depassement = commerce.statut === "depassement";
  const couleur = conforme ? VERT : depassement ? ROUGE : "#888888";
  const nbVerifies = commerce.prix.length;

  return (
    <TouchableOpacity style={styles.commerce} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.commerceIcone, { backgroundColor: couleur + "14" }]}>
        <Icone nom={infoTypeLieu(commerce.typeLieu).icone} taille={24} couleur={couleur} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.commerceNom} numberOfLines={1}>{commerce.nomLieu}</Text>
        <Text style={styles.commerceSub} numberOfLines={1}>
          {infoTypeLieu(commerce.typeLieu).label}
          {commerce.quartier ? ` · ${commerce.quartier}` : ""}
        </Text>
        <View style={styles.statutRow}>
          <Icone
            nom={conforme ? "shield-checkmark" : depassement ? "alert-circle" : "ellipse-outline"}
            taille={13}
            couleur={couleur}
          />
          <Text style={[styles.statutTexte, { color: couleur }]}>
            {conforme
              ? `Au prix officiel · ${commerce.nbConformes} produit${commerce.nbConformes > 1 ? "s" : ""} vérifié${commerce.nbConformes > 1 ? "s" : ""}`
              : depassement
              ? `${commerce.nbDepassements} dépassement${commerce.nbDepassements > 1 ? "s" : ""} sur ${nbVerifies} produit${nbVerifies > 1 ? "s" : ""}`
              : `${nbVerifies} prix vérifié${nbVerifies > 1 ? "s" : ""}, sans prix officiel`}
          </Text>
        </View>
      </View>
      <Icone nom="chevron-forward" taille={18} couleur="#CCCCCC" />
    </TouchableOpacity>
  );
}

// ─── Ligne d'un prix officiel ─────────────────────────────
function LignePrixOfficiel({
  reference,
  constate,
}: {
  reference: PrixReference;
  constate: PrixAgregeLocal | undefined;
}) {
  const nom = getProduitById(reference.produitId)?.nom ?? reference.produitId;
  const moyenne = constate?.prixMoyen ?? null;
  const comparaison = moyenne !== null ? comparerAuPrixOfficiel(moyenne, reference) : null;

  return (
    <View style={styles.ligne}>
      <View style={{ flex: 1 }}>
        <Text style={styles.ligneNom} numberOfLines={1}>{nom}</Text>
        {comparaison && (
          <Text
            style={[
              styles.ligneConstate,
              { color: comparaison.statut === "depassement" ? ROUGE : VERT },
            ]}
          >
            Constaté : {moyenne!.toLocaleString("fr-FR")} FCFA
            {comparaison.ecartPct !== null && comparaison.ecartPct !== 0
              ? ` (${comparaison.ecartPct > 0 ? "+" : ""}${comparaison.ecartPct} %)`
              : ""}
          </Text>
        )}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.lignePrix}>
          {reference.prix.toLocaleString("fr-FR")} F
          <Text style={styles.ligneUnite}> /{LABELS_UNITE[reference.unite] ?? reference.unite}</Text>
        </Text>
        {reference.prixMin != null &&
          reference.prixMax != null &&
          reference.prixMin !== reference.prixMax && (
            <Text style={styles.ligneSousTexte}>
              de {reference.prixMin.toLocaleString("fr-FR")} à {reference.prixMax.toLocaleString("fr-FR")}
            </Text>
          )}
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const {
    communeSelectionnee,
    setCommuneSelectionnee,
    syncStatus,
    isInitialized,
    categorieActive,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [prixConstates, setPrixConstates] = useState<PrixAgregeLocal[]>([]);
  const [references, setReferences] = useState<PrixReference[]>([]);

  const chargerDonnees = useCallback(async () => {
    try {
      const [listeCommerces, agreges] = await Promise.all([
        getCommerces(communeSelectionnee),
        getPrixAgreges(communeSelectionnee),
      ]);
      setCommerces(listeCommerces);
      setPrixConstates(agreges);
      setReferences(
        referencesDeZone(communeSelectionnee).sort((a, b) =>
          (getProduitById(a.produitId)?.nom ?? "").localeCompare(
            getProduitById(b.produitId)?.nom ?? "",
            "fr"
          )
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communeSelectionnee]);

  // Recharge à chaque retour sur l'onglet (après un signalement ou un vote)
  useFocusEffect(
    useCallback(() => {
      if (isInitialized) chargerDonnees();
    }, [chargerDonnees, isInitialized])
  );

  // La fin d'une synchronisation peut apporter de nouveaux prix
  React.useEffect(() => {
    if (isInitialized && syncStatus === "success") chargerDonnees();
  }, [syncStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAvecStore();
    await chargerDonnees();
  }, [chargerDonnees]);

  const estTransport = categorieActive === "transport";
  const ville = villeDeZone(communeSelectionnee);

  // Alimentation et transport ne sont jamais mélangés
  const constatesCategorie = prixConstates.filter((p) => p.categorie === categorieActive);
  const nbEnAttente = constatesCategorie.reduce((n, p) => n + p.nbEnAttente, 0);
  const tarifsVerifies = constatesCategorie.filter((p) => p.prixMoyen !== null);
  const constateParCle = new Map(
    constatesCategorie.map((p) => [`${p.produitId}|${p.unite}`, p])
  );

  const commercesConformes = commerces.filter((c) => c.statut === "conforme");
  const autresCommerces = commerces.filter((c) => c.statut !== "conforme");
  const typeReference = references[0]?.type ?? "moyen";
  // Une ville peut combiner plusieurs publications officielles
  const sources = [
    ...new Map(references.map((r) => [r.source, r])).values(),
  ].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));

  const syncIndicator = (): { icone: NomIcone; texte: string } | null => {
    if (syncStatus === "syncing") return { icone: "sync-outline", texte: "Synchronisation…" };
    if (syncStatus === "offline") return { icone: "cloud-offline-outline", texte: "Hors ligne" };
    if (syncStatus === "success") return { icone: "checkmark-circle-outline", texte: "Synchronisé" };
    if (syncStatus === "error") return { icone: "alert-circle-outline", texte: "Synchro incomplète" };
    return null;
  };
  const sync = syncIndicator();

  const ouvrirCommerce = (c: Commerce) =>
    router.push({ pathname: "/commerce", params: { commune: c.commune, cle: c.cle } });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerMarque}>
          <Image source={require("../../assets/logo-mark.png")} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>PrixCI</Text>
            <Text style={styles.headerSub}>Les commerces au prix officiel</Text>
          </View>
        </View>
        {sync && (
          <View style={styles.syncRow}>
            <Icone nom={sync.icone} taille={13} couleur="rgba(255,255,255,0.85)" />
            <Text style={styles.syncIndicator}>{sync.texte}</Text>
          </View>
        )}
      </View>

      <SelecteurZone zone={communeSelectionnee} onChange={setCommuneSelectionnee} />
      <SelecteurCategorie />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={VERT} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[VERT]} tintColor={VERT} />
          }
        >
          {nbEnAttente > 0 && (
            <TouchableOpacity style={[styles.attenteBanner, { marginBottom: 10 }]} onPress={() => router.push("/(tabs)/explorer")}>
              <Text style={styles.attenteTitle}>
                {nbEnAttente} signalement{nbEnAttente > 1 ? "s" : ""} à confirmer à {communeSelectionnee}
              </Text>
              <Text style={styles.attenteSub}>
                Un prix est vérifié quand {SEUIL_APPUIS} citoyens l'ont constaté. Confirme dans Explorer →
              </Text>
            </TouchableOpacity>
          )}

          {estTransport ? (
            <>
              <Text style={styles.sectionTitre}>Tarifs vérifiés à {communeSelectionnee}</Text>
              {tarifsVerifies.length === 0 ? (
                <View style={styles.videBox}>
                  <Icone nom="bus-outline" taille={40} couleur="#B8C4BC" />
                  <Text style={styles.videTitre}>Aucun tarif vérifié pour l'instant</Text>
                  <Text style={styles.videTexte}>
                    Signale le tarif d'un trajet : il est vérifié dès que {SEUIL_APPUIS} citoyens constatent le même.
                  </Text>
                </View>
              ) : (
                tarifsVerifies.map((t) => (
                  <View key={`${t.produitId}-${t.unite}`} style={styles.ligne}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ligneNom} numberOfLines={1}>{t.produitNom}</Text>
                      {t.prixMin !== t.prixMax && (
                        <Text style={styles.ligneSousTexte}>
                          de {t.prixMin!.toLocaleString("fr-FR")} à {t.prixMax!.toLocaleString("fr-FR")} FCFA
                        </Text>
                      )}
                    </View>
                    <Text style={styles.lignePrix}>{t.prixMoyen!.toLocaleString("fr-FR")} F</Text>
                    <Text style={styles.ligneUnite}>/trajet</Text>
                  </View>
                ))
              )}
              <View style={styles.noteBox}>
                <Text style={styles.noteTexte}>
                  Aucun tarif officiel de transport n'est encore intégré à PrixCI. Les tarifs affichés sont ceux constatés par les citoyens.
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* ── Faire mon marché ───────────────────────── */}
              <TouchableOpacity
                style={styles.marche}
                onPress={() => router.push("/marche")}
                activeOpacity={0.85}
              >
                <View style={styles.marcheIcone}>
                  <Icone nom="basket" taille={26} couleur={VERT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.marcheTitre}>Faire mon marché</Text>
                  <Text style={styles.marcheTexte}>
                    Coche tes produits : vois où les acheter au prix officiel, et combien les payer.
                  </Text>
                </View>
                <Icone nom="chevron-forward" taille={20} couleur="rgba(255,255,255,0.8)" />
              </TouchableOpacity>

              {/* ── Commerces au prix officiel ─────────────── */}
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitre, { flex: 1 }]}>
                  Commerces au prix officiel à {communeSelectionnee}
                </Text>
                <TouchableOpacity
                  style={styles.lienCarte}
                  onPress={() =>
                    router.push({ pathname: "/carte", params: { commune: communeSelectionnee } })
                  }
                >
                  <Icone nom="map-outline" taille={15} couleur={VERT} />
                  <Text style={styles.lienCarteTexte}>Carte</Text>
                </TouchableOpacity>
              </View>
              {commercesConformes.length === 0 ? (
                <View style={styles.videBox}>
                  <Icone nom="storefront-outline" taille={40} couleur="#B8C4BC" />
                  <Text style={styles.videTitre}>Aucun commerce vérifié pour l'instant</Text>
                  <Text style={styles.videTexte}>
                    Un commerce apparaît ici quand {SEUIL_APPUIS} citoyens constatent qu'il vend au prix officiel. Signale les prix du commerce où tu achètes.
                  </Text>
                  <TouchableOpacity style={styles.cta} onPress={() => router.push("/(tabs)/signaler")}>
                    <Text style={styles.ctaTexte}>Signaler un prix</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                commercesConformes.map((c) => (
                  <CarteCommerce key={c.cle} commerce={c} onPress={() => ouvrirCommerce(c)} />
                ))
              )}

              {autresCommerces.length > 0 && (
                <>
                  <Text style={styles.sectionTitre}>Autres commerces évalués</Text>
                  {autresCommerces.map((c) => (
                    <CarteCommerce key={c.cle} commerce={c} onPress={() => ouvrirCommerce(c)} />
                  ))}
                </>
              )}

              {/* ── Prix officiels ─────────────────────────── */}
              <Text style={styles.sectionTitre}>Prix officiels · {ville}</Text>
              {references.length === 0 ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteTexte}>Aucun prix officiel disponible pour {ville}.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.sourceBox}>
                    <Icone nom="information-circle-outline" taille={15} couleur="#555555" />
                    <Text style={styles.sourceTexte}>
                      {libelleReference(typeReference)}, indicatif.
                      {sources
                        .map(
                          (s) =>
                            `\n${s.source}` +
                            (s.dateFin ? `, du ${dateCourte(s.dateDebut)} au ${dateCourte(s.dateFin)}` : "")
                        )
                        .join("")}
                    </Text>
                  </View>
                  {references.map((r) => (
                    <LignePrixOfficiel
                      key={`${r.produitId}|${r.unite}`}
                      reference={r}
                      constate={constateParCle.get(`${r.produitId}|${r.unite}`)}
                    />
                  ))}
                </>
              )}
            </>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },
  header: {
    backgroundColor: VERT,
    paddingTop: HAUT_ECRAN,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerMarque: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#FFFFFF" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncIndicator: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 14 },
  sectionTitre: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A1A",
    marginTop: 12,
    marginBottom: 10,
  },
  marche: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: VERT,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  marcheIcone: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  marcheTitre: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  marcheTexte: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 2, lineHeight: 17 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  lienCarte: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  lienCarteTexte: { color: VERT, fontSize: 13, fontWeight: "700" },
  attenteBanner: {
    backgroundColor: "#FFF8E6",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: ORANGE,
  },
  attenteTitle: { fontSize: 14, fontWeight: "700", color: "#8A5200" },
  attenteSub: { fontSize: 12, color: "#8A5200", marginTop: 2, lineHeight: 16 },
  commerce: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  commerceIcone: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  commerceNom: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  commerceSub: { fontSize: 12, color: "#888888", marginTop: 1 },
  statutRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  statutTexte: { fontSize: 12, fontWeight: "700", flex: 1 },
  videBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  videTitre: { fontSize: 15, fontWeight: "700", color: "#333333", textAlign: "center" },
  videTexte: { fontSize: 13, color: "#777777", textAlign: "center", lineHeight: 19 },
  cta: {
    marginTop: 6,
    backgroundColor: VERT,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  ctaTexte: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  sourceBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#EEF1EE",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  sourceTexte: { fontSize: 11, color: "#555555", lineHeight: 16, flex: 1 },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 5,
  },
  ligneNom: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  ligneConstate: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  ligneSousTexte: { fontSize: 11, color: "#888888", marginTop: 2 },
  lignePrix: { fontSize: 16, fontWeight: "800", color: VERT },
  ligneUnite: { fontSize: 12, color: "#888888", marginLeft: 2 },
  noteBox: { backgroundColor: "#EEF1EE", borderRadius: 10, padding: 12, marginTop: 8 },
  noteTexte: { fontSize: 12, color: "#666666", lineHeight: 17 },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: VERT,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
