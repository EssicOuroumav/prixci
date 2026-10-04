# PrixCI — Cahier des charges

Version 1.1 — 4 octobre 2026. Reconstruit à partir du code, puis mis à jour après la réalisation des lots 0 à 4.

Légende des statuts : **Fait** = présent dans le code · **Partiel** = présent mais incomplet ou bogué · **À faire** = absent du code.
Les statuts décrivent le code lu, pas un test sur téléphone.

---

## 1. Présentation

### 1.1 Problème
À Abidjan, le prix d'un même produit varie fortement d'un point de vente à l'autre, et les tarifs de transport informel changent sans annonce. Les habitants n'ont aucun moyen simple de savoir où acheter au juste prix ni de signaler un abus.

### 1.2 Solution
Une application mobile où chacun signale les prix qu'il observe, où la communauté les confirme ou les conteste, et où les commerces peuvent publier leurs prix officiels. La visibilité publique des prix crée une pression naturelle sur les prix abusifs.

### 1.3 Objectifs
1. Permettre de signaler un prix en moins de 30 secondes, anonymement.
2. Permettre de comparer le prix d'un produit entre points de vente d'une même commune.
3. Garantir la fiabilité des données par la validation communautaire.
4. Fonctionner sans connexion, avec synchronisation dès que le réseau revient.

### 1.4 Périmètre de la V1
- Zone : les 10 communes d'Abidjan (Abobo, Adjamé, Attécoubé, Cocody, Koumassi, Marcory, Plateau, Port-Bouët, Treichville, Yopougon).
- Domaines : alimentation et transport.
- Plateformes : Android et iOS (téléphone uniquement, mode portrait).
- Langue : français. Monnaie : FCFA.

---

## 2. Utilisateurs

| Profil | Besoin | Compte |
|---|---|---|
| Consommateur | Consulter, comparer, signaler, voter | Anonyme, pseudonyme généré automatiquement (ex. « VigilantBaobab412 ») |
| Enseigne (supermarché, boutique, pharmacie, marché) | Publier ses prix officiels pour attirer des clients | Inscription par formulaire |
| Administrateur (à créer) | Modérer les signalements et valider les enseignes | À faire |

---

## 3. Fonctionnalités

### 3.1 Premier lancement (onboarding)
| # | Fonctionnalité | Statut |
|---|---|---|
| F1 | 3 écrans de présentation : comparer, dénoncer, réguler ensemble | Fait |
| F2 | Bouton « Passer » ; l'onboarding ne s'affiche qu'une fois | Fait |
| F3 | Création automatique du compte anonyme, même hors ligne | Fait |

### 3.2 Accueil
| # | Fonctionnalité | Statut |
|---|---|---|
| F4 | Choix de la commune (Yopougon par défaut) | Fait |
| F5 | Liste des prix moyens de la commune : moyenne, min, max, nombre de signalements | Fait |
| F6 | Alerte « Écart » quand le prix s'éloigne du prix de référence | Fait (écart en % affiché par rapport au prix de référence OCPV) |
| F7 | Tendance du prix (hausse, baisse, stable) | À faire (la tendance n'existe que dans le graphique du détail) |
| F8 | Raccourci « Signaler un prix » | Fait |
| F9 | Détection de la commune par géolocalisation | À faire (la permission est déclarée, pas utilisée à l'accueil) |

### 3.3 Signaler un prix
Formulaire en 3 étapes.
| # | Fonctionnalité | Statut |
|---|---|---|
| F10 | Étape 1 — choix du produit avec recherche, parmi 85 références (70 alimentaires, 15 transports) | Fait |
| F11 | Étape 2 — saisie du prix en FCFA et de l'unité (kg, g, litre, unité, tas, botte, sac 25 kg, sac 50 kg, boîte, trajet) | Fait |
| F12 | Étape 3 — commune, type de point de vente (7 types), nom du lieu optionnel | Fait (commune, quartier, type de lieu, nom du lieu ; gare ou arrêt pour un trajet) |
| F13 | Contrôle du prix : refus d'un prix invalide ou anormalement élevé | Fait |
| F14 | Enregistrement immédiat sur le téléphone, envoi au serveur plus tard | Fait (lieu compris ; envoi lancé juste après la saisie) |
| F15 | Trajets internes à une commune pour le transport | Fait (gbaka, woro-woro et taxi intra-commune au catalogue) |
| F16 | Photo du prix ou du ticket comme preuve | À faire (option à décider) |

### 3.4 Explorer et comparer
| # | Fonctionnalité | Statut |
|---|---|---|
| F17 | Recherche d'un produit | Fait |
| F18 | Comparaison des prix par point de vente, avec badge « Moins cher » | Fait |
| F19 | Séparation en deux sections : alimentation et transport | Fait |
| F20 | Filtre par nom de produit | Fait |
| F21 | Vote directement depuis la liste | Fait (dans la file « À confirmer » de chaque produit) |
| F22 | Lien « voir historique » | Fait |

### 3.5 Détail d'un signalement
| # | Fonctionnalité | Statut |
|---|---|---|
| F23 | Fiche complète : produit, prix, lieu, date, auteur, score de fiabilité | Fait (nom du produit et statut vérifié / à confirmer en tête de fiche) |
| F24 | Graphique d'évolution du prix sur 30 jours | Fait |
| F25 | Indicateurs : prix actuel, prix il y a 30 jours, minimum, maximum, fourchette | Fait |
| F26 | Liste des votes reçus | Fait |

### 3.6 Validation communautaire
| # | Fonctionnalité | Statut |
|---|---|---|
| F27 | Boutons « Confirmer » et « Contester » | Fait |
| F28 | Un seul vote par personne et par signalement | Fait |
| F29 | Interdiction de voter sur son propre signalement | Fait |
| F30 | Un signalement n'apparaît publiquement qu'après 10 confirmations | Fait (moyennes, comparaisons et graphiques ; les autres restent dans la file « À confirmer ») |

### 3.7 Score de confiance
| # | Règle | Statut |
|---|---|---|
| F31 | Score utilisateur de 0 à 100, départ à 50 | Fait |
| F32 | +3 par confirmation reçue, −5 par contestation reçue, +1 par vote donné | Fait |
| F33 | Badges : Expert citoyen (90+), Contributeur actif (70+), Membre (50+), Débutant (30+), Non fiable | Fait |
| F34 | Score de fiabilité d'un signalement : 40 % score de l'auteur, 60 % votes | Fait (règle unique : 60 % du score de l'auteur, +5 par confirmation, −8 par contestation) |
| F35 | Libellés : Très fiable (80+), Fiable (60+), À vérifier (30+), Non fiable ; masqué sous 30 | Fait |

### 3.8 Enseignes
| # | Fonctionnalité | Statut |
|---|---|---|
| F36 | Liste des enseignes par commune | Code fait ; script `supabase_migration_v2.sql` à exécuter |
| F37 | Inscription : nom, type, commune, quartier, adresse, téléphone | Code fait ; même script |
| F38 | Fiche enseigne avec ses prix officiels, badge « Officiel » | Code fait ; même script |
| F39 | Ajout et suppression d'un prix par l'enseigne | Fait (produit choisi dans le catalogue, unités du produit) |
| F40 | Rattachement d'une enseigne à un compte : seul son propriétaire modifie ses prix | Fait (propriétaire fixé par le serveur, testé) |
| F41 | Vérification d'une enseigne avant publication | À faire |
| F42 | Comparaison côte à côte : prix officiels et signalements | Fait (prix officiels en tête de la comparaison, réseau nécessaire) |

### 3.9 Profil
| # | Fonctionnalité | Statut |
|---|---|---|
| F43 | Pseudonyme, score, badge, nombre de signalements et de validations reçues | Fait |
| F44 | Affichage différent pour un consommateur et pour une enseigne | Fait (compte enseigne : nom, badge et accès à la gestion des prix) |
| F45 | Historique de mes signalements | Fait (avec statut : vérifié, à confirmer, en attente de réseau) |
| F46 | Mode démo : recharger 61 signalements d'exemple, vider les données | Fait (présent seulement en développement, absent de la version publiée) |

### 3.10 Hors ligne et synchronisation
| # | Fonctionnalité | Statut |
|---|---|---|
| F47 | Toutes les données consultables et saisissables sans réseau | Fait |
| F48 | Envoi automatique des signalements et des votes au retour du réseau | Fait (au démarrage, au retour au premier plan, après chaque signalement et chaque vote) |
| F49 | Récupération des signalements des 7 derniers jours de la commune | Fait (30 derniers jours, avec les votes des autres utilisateurs) |
| F50 | Indicateur d'état : en cours, réussi, erreur, hors ligne | Fait |

### 3.11 À prévoir pour une vraie mise en service
| # | Fonctionnalité | Statut |
|---|---|---|
| F51 | Espace d'administration : modération, validation des enseignes | Partiel (modération dans le tableau de bord Supabase : table `abus`, statut des enseignes) |
| F52 | Signaler un contenu abusif | Fait (sur un signalement et sur une enseigne) |
| F53 | Notifications (baisse de prix, vote reçu) | À faire, optionnel |
| F54 | Partage d'un prix vers WhatsApp | À faire, optionnel |
| F55 | Écrans « Conditions d'utilisation » et « Confidentialité » | Fait (texte de travail, à faire relire par un juriste) |

---

## 4. Données

### 4.1 Catalogue (fixe, embarqué dans l'application)
- Alimentation : légumes-tubercules (7), légumes-feuilles (2), légumes-fruits (14), viandes (12), poissons (9), fruits (8), céréales et légumineuses (11), huiles et condiments (7).
- Transport : gbaka (6), woro-woro (6), taxi (3), dont les trajets internes à une commune.
- Chaque produit a une unité par défaut et, quand il existe, un prix de référence OCPV.

### 4.2 Tables
| Table | Rôle | Téléphone | Serveur |
|---|---|---|---|
| users | Profil anonyme et score | Oui | Oui |
| signalements | Prix signalés | Oui | Oui |
| validations | Votes | Oui | Oui |
| enseignes | Commerces inscrits | Non | Oui (migration v2) |
| prix_officiels | Prix publiés par les enseignes | Non | Oui (migration v2) |
| abus | Contenus signalés comme abusifs | Non | Oui (migration v2) |

Vues serveur : `prix_agreges` (moyennes sur 30 jours) et `comparaison_par_lieu` (classement du moins cher au plus cher).

---

## 5. Exigences techniques

| Domaine | Exigence |
|---|---|
| Technologie | Expo SDK 54, React Native, TypeScript, expo-router, Zustand, SQLite local, Supabase |
| Hors ligne | Aucune fonction de base ne doit dépendre du réseau |
| Performance | Démarrage en moins de 3 secondes sur un téléphone Android d'entrée de gamme ; application légère en données mobiles |
| Sécurité | Droits d'accès par ligne sur toutes les tables ; un utilisateur n'écrit que ses propres données |
| Vie privée | Aucune donnée personnelle ; pseudonymes automatiques ; position utilisée seulement avec accord |
| Qualité | Zéro erreur TypeScript ; code versionné avec git |
| Identité | Vert `#0A5F38`, identifiant `ci.prixci.app` ; icône et écran de démarrage à produire |

---

## 6. Contraintes et risques

| Risque | Réponse prévue |
|---|---|
| Faux signalements, manipulation par un concurrent | Seuil de 10 confirmations, score de confiance, modération |
| Diffamation d'un commerçant nommé | Voir décision D1 |
| Trop peu d'utilisateurs au départ : application vide | Données de référence OCPV affichées par défaut, lancement sur 1 ou 2 communes |
| Seuil de 10 confirmations trop élevé au lancement | Voir décision D2 |
| Coût du serveur | Offre gratuite Supabase suffisante pour démarrer |

---

## 7. Décisions

Décisions prises par défaut pendant la réalisation. Chacune peut être revue.

- **D1 — Nommer les commerces : autorisé.** Les notes les plus récentes prévoient les enseignes et le nom du lieu. En contrepartie : signalement d'abus et retrait possible par l'équipe. À valider avec un juriste.
- **D2 — Seuil de visibilité : 10 confirmations.** Réglable dans une seule constante (`SEUIL_CONFIRMATIONS`, fichier `services/scoring.ts`). Risque connu : application peu remplie au lancement.
- **D3 — Compte enseigne : rattaché au compte anonyme qui l'inscrit**, active immédiatement. La suspension se fait dans Supabase (colonne `statut`). Limite : le compte est lié au téléphone ; en cas de changement d'appareil l'accès à l'enseigne est perdu.
- **D4 — Formule de fiabilité : une seule règle**, identique dans l'application et sur le serveur.

Reste à décider :

- **D5 — Publication.** Play Store seul d'abord, ou Play Store et App Store ?
- **D6 — Récupération de compte.** Faut-il un numéro de téléphone ou un e-mail pour les enseignes, afin de survivre à un changement d'appareil ?

---

## 8. Plan de réalisation

| Lot | Contenu | État |
|---|---|---|
| 0 — Assainir | Git, nettoyage, erreurs TypeScript, icône provisoire | Fait |
| 1 — Serveur | Script `supabase_migration_v2.sql`, synchronisation complète, règle de fiabilité unique | Code fait et testé hors Supabase ; script à exécuter sur le projet Supabase |
| 2 — Bugs | Les 7 bugs de la roadmap | Corrigés dans le code |
| 3 — Fonctions manquantes | F15, F20, F30, F39, F40, F42, F45 | Fait |
| 4 — Mise en service | Signalement d'abus, pages légales, démo retirée de la version publiée, configuration de build | Fait ; tests sur téléphone à mener |
| 5 — Publication | Build, fiche store, test fermé puis ouverture | À faire |

### Critères d'acceptation de la V1
1. Un nouvel utilisateur signale un prix en moins de 30 secondes, sans réseau.
2. Le signalement arrive sur le serveur avec son lieu dès le retour du réseau.
3. Un autre utilisateur le voit, vote, et les scores évoluent comme décrit en 3.7.
4. Une enseigne s'inscrit, publie un prix, et ce prix apparaît dans la comparaison.
5. Personne d'autre que l'enseigne ne peut modifier ses prix.
6. Aucun écran ne produit d'erreur sur Android et sur iOS.
