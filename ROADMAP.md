# PrixCI — Roadmap

Mise à jour : 4 octobre 2026. Le but du produit et les règles sont dans `CONTEXTE.md`.

## Fait
- Prix officiels visibles dès l'ouverture : bulletin « C'est combien ? » du 28 septembre au 5 octobre 2026 (6 villes) et relevé OCPV du 7 au 13 septembre 2026 (24 régions, prix mini, maxi et moyen)
- Classement des commerces : « au prix officiel » ou « dépassements constatés », fiche par commerce, itinéraire
- Validation d'un prix par 3 citoyens concordants (remplace les 10 confirmations)
- Grand Abidjan (13 communes) et 23 villes de l'intérieur
- Transport : trajets intra-commune, moment du trajet
- Produits ajoutés : riz importé, huile raffinée, tomate concentrée, pâtes, lait, pain, gaz B6 et B12, charbon, carburant
- Partage WhatsApp, signalement d'abus, limites anti-abus côté serveur
- Logo, icônes, séparation alimentation / transport, application vide au départ

## À faire maintenant
1. Exécuter `supabase_migration_v4.sql` dans le SQL Editor de Supabase (la v3 est déjà passée)
2. Relire les prix saisis : bulletin (`constants/prixOfficiels.ts`) et relevé OCPV (`constants/prixOfficielsOcpv.ts`)
3. Chaque semaine : ajouter le nouveau bulletin ou relevé dans la table `prix_reference` (relevés OCPV : economie-ivoirienne.ci/info-prix.html)
4. Tester sur un téléphone Android

## Prochaine étape de développement
- Prix plafonnés par arrêté (riz, huile, sucre, tomate, lait, pâtes, viande) : par marque et par zone. Les seuls documents publiés datent de juin 2022 ; il faut les plafonds en vigueur.
- Carte des commerces avec repères (aujourd'hui : liste et itinéraire)
- Photo du prix comme preuve
- Alertes (nouveau commerce au prix officiel près de chez moi, dépassement constaté)
- Tarifs officiels de transport, s'il en existe une source
- Logement

## Avant publication
- Faire relire les conditions d'utilisation (`app/legal.tsx`) et y mettre une adresse de contact
- Avis juridique sur le fait de nommer un commerce en dépassement, et déclaration à l'ARTCI (données de position)
- Activer la protection CAPTCHA des connexions anonymes dans Supabase
- Comptes Google Play et Apple, puis builds (`eas build`)
