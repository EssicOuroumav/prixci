import { Platform, StatusBar } from "react-native";

/**
 * Marge haute des en-têtes : sous la barre d'état.
 * Android donne la hauteur exacte ; sur iPhone on réserve la place de l'encoche.
 */
export const HAUT_ECRAN =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 14 : 56;
