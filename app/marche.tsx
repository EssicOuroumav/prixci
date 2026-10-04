import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import {
  getCommerces,
  commercesPourListe,
  Commerce,
  CommercePourListe,
} from "@/services/commerces";
import { prixDeReference } from "@/services/reference";
import { actualiserPosition, distanceKm, libelleDistance } from "@/services/position";
import { partager, ouvrirItineraire } from "@/services/partage";
import { PRODUITS_REF, LABELS_SOUS_CATEGORIE, LABELS_UNITE, getProduitById } from "@/constants/produits";
import { infoTypeLieu, villeDeZone } from "@/constants/types";
import Icone from "@/components/Icone";
import SelecteurZone from "@/components/SelecteurZone";

// ============================================================
// FAIRE MON MARCHÉ
// 1. Je coche mes produits.  2. Je vois où les acheter au prix officiel,
// du commerce le plus intéressant au plus proche, et combien les payer.
// Route : /marche
// ============================================================

const VERT = "#0A5F38";
const ROUGE = "#C0392B";
const CLE_LISTE = "prixci_liste_courses";
const PRODUITS_ALIMENTAIRES = PRODUITS_REF.filter((p) => p.categorie === "alimentation");

export default function MarcheScreen() {
  const router = useRouter();
  const {
    communeSelectionnee,
    setCommuneSelectionnee,
    listeCourses,
    setListeCourses,
    basculerProduitListe,
    position,
  } = useAppStore();

  const [etape, setEtape] = useState<"liste" | "resultats">("liste");
  const [recherche, setRecherche] = useState("");
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(false);
  const [listeChargee, setListeChargee] = useState(false);

  // La liste de courses est gardée sur le téléphone d'une fois sur l'autre
  useEffect(() => {
    AsyncStorage.getItem(CLE_LISTE)
      .then((v) => {
        const ids: string[] = v ? JSON.parse(v) : [];
        if (ids.length > 0 && listeCourses.length === 0) {
          setListeCourses(ids.filter((id) => getProduitById(id)));
        }
      })
      .catch(() => {})
      .finally(() => setListeChargee(true));
  }, []);

  useEffect(() => {
    if (listeChargee) AsyncStorage.setItem(CLE_LISTE, JSON.stringify(listeCourses)).catch(() => {});
  }, [listeCourses, listeChargee]);

  const chargerCommerces = useCallback(async () => {
    setLoading(true);
    try {
      setCommerces(await getCommerces(communeSelectionnee));
    } finally {
      setLoading(false);
    }
  }, [communeSelectionnee]);

  useFocusEffect(
    useCallback(() => {
      if (etape === "resultats") chargerCommerces();
    }, [etape, chargerCommerces])
  );

  const voirOuAcheter = async () => {
    setEtape("resultats");
    // La position sert à classer par distance ; on la demande ici, pas avant
    actualiserPosition(true);
  };

  const distanceDe = (c: Commerce): number | null =>
    position && c.latitude !== null && c.longitude !== null
      ? distanceKm(position, { latitude: c.latitude, longitude: c.longitude })
      : null;

  const resultats: CommercePourListe[] = commercesPourListe(commerces, listeCourses, distanceDe);
  const ville = villeDeZone(communeSelectionnee);

  // ─── Étape 1 : la liste de courses ────────────────────
  if (etape === "liste") {
    const terme = recherche.trim().toLowerCase();
    const filtres = PRODUITS_ALIMENTAIRES.filter(
      (p) => !terme || p.nom.toLowerCase().includes(terme)
    );
    const groupes = filtres.reduce((acc, p) => {
      (acc[p.sousCategorie] ??= []).push(p);
      return acc;
    }, {} as Record<string, typeof PRODUITS_REF>);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.titre}>Faire mon marché</Text>
          <Text style={styles.sousTitre}>Coche ce que tu veux acheter</Text>
        </View>

        <View style={styles.rechercheRow}>
          <Icone nom="search-outline" taille={16} couleur="#999999" />
          <TextInput
            style={styles.rechercheInput}
            placeholder="Rechercher un produit…"
            value={recherche}
            onChangeText={setRecherche}
            placeholderTextColor="#AAAAAA"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {Object.entries(groupes).map(([sousCategorie, produits]) => (
            <View key={sousCategorie}>
              <Text style={styles.groupe}>{LABELS_SOUS_CATEGORIE[sousCategorie] ?? sousCategorie}</Text>
              {produits.map((p) => {
                const coche = listeCourses.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.produit, coche && styles.produitCoche]}
                    onPress={() => basculerProduitListe(p.id)}
                    activeOpacity={0.7}
                  >
                    <Icone
                      nom={coche ? "checkbox" : "square-outline"}
                      taille={22}
                      couleur={coche ? VERT : "#BBBBBB"}
                    />
                    <Text style={[styles.produitNom, coche && { color: VERT, fontWeight: "700" }]}>
                      {p.nom}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.barreBas}>
          {listeCourses.length > 0 && (
            <TouchableOpacity onPress={() => setListeCourses([])} style={styles.vider}>
              <Text style={styles.viderTexte}>Vider</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btnPlein, { flex: 1 }, listeCourses.length === 0 && { opacity: 0.5 }]}
            disabled={listeCourses.length === 0}
            onPress={voirOuAcheter}
          >
            <Text style={styles.btnPleinTexte}>
              {listeCourses.length === 0
                ? "Choisis au moins un produit"
                : `Voir où acheter (${listeCourses.length} produit${listeCourses.length > 1 ? "s" : ""})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Étape 2 : où acheter ─────────────────────────────
  const lignesListe = listeCourses
    .map((id) => getProduitById(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ produit: p, reference: prixDeReference(p.id, p.uniteDefaut, communeSelectionnee) }));

  const messagePartage =
    `Ma liste de marché à ${communeSelectionnee} — prix officiels :\n` +
    lignesListe
      .map(
        ({ produit, reference }) =>
          `• ${produit.nom} : ` +
          (reference
            ? `${reference.prix.toLocaleString("fr-FR")} F/${LABELS_UNITE[reference.unite] ?? reference.unite}`
            : "pas de prix officiel")
      )
      .join("\n") +
    (resultats[0] && resultats[0].auPrixOfficiel.length > 0
      ? `\n\nAu prix officiel : ${resultats[0].commerce.nomLieu} (${resultats[0].commerce.commune}).`
      : "");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setEtape("liste")}>
          <Text style={styles.back}>← Modifier ma liste</Text>
        </TouchableOpacity>
        <Text style={styles.titre}>Où acheter ?</Text>
        <Text style={styles.sousTitre}>
          {listeCourses.length} produit{listeCourses.length > 1 ? "s" : ""} · {communeSelectionnee}
        </Text>
      </View>

      <SelecteurZone zone={communeSelectionnee} onChange={setCommuneSelectionnee} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Commerces ─────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitre}>Commerces pour ta liste</Text>
          <TouchableOpacity
            style={styles.lienCarte}
            onPress={() => router.push({ pathname: "/carte", params: { commune: communeSelectionnee } })}
          >
            <Icone nom="map-outline" taille={15} couleur={VERT} />
            <Text style={styles.lienCarteTexte}>Carte</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={VERT} style={{ marginVertical: 24 }} />
        ) : resultats.length === 0 ? (
          <View style={styles.videBox}>
            <Icone nom="storefront-outline" taille={38} couleur="#B8C4BC" />
            <Text style={styles.videTitre}>Aucun commerce vérifié pour ces produits</Text>
            <Text style={styles.videTexte}>
              Personne n'a encore signalé ces prix à {communeSelectionnee}. Les prix officiels ci-dessous te disent quoi payer. En rentrant du marché, signale les prix que tu as vus : tu aideras les autres mamans.
            </Text>
            <TouchableOpacity style={styles.btnContour} onPress={() => router.push("/(tabs)/signaler")}>
              <Text style={styles.btnContourTexte}>Signaler un prix</Text>
            </TouchableOpacity>
          </View>
        ) : (
          resultats.map((r, index) => {
            const { commerce } = r;
            const type = infoTypeLieu(commerce.typeLieu);
            const distance = libelleDistance(r.distanceKm);
            const bon = r.auPrixOfficiel.length > 0 && r.auDessus.length === 0;
            return (
              <View key={`${commerce.commune}|${commerce.cle}`} style={[styles.carte, index === 0 && bon && styles.carteMeilleure]}>
                {index === 0 && bon && (
                  <View style={styles.badgeMeilleur}>
                    <Icone nom="shield-checkmark" taille={12} couleur="#FFFFFF" />
                    <Text style={styles.badgeMeilleurTexte}>Meilleur choix pour ta liste</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.carteTete}
                  onPress={() =>
                    router.push({ pathname: "/commerce", params: { commune: commerce.commune, cle: commerce.cle } })
                  }
                >
                  <Icone nom={type.icone} taille={24} couleur={VERT} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.carteNom} numberOfLines={1}>{commerce.nomLieu}</Text>
                    <Text style={styles.carteSub} numberOfLines={1}>
                      {type.label}
                      {commerce.quartier ? ` · ${commerce.quartier}` : ""}
                      {distance ? ` · ${distance}` : ""}
                    </Text>
                  </View>
                  <Icone nom="chevron-forward" taille={18} couleur="#CCCCCC" />
                </TouchableOpacity>

                <Text style={[styles.resume, { color: r.auPrixOfficiel.length > 0 ? VERT : "#888888" }]}>
                  {r.auPrixOfficiel.length} produit{r.auPrixOfficiel.length > 1 ? "s" : ""} de ta liste au prix officiel
                  {r.auDessus.length > 0 ? ` · ${r.auDessus.length} au-dessus` : ""}
                </Text>

                {[...r.auPrixOfficiel, ...r.sansReference, ...r.auDessus].map((p) => (
                  <View key={`${p.produitId}|${p.unite}`} style={styles.ligneProduit}>
                    <Icone
                      nom={
                        p.statut === "conforme"
                          ? "checkmark-circle"
                          : p.statut === "depassement"
                          ? "alert-circle"
                          : "ellipse-outline"
                      }
                      taille={15}
                      couleur={p.statut === "conforme" ? VERT : p.statut === "depassement" ? ROUGE : "#999999"}
                    />
                    <Text style={styles.ligneProduitNom} numberOfLines={1}>{p.produitNom}</Text>
                    <Text style={[styles.ligneProduitPrix, p.statut === "depassement" && { color: ROUGE }]}>
                      {p.prix.toLocaleString("fr-FR")} F/{LABELS_UNITE[p.unite] ?? p.unite}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.btnYAller}
                  onPress={() =>
                    ouvrirItineraire(commerce.nomLieu, commerce.commune, commerce.latitude, commerce.longitude)
                  }
                >
                  <Icone nom="navigate-outline" taille={16} couleur="#FFFFFF" />
                  <Text style={styles.btnYAllerTexte}>Y aller</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ── Prix officiels de la liste ────────────────── */}
        <Text style={[styles.sectionTitre, { marginTop: 18 }]}>Combien payer · {ville}</Text>
        {lignesListe.map(({ produit, reference }) => (
          <View key={produit.id} style={styles.ligneOfficiel}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ligneOfficielNom} numberOfLines={1}>{produit.nom}</Text>
              {reference?.prixMin != null &&
                reference.prixMax != null &&
                reference.prixMin !== reference.prixMax && (
                  <Text style={styles.ligneOfficielSub}>
                    de {reference.prixMin.toLocaleString("fr-FR")} à {reference.prixMax.toLocaleString("fr-FR")} F
                  </Text>
                )}
            </View>
            {reference ? (
              <Text style={styles.ligneOfficielPrix}>
                {reference.prix.toLocaleString("fr-FR")} F
                <Text style={styles.ligneOfficielUnite}> /{LABELS_UNITE[reference.unite] ?? reference.unite}</Text>
              </Text>
            ) : (
              <Text style={styles.ligneOfficielAbsent}>Pas de prix officiel</Text>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.btnPartage} onPress={() => partager(messagePartage)}>
          <Icone nom="logo-whatsapp" taille={18} couleur={VERT} />
          <Text style={styles.btnPartageTexte}>Envoyer ma liste sur WhatsApp</Text>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Text style={styles.noteTexte}>
            Les prix officiels sont des prix moyens publiés par l'État, donnés à titre indicatif. Les commerces sont classés d'après les prix constatés par au moins 3 citoyens.
            {position ? "" : " Autorise la localisation pour voir les commerces les plus proches en premier."}
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },
  header: { backgroundColor: VERT, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  back: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 8 },
  titre: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  sousTitre: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 },
  rechercheRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  rechercheInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: "#1A1A1A" },
  groupe: {
    fontSize: 12,
    fontWeight: "700",
    color: VERT,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  produit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  produitCoche: { backgroundColor: "#E8F5EE" },
  produitNom: { fontSize: 15, color: "#1A1A1A", flex: 1 },
  barreBas: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    paddingBottom: 26,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EDE9",
  },
  vider: { paddingHorizontal: 12, paddingVertical: 12 },
  viderTexte: { color: "#888888", fontSize: 14, fontWeight: "600" },
  btnPlein: { backgroundColor: VERT, borderRadius: 14, padding: 15, alignItems: "center" },
  btnPleinTexte: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  content: { padding: 14 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 6 },
  sectionTitre: { fontSize: 15, fontWeight: "800", color: "#1A1A1A", marginBottom: 10 },
  lienCarte: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  lienCarteTexte: { color: VERT, fontSize: 13, fontWeight: "700" },
  videBox: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 20, alignItems: "center", gap: 8 },
  videTitre: { fontSize: 15, fontWeight: "700", color: "#333333", textAlign: "center" },
  videTexte: { fontSize: 13, color: "#777777", textAlign: "center", lineHeight: 19 },
  btnContour: { borderWidth: 1.5, borderColor: VERT, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 9, marginTop: 4 },
  btnContourTexte: { color: VERT, fontWeight: "700", fontSize: 14 },
  carte: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  carteMeilleure: { borderColor: VERT },
  badgeMeilleur: {
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
  badgeMeilleurTexte: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  carteTete: { flexDirection: "row", alignItems: "center", gap: 10 },
  carteNom: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  carteSub: { fontSize: 12, color: "#888888", marginTop: 1 },
  resume: { fontSize: 13, fontWeight: "700", marginTop: 10, marginBottom: 6 },
  ligneProduit: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  ligneProduitNom: { flex: 1, fontSize: 13, color: "#333333" },
  ligneProduitPrix: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  btnYAller: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: VERT,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 10,
  },
  btnYAllerTexte: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  ligneOfficiel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 5,
  },
  ligneOfficielNom: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  ligneOfficielSub: { fontSize: 11, color: "#888888", marginTop: 2 },
  ligneOfficielPrix: { fontSize: 16, fontWeight: "800", color: VERT },
  ligneOfficielUnite: { fontSize: 12, color: "#888888", fontWeight: "400" },
  ligneOfficielAbsent: { fontSize: 12, color: "#AAAAAA" },
  btnPartage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#DDE5DF",
    marginTop: 8,
  },
  btnPartageTexte: { fontSize: 14, fontWeight: "700", color: VERT },
  noteBox: { backgroundColor: "#EEF1EE", borderRadius: 10, padding: 12, marginTop: 12 },
  noteTexte: { fontSize: 12, color: "#666666", lineHeight: 17 },
});
