# PrixCI — Contexte

## Stack technique
- React Native + Expo SDK 57, expo-router (routes par fichiers), TypeScript
- Supabase : auth anonyme, Postgres, droits d'accès par ligne
- expo-sqlite : stockage local, source de l'affichage (hors ligne d'abord)
- Zustand : état global

## Structure
```
app/
  _layout.tsx            initialisation (base locale, compte, synchro) + onboarding
  (tabs)/index.tsx       Accueil : prix vérifiés de la commune
  (tabs)/explorer.tsx    Liste des produits puis comparaison d'un produit
  (tabs)/enseignes.tsx   Enseignes de la commune
  (tabs)/signaler.tsx    Formulaire en 3 étapes
  (tabs)/profil.tsx      Score, mes signalements, mes enseignes
  detail/[id].tsx        Détail d'un signalement, graphique, votes
  commerce.tsx           Fiche d'un commerce : ses prix vérifiés comparés aux prix officiels
  enseigne/[id].tsx      Fiche d'une enseigne ; gestion des prix par son propriétaire
  enseigne/inscription.tsx
  legal.tsx              Conditions d'utilisation et confidentialité
services/
  auth.ts                client Supabase, compte anonyme
  db.ts                  SQLite : tables, requêtes, agrégats
  sync.ts                envoi et récupération ; syncAvecStore() est le point d'entrée
  scoring.ts             règle de concordance, fiabilité, badges
  reference.ts           prix officiels de l'État et comparaison
  commerces.ts           classement des commerces
  partage.ts             partage WhatsApp et itinéraire
  enseignes.ts           enseignes et prix officiels (serveur uniquement)
  abus.ts                signalement de contenus abusifs
components/
  Icone.tsx              toutes les icônes (Ionicons) ; aucun emoji dans l'interface
  SelecteurCategorie.tsx choix Alimentation / Transport, partagé entre les onglets
constants/               types et catalogue des produits
tests/                   test des scripts SQL dans un Postgres embarqué
```

## But du produit
PrixCI conduit les citoyens vers les commerces qui vendent au prix fixé ou publié par l'État. Le signalement n'est qu'un moyen : il sert à classer les commerces. Priorités : denrées alimentaires, puis transport, puis logement (plus tard).

## Règles métier
- **Prix officiels** (`services/reference.ts`) : deux natures à ne jamais confondre. « plafond » = maximum fixé par arrêté, obligatoire. « moyen » = prix moyen indicatif, par ville, issu de deux publications hebdomadaires : le bulletin « C'est combien ? » (6 villes, `constants/prixOfficiels.ts`) et le relevé OCPV (24 régions, avec prix mini et maxi, `constants/prixOfficielsOcpv.ts`). Pour un même produit dans une même ville, la publication la plus récente l'emporte. Les deux sont embarquées dans l'application ; la table Supabase `prix_reference` prend le relais et se met à jour sans republier.
- **Prix vérifié** (`services/scoring.ts`, vue `signalements_v` dans `services/db.ts`) : au moins 3 citoyens différents l'ont constaté au même endroit (auteur + confirmations + signalements concordants à ±10 %, une contestation retire un appui).
- **Classement d'un commerce** (`services/commerces.ts`) : sur ses prix vérifiés uniquement. « Au prix officiel » si aucun ne dépasse le prix officiel (tolérance 5 % pour un prix moyen, ou le prix maxi relevé par l'OCPV quand il est connu ; aucune tolérance pour un plafond) ; un seul dépassement retire ce statut.
- Un commerce = type de lieu + nom, dans une zone. Le nom est obligatoire pour l'alimentation ; l'application propose les noms déjà saisis pour éviter les variantes.
- **Zones** : communes du Grand Abidjan (13) et 23 villes de l'intérieur (liste `VILLES` dans `constants/types.ts`). La zone est stockée dans la colonne `commune`.
- Alimentation et transport ne sont jamais mélangés (`categorieActive` dans le store). Pour le transport, le tarif dépend du moment du trajet (normal, pointe, nuit, pluie).
- L'application démarre sans donnée de démonstration ; les prix officiels sont visibles dès l'ouverture.
- Anti-abus côté serveur : 30 signalements et 60 votes par compte et par 24 h, un seul signalement du même produit au même endroit par demi-journée, scores calculés par le serveur.
- Score utilisateur : départ 50, +3 par confirmation reçue, −5 par contestation reçue, +1 par vote donné.
- Une enseigne appartient au compte qui l'a inscrite ; lui seul modifie ses prix officiels d'enseigne.

## Supabase
- Adresse et clé publique dans `.env` (voir `.env.example`). Le fichier `.env` n'est pas versionné.
- Scripts à exécuter dans l'ordre : `supabase_schema.sql`, `supabase_migration_sprint3.sql`, `supabase_migration_v2.sql`, `supabase_migration_v3.sql`, `supabase_migration_v4.sql`.
- Activer Authentication > Sign In / Providers > Anonymous.

## Commandes
- `npx expo start` : lancer l'application
- `npm test` : typage + test des scripts SQL
