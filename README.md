# PrixCI — Application de transparence des prix en Côte d'Ivoire

## Vision
App citoyenne offline-first permettant aux habitants d'Abidjan de signaler et consulter les prix des denrées alimentaires et des transports. Mécanisme de régulation par la transparence : visibilité publique des prix = pression naturelle sur les acteurs économiques abusifs.

---

## Stack technique
| Couche | Technologie |
|---|---|
| Framework | Expo SDK 51 + React Native + TypeScript |
| Navigation | Expo Router (file-based) |
| Stockage local | expo-sqlite (SQLite natif) |
| Auth anonyme | Supabase Anonymous Auth |
| Sync centrale | Supabase PostgreSQL (free tier) |
| État global | Zustand |

---

## Installation

### 1. Cloner et installer
```bash
git clone <repo>
cd prixci
npm install
```

### 2. Configurer Supabase
1. Créer un projet sur https://supabase.com (gratuit)
2. Dans **SQL Editor**, exécuter le contenu de `supabase_schema.sql`
3. Dans **Settings > API**, copier l'URL et la clé anon
4. Créer le fichier `.env` :
```bash
cp .env.example .env
# Éditer .env avec tes valeurs Supabase
```

### 3. Activer l'auth anonyme dans Supabase
Aller dans **Authentication > Providers > Anonymous** → Activer

### 4. Lancer
```bash
npx expo start
# Scanner le QR code avec Expo Go sur ton téléphone
```

---

## Architecture des fichiers

```
prixci/
├── app/
│   ├── _layout.tsx              # Initialisation (DB, auth, sync)
│   └── (tabs)/
│       ├── _layout.tsx          # Navigation par onglets
│       ├── index.tsx            # Accueil — prix par commune
│       ├── signaler.tsx         # Formulaire 3 étapes
│       ├── explorer.tsx         # Recherche (Sprint 3)
│       └── profil.tsx           # Score de confiance
├── services/
│   ├── db.ts                    # SQLite CRUD complet
│   ├── auth.ts                  # Auth anonyme Supabase
│   ├── sync.ts                  # Sync offline-first
│   └── scoring.ts               # Logique réputation
├── stores/
│   └── useAppStore.ts           # État global Zustand
└── constants/
    ├── types.ts                 # Types TypeScript
    └── produits.ts              # 70+ produits OCPV + transports
```

---

## Roadmap

| Sprint | Statut | Contenu |
|---|---|---|
| S1 — Foundation | ✅ Terminé | Setup, SQLite, auth, navigation |
| S2 — Signalement | ✅ Terminé | Formulaire 3 étapes, stockage local |
| S3 — Consultation | 🔜 À faire | Écran explorer, filtres, comparaison |
| S4 — Réputation | 🔜 À faire | Votes communautaires, badges |
| S5 — Sync + Polish | 🔜 À faire | Sync complète, onboarding |

---

## Modèle de score de confiance

Inspiré de Waze :
- Score utilisateur initial : **50/100**
- +3 pts : signalement confirmé par 2+ utilisateurs
- -5 pts : signalement contesté par 3+ utilisateurs
- +1 pt : avoir voté sur le signalement d'un autre
- Seuil affichage public : **score ≥ 30**

---

## Sources de données de référence
- **OCPV** (Office d'aide à la Commercialisation des Produits Vivriers) — relevés hebdomadaires des marchés d'Abidjan
- Prix de transport : lignes SOTRA et opérateurs informels Gbaka/Woro-woro

---

## Notes légales
- Aucune donnée personnelle collectée
- Pseudonymes générés automatiquement
- Signalements anonymisés dans la base publique
- Pas de nommage de commerçants en V1 (risque juridique)
