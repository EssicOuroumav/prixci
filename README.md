# PrixCI — Application de transparence des prix en Côte d'Ivoire

## Vision
App citoyenne offline-first permettant aux habitants d'Abidjan de signaler et consulter les prix des denrées alimentaires et des transports. Mécanisme de régulation par la transparence : visibilité publique des prix = pression naturelle sur les acteurs économiques abusifs.

---

## Stack technique
| Couche | Technologie |
|---|---|
| Framework | Expo SDK 54 + React Native + TypeScript |
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
2. Dans **SQL Editor**, exécuter dans l'ordre `supabase_schema.sql`, `supabase_migration_sprint3.sql` puis `supabase_migration_v2.sql`
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

### 5. Vérifier
```bash
npm test
```
Lance le contrôle de typage puis exécute les trois scripts SQL dans un Postgres embarqué pour vérifier les droits d'accès, les votes et les enseignes.

---

## Documentation
- `CAHIER_DES_CHARGES.md` : fonctionnalités et leur état
- `CONTEXTE.md` : structure du code et règles métier
- `ROADMAP.md` : ce qui reste à faire avant publication

---

## Modèle de score de confiance

Inspiré de Waze :
- Score utilisateur initial : **50/100**
- +3 pts par confirmation reçue, −5 pts par contestation reçue
- +1 pt pour chaque vote donné
- Un signalement devient public après **10 confirmations**
- Un signalement dont la fiabilité tombe sous **30** est masqué

---

## Sources de données de référence
- **OCPV** (Office d'aide à la Commercialisation des Produits Vivriers) — relevés hebdomadaires des marchés d'Abidjan
- Prix de transport : lignes SOTRA et opérateurs informels Gbaka/Woro-woro

---

## Notes légales
- Aucune donnée personnelle collectée
- Pseudonymes générés automatiquement
- Signalements anonymisés dans la base publique
- Les lieux et enseignes peuvent être nommés ; tout contenu peut être signalé comme abusif et retiré
