# PrixCI — Roadmap

Mise à jour : 4 octobre 2026. Le détail des fonctionnalités est dans `CAHIER_DES_CHARGES.md`.

## Bugs corrigés dans le code
1. Onboarding après migration SDK 54 : rebranché dans `app/_layout.tsx`
2. Explorer : alimentation et transport séparés en deux sections
3. Détail : nom du produit et statut affichés en tête de fiche
4. « Voir l'historique » : erreur de navigation corrigée
5. Enseignes « permission denied » : tables et droits créés par `supabase_migration_v2.sql`
6. Signalement : commune, quartier et lieu saisis et envoyés au serveur
7. Profil : affichage distinct pour un compte enseigne

Ces corrections sont vérifiées par le typage, la compilation du bundle et des tests de base de données. Elles restent à valider sur un téléphone.

## À faire avant publication
1. Remettre en service le projet Supabase (l'adresse du fichier `.env` ne répond plus), activer l'auth anonyme et exécuter les trois scripts SQL dans l'ordre
2. Tester le parcours complet sur un téléphone Android et un iPhone
3. Remplacer l'icône provisoire (`assets/`)
4. Faire relire les conditions d'utilisation (`app/legal.tsx`) et y mettre une adresse de contact
5. Créer les comptes Google Play et Apple, puis lancer les builds (`eas build`)

## Idées pour la suite
- Tendance des prix sur l'accueil
- Détection de la commune par géolocalisation
- Photo du prix comme preuve
- Notifications et partage WhatsApp
- Récupération d'un compte enseigne après changement de téléphone
