import { Unite } from "./types";

// ============================================================
// PRIX OFFICIELS EMBARQUÉS DANS L'APPLICATION
// Source : bulletin hebdomadaire « C'est combien ? — Les coûts moyens du marché »
// (OCPV, CNLVC, ministère du Commerce et de l'Industrie).
//
// Ce sont des PRIX MOYENS INDICATIFS, pas des prix plafonnés par arrêté.
// Ils servent de point de départ : dès que le téléphone a du réseau,
// la table Supabase « prix_reference » prend le relais et peut être mise
// à jour chaque semaine sans republier l'application.
//
// Saisie à partir des captures du bulletin : à relire avant publication.
// ============================================================

export const VILLES_REFERENCE = [
  "Abidjan",
  "San-Pédro",
  "Bouaké",
  "Yamoussoukro",
  "Man",
  "Korhogo",
] as const;

export type VilleReference = (typeof VILLES_REFERENCE)[number];

export const BULLETIN_EMBARQUE = {
  type: "moyen" as const,
  source: "C'est combien ? (OCPV · CNLVC · ministère du Commerce)",
  dateDebut: "2026-09-28",
  dateFin: "2026-10-05",
};

export const PRIX_OFFICIELS_EMBARQUES: {
  produitId: string;
  unite: Unite;
  prix: Partial<Record<VilleReference, number>>;
}[] = [
  { produitId: "patate-douce", unite: "kg", prix: { "Abidjan": 700, "San-Pédro": 800, "Bouaké": 500, "Yamoussoukro": 800, "Man": 500, "Korhogo": 500 } },
  { produitId: "banane-plantain", unite: "kg", prix: { "Abidjan": 450, "San-Pédro": 1000, "Bouaké": 600, "Yamoussoukro": 1000, "Man": 1000, "Korhogo": 1000 } },
  { produitId: "igname-kponan", unite: "kg", prix: { "Abidjan": 600, "San-Pédro": 800, "Bouaké": 700, "Yamoussoukro": 700, "Man": 600, "Korhogo": 600 } },
  { produitId: "igname-assawa", unite: "kg", prix: { "San-Pédro": 800, "Bouaké": 600, "Yamoussoukro": 600, "Korhogo": 400 } },
  { produitId: "pate-placali", unite: "kg", prix: { "San-Pédro": 1000, "Yamoussoukro": 500, "Man": 600, "Korhogo": 1000 } },
  { produitId: "oignon-violet-galmi", unite: "kg", prix: { "Abidjan": 600, "San-Pédro": 600, "Bouaké": 700, "Yamoussoukro": 700, "Man": 800, "Korhogo": 700 } },
  { produitId: "oignon-blanc", unite: "kg", prix: { "Abidjan": 750, "San-Pédro": 700, "Bouaké": 600, "Yamoussoukro": 600, "Man": 600, "Korhogo": 700 } },
  { produitId: "graine-de-palme", unite: "kg", prix: { "Abidjan": 350, "San-Pédro": 600, "Bouaké": 300, "Yamoussoukro": 500, "Man": 400, "Korhogo": 400 } },
  { produitId: "chou", unite: "kg", prix: { "Abidjan": 700, "San-Pédro": 600, "Bouaké": 650, "Yamoussoukro": 600, "Man": 500, "Korhogo": 1000 } },
  { produitId: "tomate-salade", unite: "kg", prix: { "Abidjan": 650, "San-Pédro": 700, "Bouaké": 800, "Yamoussoukro": 800, "Man": 1000, "Korhogo": 800 } },
  { produitId: "concombre", unite: "kg", prix: { "Abidjan": 600, "San-Pédro": 600, "Bouaké": 500, "Yamoussoukro": 400, "Man": 500, "Korhogo": 500 } },
  { produitId: "courgette", unite: "kg", prix: { "Abidjan": 600, "San-Pédro": 600, "Bouaké": 400, "Yamoussoukro": 600, "Man": 600, "Korhogo": 600 } },
  { produitId: "navet", unite: "kg", prix: { "Abidjan": 700, "San-Pédro": 1500, "Bouaké": 1500, "Yamoussoukro": 600, "Man": 500, "Korhogo": 600 } },
  { produitId: "manioc", unite: "kg", prix: { "Abidjan": 500, "San-Pédro": 350, "Bouaké": 300, "Yamoussoukro": 300, "Man": 300, "Korhogo": 500 } },
  { produitId: "haricot-vert", unite: "kg", prix: { "Abidjan": 1500, "San-Pédro": 1000, "Bouaké": 1000, "Yamoussoukro": 1000, "Man": 1500, "Korhogo": 1000 } },
  { produitId: "gombo-frais", unite: "kg", prix: { "Abidjan": 700, "San-Pédro": 700, "Bouaké": 800, "Yamoussoukro": 500, "Man": 500, "Korhogo": 500 } },
  { produitId: "aubergine-ndrowa", unite: "kg", prix: { "Abidjan": 700, "San-Pédro": 500, "Bouaké": 600, "Yamoussoukro": 1000, "Man": 600, "Korhogo": 700 } },
  { produitId: "piment-frais", unite: "kg", prix: { "Abidjan": 700, "San-Pédro": 800, "Bouaké": 800, "Yamoussoukro": 1500, "Man": 1500, "Korhogo": 800 } },
  { produitId: "poivron", unite: "kg", prix: { "Abidjan": 800, "San-Pédro": 1000, "Bouaké": 1300, "Yamoussoukro": 1500, "Man": 1500, "Korhogo": 1000 } },
  { produitId: "carotte", unite: "kg", prix: { "Abidjan": 1300, "San-Pédro": 1200, "Bouaké": 1300, "Yamoussoukro": 1200, "Man": 1000, "Korhogo": 1000 } },
  { produitId: "pomme-de-terre", unite: "kg", prix: { "Abidjan": 700, "San-Pédro": 700, "Bouaké": 600, "Yamoussoukro": 700, "Man": 700, "Korhogo": 700 } },
  { produitId: "huile-rouge", unite: "litre", prix: { "Abidjan": 1900, "San-Pédro": 1000, "Bouaké": 1300, "Yamoussoukro": 1200, "Man": 1200, "Korhogo": 1200 } },
  { produitId: "boeuf-sans-os", unite: "kg", prix: { "Abidjan": 4300, "San-Pédro": 6000, "Yamoussoukro": 3000, "Man": 3000, "Korhogo": 3000 } },
  { produitId: "boeuf-avec-os", unite: "kg", prix: { "Abidjan": 3800, "San-Pédro": 4000, "Yamoussoukro": 2800, "Man": 2800, "Korhogo": 2600 } },
  { produitId: "dinde", unite: "kg", prix: { "Abidjan": 5000, "San-Pédro": 9000, "Yamoussoukro": 3000, "Man": 7000 } },
  { produitId: "lapin", unite: "kg", prix: { "Abidjan": 5000, "San-Pédro": 7500 } },
  { produitId: "pintade", unite: "kg", prix: { "Abidjan": 6000, "San-Pédro": 7000, "Yamoussoukro": 8000, "Man": 8000, "Korhogo": 6000 } },
  { produitId: "poulet-chair", unite: "kg", prix: { "Abidjan": 3200, "San-Pédro": 3500, "Bouaké": 2200, "Yamoussoukro": 3000, "Man": 2500, "Korhogo": 2500 } },
  { produitId: "pattes-poulet", unite: "kg", prix: { "Abidjan": 1200, "San-Pédro": 2000, "Yamoussoukro": 2500, "Man": 2500 } },
  { produitId: "poule-pondeuse", unite: "kg", prix: { "Abidjan": 2700, "San-Pédro": 1500, "Korhogo": 3500 } },
  { produitId: "sosso-importe", unite: "kg", prix: { "Abidjan": 2500, "San-Pédro": 2000, "Yamoussoukro": 2500, "Korhogo": 2000 } },
  { produitId: "chinchard", unite: "kg", prix: { "Abidjan": 1500, "San-Pédro": 2000, "Yamoussoukro": 2000, "Korhogo": 1600 } },
  { produitId: "carpe-importe", unite: "kg", prix: { "Abidjan": 1600, "San-Pédro": 2000, "Yamoussoukro": 2500, "Korhogo": 2600 } },
  { produitId: "carpe-aquaculture", unite: "kg", prix: { "Abidjan": 3500, "San-Pédro": 1500, "Yamoussoukro": 2000, "Korhogo": 2000 } },
  { produitId: "thon", unite: "kg", prix: { "Abidjan": 850, "San-Pédro": 2000, "Yamoussoukro": 2000 } },
  { produitId: "maquereau", unite: "kg", prix: { "Abidjan": 1500, "San-Pédro": 1000, "Yamoussoukro": 2000, "Korhogo": 1500 } },
  { produitId: "machoiron", unite: "kg", prix: { "Abidjan": 1750, "San-Pédro": 1500, "Yamoussoukro": 2000, "Korhogo": 2000 } },
  { produitId: "mouton", unite: "kg", prix: { "Abidjan": 4500, "San-Pédro": 4000, "Yamoussoukro": 4000, "Korhogo": 5000 } },
  { produitId: "kplo", unite: "unité", prix: { "Abidjan": 500, "San-Pédro": 1000, "Bouaké": 500, "Yamoussoukro": 500, "Korhogo": 1000 } },
  { produitId: "porc", unite: "kg", prix: { "Abidjan": 2000, "San-Pédro": 2500, "Yamoussoukro": 2200, "Man": 1800, "Korhogo": 2500 } },
  { produitId: "cotes-porc", unite: "kg", prix: { "Abidjan": 1100, "San-Pédro": 2000, "Yamoussoukro": 1800, "Man": 1800, "Korhogo": 2500 } },
  { produitId: "pattes-porc", unite: "kg", prix: { "Abidjan": 1300, "San-Pédro": 2000, "Yamoussoukro": 1200, "Man": 1800, "Korhogo": 2500 } },
  { produitId: "pattes-boeuf", unite: "kg", prix: { "Abidjan": 1500, "San-Pédro": 2500, "Yamoussoukro": 2500, "Man": 2600, "Korhogo": 3000 } },
  { produitId: "ananas", unite: "kg", prix: { "Abidjan": 400, "San-Pédro": 1000, "Bouaké": 800, "Yamoussoukro": 800, "Man": 500, "Korhogo": 600 } },
  { produitId: "citron", unite: "kg", prix: { "Abidjan": 350, "San-Pédro": 800, "Bouaké": 875, "Yamoussoukro": 800, "Man": 1000, "Korhogo": 1000 } },
  { produitId: "avocat", unite: "kg", prix: { "Abidjan": 500, "San-Pédro": 1500, "Bouaké": 400, "Yamoussoukro": 800, "Man": 800, "Korhogo": 1500 } },
  { produitId: "noix-coco", unite: "unité", prix: { "Abidjan": 200, "San-Pédro": 1000, "Bouaké": 200, "Yamoussoukro": 300, "Man": 300, "Korhogo": 600 } },
  { produitId: "banane-dessert", unite: "kg", prix: { "Abidjan": 500, "San-Pédro": 1000, "Bouaké": 500, "Yamoussoukro": 600, "Man": 400, "Korhogo": 500 } },
  { produitId: "papaye", unite: "kg", prix: { "Abidjan": 500, "San-Pédro": 600, "Bouaké": 300, "Yamoussoukro": 500, "Man": 500, "Korhogo": 1000 } },
  { produitId: "orange", unite: "kg", prix: { "Abidjan": 400, "San-Pédro": 400, "Bouaké": 200, "Yamoussoukro": 300, "Man": 500, "Korhogo": 300 } },
  { produitId: "pasteque", unite: "kg", prix: { "San-Pédro": 2000, "Bouaké": 800, "Yamoussoukro": 800, "Man": 1000, "Korhogo": 1000 } },
  { produitId: "riz-wita9", unite: "kg", prix: { "Abidjan": 500, "Bouaké": 500, "Yamoussoukro": 700, "Man": 500, "Korhogo": 400 } },
  { produitId: "riz-danane", unite: "kg", prix: { "Abidjan": 700, "San-Pédro": 600, "Bouaké": 600, "Yamoussoukro": 650, "Man": 550, "Korhogo": 400 } },
  { produitId: "farine-soja", unite: "kg", prix: { "Abidjan": 800, "San-Pédro": 2000, "Korhogo": 1250 } },
  { produitId: "farine-mais", unite: "kg", prix: { "Abidjan": 500, "San-Pédro": 2000, "Yamoussoukro": 600, "Korhogo": 1300 } },
  { produitId: "farine-sorgho", unite: "kg", prix: { "Abidjan": 650, "Yamoussoukro": 600, "Korhogo": 1300 } },
  { produitId: "farine-mais-kabato", unite: "kg", prix: { "Abidjan": 600, "San-Pédro": 300, "Yamoussoukro": 600, "Korhogo": 650 } },
  { produitId: "farine-mil", unite: "kg", prix: { "Abidjan": 500, "Yamoussoukro": 1000, "Korhogo": 1500 } },
  { produitId: "farine-cajou", unite: "kg", prix: { "Abidjan": 5000, "San-Pédro": 2000, "Yamoussoukro": 1000 } },
  { produitId: "farine-manioc", unite: "kg", prix: { "San-Pédro": 2000, "Korhogo": 350 } },
  { produitId: "pate-pistache", unite: "kg", prix: { "San-Pédro": 3000, "Yamoussoukro": 1500, "Korhogo": 2000 } },
  { produitId: "pate-arachide", unite: "kg", prix: { "San-Pédro": 2000, "Bouaké": 900, "Yamoussoukro": 1000, "Korhogo": 1500 } },
  { produitId: "sesame", unite: "kg", prix: { "San-Pédro": 1000 } },
  { produitId: "niebe", unite: "kg", prix: { "San-Pédro": 900 } },
  { produitId: "fonio-precuit", unite: "kg", prix: { "San-Pédro": 600, "Bouaké": 1200, "Korhogo": 2000 } },
  { produitId: "sucre-roux", unite: "kg", prix: { "San-Pédro": 900, "Bouaké": 900, "Yamoussoukro": 900, "Man": 900, "Korhogo": 900 } },
  { produitId: "sucre-blanc", unite: "kg", prix: { "San-Pédro": 1000, "Bouaké": 900, "Yamoussoukro": 1000, "Man": 1000, "Korhogo": 900 } },
  { produitId: "lait-liquide", unite: "litre", prix: { "San-Pédro": 1500, "Yamoussoukro": 1200, "Korhogo": 600 } },
  { produitId: "gingembre", unite: "kg", prix: { "Abidjan": 3000, "San-Pédro": 3500, "Bouaké": 3500, "Yamoussoukro": 3500, "Man": 3000, "Korhogo": 3500 } },
  { produitId: "bissap", unite: "kg", prix: { "Abidjan": 1500, "San-Pédro": 600, "Yamoussoukro": 1800, "Man": 1500, "Korhogo": 1500 } },
  { produitId: "tomi", unite: "kg", prix: { "Abidjan": 1500, "San-Pédro": 1000, "Bouaké": 1200, "Yamoussoukro": 1500, "Korhogo": 2000 } },
];
