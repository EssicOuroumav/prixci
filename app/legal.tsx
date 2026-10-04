import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SEUIL_CONFIRMATIONS } from "@/services/scoring";

// ============================================================
// CONDITIONS D'UTILISATION ET CONFIDENTIALITÉ
// Texte de travail : à faire relire par un juriste avant publication.
// ============================================================

const SECTIONS: { titre: string; texte: string }[] = [
  {
    titre: "1. À quoi sert PrixCI",
    texte:
      "PrixCI permet aux habitants d'Abidjan de signaler et de consulter les prix des denrées alimentaires et des transports. Les prix affichés sont déclarés par des citoyens ou publiés par des enseignes. Ils sont donnés à titre indicatif et ne constituent ni une offre commerciale ni un prix garanti.",
  },
  {
    titre: "2. Ce que tu t'engages à faire",
    texte:
      "Signaler uniquement des prix que tu as réellement constatés, au lieu et à la date indiqués. Ne publier aucun propos injurieux, diffamatoire ou sans rapport avec un prix. Ne pas chercher à fausser les prix ou les votes, par exemple avec plusieurs comptes.",
  },
  {
    titre: "3. Comment un prix devient public",
    texte:
      `Un signalement entre dans les moyennes et les comparaisons après ${SEUIL_CONFIRMATIONS} confirmations d'autres utilisateurs. Un signalement trop contesté est masqué. Tu peux signaler un contenu abusif depuis sa fiche ; l'équipe peut retirer tout contenu contraire à ces conditions.`,
  },
  {
    titre: "4. Enseignes",
    texte:
      "La personne qui inscrit une enseigne déclare avoir le droit de la représenter. Elle est seule responsable des prix officiels qu'elle publie et s'engage à les tenir à jour. Une enseigne inscrite de façon abusive peut être suspendue.",
  },
  {
    titre: "5. Données collectées",
    texte:
      "PrixCI ne demande ni nom, ni numéro de téléphone, ni adresse e-mail pour signaler un prix. Un identifiant anonyme et un pseudonyme sont créés automatiquement. Sont enregistrés : tes signalements (produit, prix, commune, lieu, date), tes votes et ton score de confiance. Pour une enseigne : les informations que tu saisis (nom, adresse, téléphone), qui sont publiques.",
  },
  {
    titre: "6. Position géographique",
    texte:
      "Si tu l'autorises, ta position approximative au moment d'un signalement est jointe à celui-ci pour situer le prix. Elle n'est jamais suivie en continu. Tu peux refuser : l'application fonctionne sans.",
  },
  {
    titre: "7. Conservation et suppression",
    texte:
      "Les données sont stockées sur ton téléphone et sur les serveurs de notre hébergeur. Les signalements étant anonymes, ils restent utilisés pour les statistiques de prix. Pour demander la suppression de ton compte anonyme ou d'une enseigne, écris à l'adresse de contact ci-dessous.",
  },
  {
    titre: "8. Contact",
    texte: "Pour toute question ou réclamation : contact à compléter avant publication.",
  },
];

export default function LegalScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Conditions et confidentialité</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((s) => (
          <View key={s.titre} style={styles.section}>
            <Text style={styles.sectionTitre}>{s.titre}</Text>
            <Text style={styles.sectionTexte}>{s.texte}</Text>
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const VERT = "#0A5F38";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },
  header: { backgroundColor: VERT, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  back: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  content: { padding: 16, gap: 10 },
  section: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, gap: 6 },
  sectionTitre: { fontSize: 14, fontWeight: "800", color: "#1A1A1A" },
  sectionTexte: { fontSize: 13, color: "#444444", lineHeight: 19 },
});
