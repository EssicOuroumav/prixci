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
  enseigne/[id].tsx      Fiche d'une enseigne ; gestion des prix par son propriétaire
  enseigne/inscription.tsx
  legal.tsx              Conditions d'utilisation et confidentialité
services/
  auth.ts                client Supabase, compte anonyme
  db.ts                  SQLite : tables, requêtes, agrégats
  sync.ts                envoi et récupération ; syncAvecStore() est le point d'entrée
  scoring.ts             seuil de confirmations, règle de fiabilité, badges
  enseignes.ts           enseignes et prix officiels (serveur uniquement)
  abus.ts                signalement de contenus abusifs
  demoSeed.ts            données de démo, chargées en développement seulement
constants/               types et catalogue des produits
tests/                   test des scripts SQL dans un Postgres embarqué
```

## Règles métier
- Un signalement devient « vérifié » à 10 confirmations (`SEUIL_CONFIRMATIONS`). Seuls les vérifiés comptent dans les moyennes, comparaisons et graphiques ; les autres sont dans la file « À confirmer ».
- Fiabilité d'un signalement : 60 % du score de l'auteur au départ, +5 par confirmation, −8 par contestation ; masqué sous 30.
- Score utilisateur : départ 50, +3 par confirmation reçue, −5 par contestation reçue, +1 par vote donné.
- Les scores et compteurs sont calculés par le serveur ; l'application applique la même règle localement pour l'affichage immédiat.
- Une enseigne appartient au compte qui l'a inscrite ; lui seul modifie ses prix officiels.

## Supabase
- Adresse et clé publique dans `.env` (voir `.env.example`). Le fichier `.env` n'est pas versionné.
- Scripts à exécuter dans l'ordre : `supabase_schema.sql`, `supabase_migration_sprint3.sql`, `supabase_migration_v2.sql`.
- Activer Authentication > Sign In / Providers > Anonymous.

## Commandes
- `npx expo start` : lancer l'application
- `npm test` : typage + test des scripts SQL
