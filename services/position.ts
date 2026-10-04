import * as Location from "expo-location";
import { useAppStore } from "@/stores/useAppStore";

// ============================================================
// POSITION DE L'UTILISATEUR — sert uniquement à trier par distance.
// Jamais envoyée au serveur en dehors d'un signalement.
// ============================================================

export interface Position {
  latitude: number;
  longitude: number;
}

/**
 * Lit la position et la range dans le store.
 * `demander` : affiche la demande d'autorisation si elle n'a pas encore été faite.
 * Ne bloque jamais plus de 5 secondes et n'échoue jamais.
 */
export async function actualiserPosition(demander: boolean): Promise<Position | null> {
  try {
    const { status } = demander
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const connue = await Location.getLastKnownPositionAsync();
    const lue =
      connue ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]));
    if (!lue) return null;

    const position = { latitude: lue.coords.latitude, longitude: lue.coords.longitude };
    useAppStore.getState().setPosition(position);
    return position;
  } catch {
    return null;
  }
}

/** Distance à vol d'oiseau, en kilomètres. */
export function distanceKm(a: Position, b: Position): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function libelleDistance(km: number | null): string | null {
  if (km === null) return null;
  if (km < 1) return `à ${Math.max(50, Math.round(km * 20) * 50)} m`;
  return `à ${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
}
