import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icone from "@/components/Icone";

// ============================================================
// ONBOARDING — 3 SLIDES
// ============================================================

const { width: SW, height: SH } = Dimensions.get("window");

const VERT       = "#0A5F38";
const VERT_FONCE = "#073D24";
const OR         = "#F5A623";
const CREME      = "#FFF8F0";

interface Slide {
  id: number;
  bg: string;
  accentColor: string;
  illustration: React.ReactNode;
  tag: string;
  titre: string;
  sousTitre: string;
  detail: string;
}

// ─── Illustrations SVG-like en pure React Native ──────────

function IllustrationComparaison() {
  return (
    <View style={illu.container}>
      {/* Deux colonnes de prix côte à côte */}
      <View style={illu.row}>
        {/* Marché */}
        <View style={[illu.colonne, { backgroundColor: "#E8F5EE" }]}>
          <Icone nom="storefront-outline" taille={28} couleur="#0A5F38" />
          <Text style={illu.colLabel}>Marché</Text>
          <View style={[illu.prixBox, { backgroundColor: VERT }]}>
            <Text style={illu.prixBas}>300 F</Text>
          </View>
          <View style={illu.barreContainer}>
            <View style={[illu.barre, { height: 40, backgroundColor: VERT }]} />
          </View>
          <Text style={[illu.badge, { backgroundColor: VERT, color: "#FFF" }]}>
            Moins cher
          </Text>
        </View>

        {/* VS */}
        <View style={illu.vsContainer}>
          <Text style={illu.vs}>VS</Text>
        </View>

        {/* Supermarché */}
        <View style={[illu.colonne, { backgroundColor: "#FFF3CD" }]}>
          <Icone nom="cart-outline" taille={28} couleur="#C0392B" />
          <Text style={illu.colLabel}>Supermarché</Text>
          <View style={[illu.prixBox, { backgroundColor: "#D4820A" }]}>
            <Text style={illu.prixBas}>1 000 F</Text>
          </View>
          <View style={illu.barreContainer}>
            <View style={[illu.barre, { height: 120, backgroundColor: "#D4820A" }]} />
          </View>
          <Text style={[illu.badge, { backgroundColor: "#D4820A", color: "#FFF" }]}>
            +233%
          </Text>
        </View>
      </View>

      {/* Produit */}
      <View style={illu.produitTag}>
        <Text style={illu.produitTexte}>Tomate · Yopougon</Text>
      </View>

      {/* Flèche économie */}
      <View style={illu.economieBadge}>
        <Text style={illu.economieTexte}>Économise 700 FCFA</Text>
      </View>
    </View>
  );
}

function IllustrationSignalement() {
  return (
    <View style={illu.container}>
      {/* Faux formulaire de signalement */}
      <View style={illu.formCard}>
        <View style={illu.formHeader}>
          <Text style={illu.formTitle}>Nouveau signalement</Text>
        </View>

        <View style={illu.formField}>
          <Text style={illu.formFieldLabel}>Produit</Text>
          <View style={illu.formFieldValue}>
            <Text style={illu.formFieldText}>Viande de bœuf sans os</Text>
          </View>
        </View>

        <View style={illu.formField}>
          <Text style={illu.formFieldLabel}>Prix observé</Text>
          <View style={[illu.formFieldValue, { borderColor: VERT, borderWidth: 2 }]}>
            <Text style={[illu.formFieldText, { fontWeight: "800", color: VERT, fontSize: 20 }]}>
              4 500 FCFA/kg
            </Text>
          </View>
        </View>

        <View style={illu.formField}>
          <Text style={illu.formFieldLabel}>Lieu</Text>
          <View style={illu.lieuRow}>
            <View style={[illu.lieuChip, { backgroundColor: "#E8F5EE", borderColor: VERT }]}>
              <Text style={{ fontSize: 12 }}>Marché</Text>
            </View>
            <View style={illu.lieuChip}>
              <Text style={{ fontSize: 12 }}>Supermarché</Text>
            </View>
          </View>
        </View>

        <View style={[illu.submitBtn, { backgroundColor: VERT }]}>
          <Text style={illu.submitText}>Signaler cet abus</Text>
        </View>
      </View>

      {/* Bulle notification */}
      <View style={illu.notifBulle}>
        <Text style={illu.notifTexte}>
          Prix 3× supérieur au marché détecté !
        </Text>
      </View>
    </View>
  );
}

function IllustrationCommunaute() {
  const avis = [
    { pseudo: "VigilantBaobab12", vote: "confirme", commentaire: "Confirmé ! Vu ce matin au marché Adjamé.", couleur: VERT },
    { pseudo: "CitoyenNimba47",   vote: "conteste",  commentaire: "Pas vu ce prix ici, c'est moins cher.", couleur: "#C0392B" },
    { pseudo: "LibreComoé88",     vote: "confirme", commentaire: "Prix validé, même observation hier.", couleur: VERT },
  ];

  return (
    <View style={illu.container}>
      {/* Score communautaire */}
      <View style={illu.scoreGlobal}>
        <Text style={illu.scoreGlobalLabel}>Fiabilité communautaire</Text>
        <View style={illu.scoreBarContainer}>
          <View style={[illu.scoreBarre, { width: "78%" }]} />
        </View>
        <Text style={illu.scoreGlobalValeur}>78 / 100 · Fiable</Text>
      </View>

      {/* Votes */}
      {avis.map((a, i) => (
        <View key={i} style={illu.avisCard}>
          <View style={[illu.voteIndicateur, { backgroundColor: a.couleur }]}>
            <Icone nom={a.vote === "confirme" ? "checkmark" : "close"} taille={16} couleur="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={illu.avisPseudo}>{a.pseudo}</Text>
            <Text style={illu.avisCommentaire} numberOfLines={1}>{a.commentaire}</Text>
          </View>
        </View>
      ))}

      <View style={illu.solidariteBadge}>
        <Text style={illu.solidariteTexte}>
          3 citoyens ont validé ce prix
        </Text>
      </View>
    </View>
  );
}

const illu = StyleSheet.create({
  container: { width: "100%", alignItems: "center", gap: 10 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  colonne: {
    width: 110,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  icone: { fontSize: 28 },
  colLabel: { fontSize: 11, color: "#444", fontWeight: "600" },
  prixBox: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: "100%",
    alignItems: "center",
  },
  prixBas: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  barreContainer: { justifyContent: "flex-end", height: 120 },
  barre: { width: 28, borderRadius: 4 },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    textAlign: "center",
  },
  vsContainer: { paddingBottom: 40, alignItems: "center" },
  vs: { fontSize: 16, fontWeight: "900", color: "#888888" },
  produitTag: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  produitTexte: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  economieBadge: {
    backgroundColor: "#FFF3CD",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#D4820A",
  },
  economieTexte: { fontSize: 13, fontWeight: "700", color: "#D4820A" },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    width: "100%",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formHeader: { borderBottomWidth: 1, borderBottomColor: "#F0F0F0", paddingBottom: 8 },
  formTitle: { fontSize: 14, fontWeight: "800", color: "#1A1A1A" },
  formField: { gap: 4 },
  formFieldLabel: { fontSize: 10, color: "#888888", fontWeight: "600", textTransform: "uppercase" },
  formFieldValue: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  formFieldText: { fontSize: 13, color: "#1A1A1A" },
  lieuRow: { flexDirection: "row", gap: 6 },
  lieuChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  submitBtn: {
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  notifBulle: {
    backgroundColor: "#FDECEA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#C0392B",
  },
  notifTexte: { fontSize: 12, color: "#C0392B", fontWeight: "600" },
  scoreGlobal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    gap: 6,
  },
  scoreGlobalLabel: { fontSize: 11, color: "#888888", fontWeight: "600" },
  scoreBarContainer: {
    height: 8,
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBarre: { height: "100%", backgroundColor: VERT, borderRadius: 4 },
  scoreGlobalValeur: { fontSize: 13, fontWeight: "700", color: VERT },
  avisCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    gap: 10,
    width: "100%",
  },
  voteIndicateur: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  voteIcon: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  avisPseudo: { fontSize: 11, fontWeight: "700", color: "#1A1A1A" },
  avisCommentaire: { fontSize: 10, color: "#888888", marginTop: 1 },
  solidariteBadge: {
    backgroundColor: "#E8F5EE",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  solidariteTexte: { fontSize: 13, fontWeight: "700", color: VERT },
});

// ─── Données des slides ────────────────────────────────────

const SLIDES: Slide[] = [
  {
    id: 1,
    bg: "#073D24",
    accentColor: OR,
    illustration: <IllustrationComparaison />,
    tag: "Transparence des prix",
    titre: "Comparez les prix\nprès de chez vous",
    sousTitre: "Tomate à 300 FCFA au marché.\n1 000 FCFA au supermarché.\nChoisissez où acheter.",
    detail: "PrixCI agrège les signalements de citoyens pour afficher les prix réels dans chaque commune d'Abidjan.",
  },
  {
    id: 2,
    bg: "#1A1A2E",
    accentColor: "#FF6B6B",
    illustration: <IllustrationSignalement />,
    tag: "Signalement citoyen",
    titre: "Dénoncez les abus\nen 3 taps",
    sousTitre: "Un prix abusif ?\nSignalez-le en 30 secondes.\nAnonymement.",
    detail: "Vos signalements sont stockés sur votre téléphone et partagés avec la communauté dès que vous avez du réseau.",
  },
  {
    id: 3,
    bg: "#0A3D62",
    accentColor: "#5DADE2",
    illustration: <IllustrationCommunaute />,
    tag: "Intelligence collective",
    titre: "Ensemble,\nnous régulons les prix",
    sousTitre: "Confirmez ou contestez\nles prix des autres.\nPlusieurs yeux valent mieux qu'un.",
    detail: "Chaque validation améliore le score de fiabilité. Les prix faux sont automatiquement filtrés.",
  },
];

// ─── Composant principal Onboarding ───────────────────────
interface OnboardingProps {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [slideActuel, setSlideActuel] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const slide = SLIDES[slideActuel];
  const isLast = slideActuel === SLIDES.length - 1;

  // Animation du fond entre slides
  const bgAnim = useRef(new Animated.Value(0)).current;

  const allerAuSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SW, animated: true });
    setSlideActuel(index);

    Animated.timing(progressAnim, {
      toValue: (index + 1) / SLIDES.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SW);
    if (index !== slideActuel && index >= 0 && index < SLIDES.length) {
      setSlideActuel(index);
      Animated.timing(progressAnim, {
        toValue: (index + 1) / SLIDES.length,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const terminer = async () => {
    await AsyncStorage.setItem("prixci_onboarding_done", "1");
    onFinish();
  };

  return (
    <View style={ob.container}>
      {/* Fond dynamique */}
      <View style={[ob.background, { backgroundColor: slide.bg }]} />

      {/* Bouton passer */}
      <TouchableOpacity style={ob.skipBtn} onPress={terminer}>
        <Text style={ob.skipText}>Passer</Text>
      </TouchableOpacity>

      {/* Slides défilantes */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={ob.scrollView}
      >
        {SLIDES.map((s, i) => (
          <View key={s.id} style={[ob.slide, { width: SW }]}>
            {/* Illustration */}
            <View style={ob.illustrationZone}>
              {s.illustration}
            </View>

            {/* Contenu texte */}
            <View style={[ob.textZone, { backgroundColor: slide.bg === s.bg ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.25)" }]}>
              {/* Tag */}
              <View style={[ob.tag, { borderColor: s.accentColor }]}>
                <Text style={[ob.tagText, { color: s.accentColor }]}>{s.tag}</Text>
              </View>

              {/* Titre */}
              <Text style={ob.titre}>{s.titre}</Text>

              {/* Sous-titre */}
              <Text style={ob.sousTitre}>{s.sousTitre}</Text>

              {/* Détail */}
              <Text style={ob.detail}>{s.detail}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bas de page : points + bouton */}
      <View style={ob.footer}>
        {/* Points indicateurs */}
        <View style={ob.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => allerAuSlide(i)}>
              <Animated.View
                style={[
                  ob.dot,
                  i === slideActuel && ob.dotActive,
                  { backgroundColor: i === slideActuel ? slide.accentColor : "rgba(255,255,255,0.35)" },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton principal */}
        <TouchableOpacity
          style={[ob.btnPrincipal, { backgroundColor: slide.accentColor }]}
          onPress={() => {
            if (isLast) {
              terminer();
            } else {
              allerAuSlide(slideActuel + 1);
            }
          }}
        >
          <Text style={[ob.btnText, { color: isLast ? "#FFFFFF" : VERT_FONCE }]}>
            {isLast ? "Commencer à signaler →" : "Suivant →"}
          </Text>
        </TouchableOpacity>

        {/* Barre de progression */}
        <View style={ob.progressBar}>
          <Animated.View
            style={[
              ob.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: slide.accentColor,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const ob = StyleSheet.create({
  container: { flex: 1 },
  background: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  skipText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  scrollView: { flex: 1 },
  slide: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 20,
    gap: 20,
  },
  illustrationZone: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  textZone: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    marginBottom: 16,
    backdropFilter: "blur(10px)",
  },
  tag: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  titre: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  sousTitre: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 22,
    fontWeight: "500",
  },
  detail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 16,
    alignItems: "center",
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  btnPrincipal: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: { fontSize: 16, fontWeight: "800" },
  progressBar: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
});
