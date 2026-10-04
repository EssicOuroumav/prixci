import { Linking, Share } from "react-native";

// ============================================================
// PARTAGE — WhatsApp d'abord, feuille de partage du téléphone sinon
// ============================================================

const SIGNATURE = "\n\nVu sur PrixCI — les commerces au prix officiel.";

export async function partager(message: string): Promise<void> {
  const texte = message + SIGNATURE;
  const whatsapp = `whatsapp://send?text=${encodeURIComponent(texte)}`;
  try {
    // Ouvre WhatsApp s'il est installé ; échoue sinon
    await Linking.openURL(whatsapp);
  } catch {
    try {
      await Share.share({ message: texte });
    } catch {
      // Partage annulé : rien à faire
    }
  }
}

/** Ouvre l'application de cartes du téléphone sur un commerce. */
export async function ouvrirItineraire(
  nom: string,
  commune: string,
  latitude: number | null,
  longitude: number | null
): Promise<void> {
  const recherche = encodeURIComponent(`${nom}, ${commune}, Côte d'Ivoire`);
  const url =
    latitude !== null && longitude !== null
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${recherche}`;
  await Linking.openURL(url);
}
