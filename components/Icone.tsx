import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NomIcone } from "@/constants/types";

// Toutes les icônes de l'application passent par ce composant :
// un seul jeu d'icônes (Ionicons), pas d'emoji.
export default function Icone({
  nom,
  taille = 16,
  couleur = "#1A1A1A",
}: {
  nom: NomIcone;
  taille?: number;
  couleur?: string;
}) {
  return <Ionicons name={nom} size={taille} color={couleur} />;
}
