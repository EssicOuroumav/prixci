# PrixCI — Contexte complet

## Stack technique
- React Native + Expo SDK 54
- expo-router (file-based routing)
- TypeScript
- Supabase (base de données cloud)
- expo-sqlite (stockage local)
- Zustand (state management)
- Node.js v20.19.4

## Structure du projet
/Users/mac/Desktop/prixci-VFINAL
├── app/
│   ├── _layout.tsx (layout principal + onboarding)
│   ├── (tabs)/
│   │   ├── index.tsx (Accueil - prix par commune)
│   │   ├── explorer.tsx (Comparaison prix)
│   │   ├── enseignes.tsx (Liste enseignes)
│   │   ├── signaler.tsx (Signaler un prix)
│   │   └── profil.tsx (Profil utilisateur)
│   ├── detail/ (détail signalement)
│   └── enseigne/ (inscription + détail enseigne)
├── services/
│   ├── auth.ts (Supabase auth anonyme)
│   ├── db.ts (SQLite local)
│   ├── enseignes.ts (gestion enseignes)
│   ├── sync.ts (synchronisation)
│   └── demoSeed.ts (données de démo)
├── stores/useAppStore.ts (Zustand)
├── constants/ (types, produits)
└── components/ (Onboarding, etc.)

## Architecture métier
- Consommateur : signale prix + lieu, visible après 10 confirmations
- Enseigne : s'inscrit, publie prix officiels (✅ officiel)
- Vue comparaison : officiel + signalements côte à côte

## Supabase
- URL: dans .env (EXPO_PUBLIC_SUPABASE_URL)
- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Tic- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Tspa- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Tran- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Ta- Tmanquant
4. Clic "voir historique" → erreur router
5. E5. E5. E5. E5. E5. E5. E5. E5. E5. E5. E5. Eseignes"
6. Signalement : manque commune + lieu
7. Profil : p7. Profil : p7. P co7. Profil : p7. Profil : p7. P co7. Profil :ajouter
1. Transport intra-commune
2. Filtre produit dans Explorer
3. Interface ajout prix pour enseignes
4. Seuil 10 confirmations
5. Vue comparaison enrichie
