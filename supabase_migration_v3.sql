-- ============================================================
-- MIGRATION SUPABASE — PrixCI v3
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Prérequis : supabase_migration_v2.sql
-- Idempotent : peut être relancé sans risque. Ne supprime aucune donnée.
--
-- Contenu :
--   1. Prix officiels de l'État (plafonds légaux et prix moyens hebdomadaires)
--   2. Moment du trajet pour les signalements de transport
--   3. Limites anti-abus sur les signalements et les votes
-- ============================================================

-- ─── 1. PRIX OFFICIELS ────────────────────────────────────
-- type = 'plafond' : prix maximum fixé par arrêté (obligatoire)
-- type = 'moyen'   : coût moyen du marché publié chaque semaine (indicatif)
--
-- Mise à jour hebdomadaire : ajouter les lignes du nouveau bulletin avec leur
-- date_debut. L'application retient, pour chaque produit et chaque ville,
-- la ligne la plus récente ; un plafond l'emporte toujours sur un prix moyen.
CREATE TABLE IF NOT EXISTS public.prix_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('plafond', 'moyen')),
  produit_id TEXT NOT NULL,
  produit_nom TEXT NOT NULL,
  unite TEXT NOT NULL,
  ville TEXT NOT NULL,
  prix NUMERIC(10, 0) NOT NULL CHECK (prix > 0),
  date_debut DATE NOT NULL,
  date_fin DATE,
  source TEXT NOT NULL DEFAULT '',
  UNIQUE (type, produit_id, unite, ville, date_debut)
);

CREATE INDEX IF NOT EXISTS idx_prix_reference_ville ON public.prix_reference(ville);

ALTER TABLE public.prix_reference ENABLE ROW LEVEL SECURITY;

-- Lecture par tous ; écriture uniquement depuis le tableau de bord Supabase
REVOKE ALL ON public.prix_reference FROM anon, authenticated;
GRANT SELECT ON public.prix_reference TO anon, authenticated;

DROP POLICY IF EXISTS "prix_reference_select" ON public.prix_reference;
CREATE POLICY "prix_reference_select" ON public.prix_reference
  FOR SELECT USING (true);

-- Bulletin « C'est combien ? » — semaine du 28 septembre au 5 octobre 2026
-- Saisi à partir des captures du bulletin : à relire.
INSERT INTO public.prix_reference
  (type, produit_id, produit_nom, unite, ville, prix, date_debut, date_fin, source)
VALUES
  ('moyen', 'patate-douce', 'Patate douce', 'kg', 'Abidjan', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'patate-douce', 'Patate douce', 'kg', 'San-Pédro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'patate-douce', 'Patate douce', 'kg', 'Bouaké', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'patate-douce', 'Patate douce', 'kg', 'Yamoussoukro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'patate-douce', 'Patate douce', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'patate-douce', 'Patate douce', 'kg', 'Korhogo', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-plantain', 'Banane plantain', 'kg', 'Abidjan', 450, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-plantain', 'Banane plantain', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-plantain', 'Banane plantain', 'kg', 'Bouaké', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-plantain', 'Banane plantain', 'kg', 'Yamoussoukro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-plantain', 'Banane plantain', 'kg', 'Man', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-plantain', 'Banane plantain', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-kponan', 'Igname Kponan', 'kg', 'Abidjan', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-kponan', 'Igname Kponan', 'kg', 'San-Pédro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-kponan', 'Igname Kponan', 'kg', 'Bouaké', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-kponan', 'Igname Kponan', 'kg', 'Yamoussoukro', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-kponan', 'Igname Kponan', 'kg', 'Man', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-kponan', 'Igname Kponan', 'kg', 'Korhogo', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-assawa', 'Igname Assawa', 'kg', 'San-Pédro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-assawa', 'Igname Assawa', 'kg', 'Bouaké', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-assawa', 'Igname Assawa', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'igname-assawa', 'Igname Assawa', 'kg', 'Korhogo', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-placali', 'Pâte de placali', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-placali', 'Pâte de placali', 'kg', 'Yamoussoukro', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-placali', 'Pâte de placali', 'kg', 'Man', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-placali', 'Pâte de placali', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-violet-galmi', 'Oignon Violet Galmi', 'kg', 'Abidjan', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-violet-galmi', 'Oignon Violet Galmi', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-violet-galmi', 'Oignon Violet Galmi', 'kg', 'Bouaké', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-violet-galmi', 'Oignon Violet Galmi', 'kg', 'Yamoussoukro', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-violet-galmi', 'Oignon Violet Galmi', 'kg', 'Man', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-violet-galmi', 'Oignon Violet Galmi', 'kg', 'Korhogo', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-blanc', 'Oignon Blanc', 'kg', 'Abidjan', 750, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-blanc', 'Oignon Blanc', 'kg', 'San-Pédro', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-blanc', 'Oignon Blanc', 'kg', 'Bouaké', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-blanc', 'Oignon Blanc', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-blanc', 'Oignon Blanc', 'kg', 'Man', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'oignon-blanc', 'Oignon Blanc', 'kg', 'Korhogo', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'graine-de-palme', 'Graine de palme', 'kg', 'Abidjan', 350, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'graine-de-palme', 'Graine de palme', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'graine-de-palme', 'Graine de palme', 'kg', 'Bouaké', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'graine-de-palme', 'Graine de palme', 'kg', 'Yamoussoukro', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'graine-de-palme', 'Graine de palme', 'kg', 'Man', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'graine-de-palme', 'Graine de palme', 'kg', 'Korhogo', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chou', 'Chou', 'kg', 'Abidjan', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chou', 'Chou', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chou', 'Chou', 'kg', 'Bouaké', 650, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chou', 'Chou', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chou', 'Chou', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chou', 'Chou', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomate-salade', 'Tomate type salade', 'kg', 'Abidjan', 650, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomate-salade', 'Tomate type salade', 'kg', 'San-Pédro', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomate-salade', 'Tomate type salade', 'kg', 'Bouaké', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomate-salade', 'Tomate type salade', 'kg', 'Yamoussoukro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomate-salade', 'Tomate type salade', 'kg', 'Man', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomate-salade', 'Tomate type salade', 'kg', 'Korhogo', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'concombre', 'Concombre', 'kg', 'Abidjan', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'concombre', 'Concombre', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'concombre', 'Concombre', 'kg', 'Bouaké', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'concombre', 'Concombre', 'kg', 'Yamoussoukro', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'concombre', 'Concombre', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'concombre', 'Concombre', 'kg', 'Korhogo', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'courgette', 'Courgette', 'kg', 'Abidjan', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'courgette', 'Courgette', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'courgette', 'Courgette', 'kg', 'Bouaké', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'courgette', 'Courgette', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'courgette', 'Courgette', 'kg', 'Man', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'courgette', 'Courgette', 'kg', 'Korhogo', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'navet', 'Navet', 'kg', 'Abidjan', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'navet', 'Navet', 'kg', 'San-Pédro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'navet', 'Navet', 'kg', 'Bouaké', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'navet', 'Navet', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'navet', 'Navet', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'navet', 'Navet', 'kg', 'Korhogo', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'manioc', 'Manioc', 'kg', 'Abidjan', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'manioc', 'Manioc', 'kg', 'San-Pédro', 350, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'manioc', 'Manioc', 'kg', 'Bouaké', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'manioc', 'Manioc', 'kg', 'Yamoussoukro', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'manioc', 'Manioc', 'kg', 'Man', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'manioc', 'Manioc', 'kg', 'Korhogo', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'haricot-vert', 'Haricot vert', 'kg', 'Abidjan', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'haricot-vert', 'Haricot vert', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'haricot-vert', 'Haricot vert', 'kg', 'Bouaké', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'haricot-vert', 'Haricot vert', 'kg', 'Yamoussoukro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'haricot-vert', 'Haricot vert', 'kg', 'Man', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'haricot-vert', 'Haricot vert', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gombo-frais', 'Gombo frais', 'kg', 'Abidjan', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gombo-frais', 'Gombo frais', 'kg', 'San-Pédro', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gombo-frais', 'Gombo frais', 'kg', 'Bouaké', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gombo-frais', 'Gombo frais', 'kg', 'Yamoussoukro', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gombo-frais', 'Gombo frais', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gombo-frais', 'Gombo frais', 'kg', 'Korhogo', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'aubergine-ndrowa', 'Aubergine N''drowa', 'kg', 'Abidjan', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'aubergine-ndrowa', 'Aubergine N''drowa', 'kg', 'San-Pédro', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'aubergine-ndrowa', 'Aubergine N''drowa', 'kg', 'Bouaké', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'aubergine-ndrowa', 'Aubergine N''drowa', 'kg', 'Yamoussoukro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'aubergine-ndrowa', 'Aubergine N''drowa', 'kg', 'Man', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'aubergine-ndrowa', 'Aubergine N''drowa', 'kg', 'Korhogo', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'piment-frais', 'Piment frais', 'kg', 'Abidjan', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'piment-frais', 'Piment frais', 'kg', 'San-Pédro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'piment-frais', 'Piment frais', 'kg', 'Bouaké', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'piment-frais', 'Piment frais', 'kg', 'Yamoussoukro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'piment-frais', 'Piment frais', 'kg', 'Man', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'piment-frais', 'Piment frais', 'kg', 'Korhogo', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poivron', 'Poivron', 'kg', 'Abidjan', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poivron', 'Poivron', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poivron', 'Poivron', 'kg', 'Bouaké', 1300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poivron', 'Poivron', 'kg', 'Yamoussoukro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poivron', 'Poivron', 'kg', 'Man', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poivron', 'Poivron', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carotte', 'Carotte', 'kg', 'Abidjan', 1300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carotte', 'Carotte', 'kg', 'San-Pédro', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carotte', 'Carotte', 'kg', 'Bouaké', 1300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carotte', 'Carotte', 'kg', 'Yamoussoukro', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carotte', 'Carotte', 'kg', 'Man', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carotte', 'Carotte', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pomme-de-terre', 'Pomme de terre', 'kg', 'Abidjan', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pomme-de-terre', 'Pomme de terre', 'kg', 'San-Pédro', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pomme-de-terre', 'Pomme de terre', 'kg', 'Bouaké', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pomme-de-terre', 'Pomme de terre', 'kg', 'Yamoussoukro', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pomme-de-terre', 'Pomme de terre', 'kg', 'Man', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pomme-de-terre', 'Pomme de terre', 'kg', 'Korhogo', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'huile-rouge', 'Huile rouge (palme)', 'litre', 'Abidjan', 1900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'huile-rouge', 'Huile rouge (palme)', 'litre', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'huile-rouge', 'Huile rouge (palme)', 'litre', 'Bouaké', 1300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'huile-rouge', 'Huile rouge (palme)', 'litre', 'Yamoussoukro', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'huile-rouge', 'Huile rouge (palme)', 'litre', 'Man', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'huile-rouge', 'Huile rouge (palme)', 'litre', 'Korhogo', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-sans-os', 'Viande de bœuf sans os', 'kg', 'Abidjan', 4300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-sans-os', 'Viande de bœuf sans os', 'kg', 'San-Pédro', 6000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-sans-os', 'Viande de bœuf sans os', 'kg', 'Yamoussoukro', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-sans-os', 'Viande de bœuf sans os', 'kg', 'Man', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-sans-os', 'Viande de bœuf sans os', 'kg', 'Korhogo', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-avec-os', 'Viande de bœuf avec os', 'kg', 'Abidjan', 3800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-avec-os', 'Viande de bœuf avec os', 'kg', 'San-Pédro', 4000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-avec-os', 'Viande de bœuf avec os', 'kg', 'Yamoussoukro', 2800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-avec-os', 'Viande de bœuf avec os', 'kg', 'Man', 2800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'boeuf-avec-os', 'Viande de bœuf avec os', 'kg', 'Korhogo', 2600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'dinde', 'Dinde', 'kg', 'Abidjan', 5000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'dinde', 'Dinde', 'kg', 'San-Pédro', 9000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'dinde', 'Dinde', 'kg', 'Yamoussoukro', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'dinde', 'Dinde', 'kg', 'Man', 7000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'lapin', 'Lapin', 'kg', 'Abidjan', 5000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'lapin', 'Lapin', 'kg', 'San-Pédro', 7500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pintade', 'Pintade', 'kg', 'Abidjan', 6000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pintade', 'Pintade', 'kg', 'San-Pédro', 7000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pintade', 'Pintade', 'kg', 'Yamoussoukro', 8000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pintade', 'Pintade', 'kg', 'Man', 8000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pintade', 'Pintade', 'kg', 'Korhogo', 6000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poulet-chair', 'Poulet de chair (entier)', 'kg', 'Abidjan', 3200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poulet-chair', 'Poulet de chair (entier)', 'kg', 'San-Pédro', 3500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poulet-chair', 'Poulet de chair (entier)', 'kg', 'Bouaké', 2200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poulet-chair', 'Poulet de chair (entier)', 'kg', 'Yamoussoukro', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poulet-chair', 'Poulet de chair (entier)', 'kg', 'Man', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poulet-chair', 'Poulet de chair (entier)', 'kg', 'Korhogo', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-poulet', 'Pattes de poulet', 'kg', 'Abidjan', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-poulet', 'Pattes de poulet', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-poulet', 'Pattes de poulet', 'kg', 'Yamoussoukro', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-poulet', 'Pattes de poulet', 'kg', 'Man', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poule-pondeuse', 'Poule pondeuse', 'kg', 'Abidjan', 2700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poule-pondeuse', 'Poule pondeuse', 'kg', 'San-Pédro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'poule-pondeuse', 'Poule pondeuse', 'kg', 'Korhogo', 3500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sosso-importe', 'Sosso importé (congelé)', 'kg', 'Abidjan', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sosso-importe', 'Sosso importé (congelé)', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sosso-importe', 'Sosso importé (congelé)', 'kg', 'Yamoussoukro', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sosso-importe', 'Sosso importé (congelé)', 'kg', 'Korhogo', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chinchard', 'Chinchard (Kedjenou)', 'kg', 'Abidjan', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chinchard', 'Chinchard (Kedjenou)', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chinchard', 'Chinchard (Kedjenou)', 'kg', 'Yamoussoukro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'chinchard', 'Chinchard (Kedjenou)', 'kg', 'Korhogo', 1600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carpe-importe', 'Carpe importée', 'kg', 'Abidjan', 1600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carpe-importe', 'Carpe importée', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carpe-importe', 'Carpe importée', 'kg', 'Yamoussoukro', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carpe-importe', 'Carpe importée', 'kg', 'Korhogo', 2600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carpe-aquaculture', 'Carpe aquaculture (locale)', 'kg', 'Abidjan', 3500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carpe-aquaculture', 'Carpe aquaculture (locale)', 'kg', 'San-Pédro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carpe-aquaculture', 'Carpe aquaculture (locale)', 'kg', 'Yamoussoukro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'carpe-aquaculture', 'Carpe aquaculture (locale)', 'kg', 'Korhogo', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'thon', 'Thon', 'kg', 'Abidjan', 850, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'thon', 'Thon', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'thon', 'Thon', 'kg', 'Yamoussoukro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'maquereau', 'Maquereau', 'kg', 'Abidjan', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'maquereau', 'Maquereau', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'maquereau', 'Maquereau', 'kg', 'Yamoussoukro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'maquereau', 'Maquereau', 'kg', 'Korhogo', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'machoiron', 'Machoiron', 'kg', 'Abidjan', 1750, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'machoiron', 'Machoiron', 'kg', 'San-Pédro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'machoiron', 'Machoiron', 'kg', 'Yamoussoukro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'machoiron', 'Machoiron', 'kg', 'Korhogo', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'mouton', 'Viande de mouton', 'kg', 'Abidjan', 4500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'mouton', 'Viande de mouton', 'kg', 'San-Pédro', 4000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'mouton', 'Viande de mouton', 'kg', 'Yamoussoukro', 4000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'mouton', 'Viande de mouton', 'kg', 'Korhogo', 5000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'kplo', 'Kplo (peau de bœuf)', 'unité', 'Abidjan', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'kplo', 'Kplo (peau de bœuf)', 'unité', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'kplo', 'Kplo (peau de bœuf)', 'unité', 'Bouaké', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'kplo', 'Kplo (peau de bœuf)', 'unité', 'Yamoussoukro', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'kplo', 'Kplo (peau de bœuf)', 'unité', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'porc', 'Viande de porc', 'kg', 'Abidjan', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'porc', 'Viande de porc', 'kg', 'San-Pédro', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'porc', 'Viande de porc', 'kg', 'Yamoussoukro', 2200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'porc', 'Viande de porc', 'kg', 'Man', 1800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'porc', 'Viande de porc', 'kg', 'Korhogo', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'cotes-porc', 'Côtes de porc', 'kg', 'Abidjan', 1100, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'cotes-porc', 'Côtes de porc', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'cotes-porc', 'Côtes de porc', 'kg', 'Yamoussoukro', 1800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'cotes-porc', 'Côtes de porc', 'kg', 'Man', 1800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'cotes-porc', 'Côtes de porc', 'kg', 'Korhogo', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-porc', 'Pattes de porc', 'kg', 'Abidjan', 1300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-porc', 'Pattes de porc', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-porc', 'Pattes de porc', 'kg', 'Yamoussoukro', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-porc', 'Pattes de porc', 'kg', 'Man', 1800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-porc', 'Pattes de porc', 'kg', 'Korhogo', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-boeuf', 'Pattes de bœuf', 'kg', 'Abidjan', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-boeuf', 'Pattes de bœuf', 'kg', 'San-Pédro', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-boeuf', 'Pattes de bœuf', 'kg', 'Yamoussoukro', 2500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-boeuf', 'Pattes de bœuf', 'kg', 'Man', 2600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pattes-boeuf', 'Pattes de bœuf', 'kg', 'Korhogo', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'ananas', 'Ananas', 'kg', 'Abidjan', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'ananas', 'Ananas', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'ananas', 'Ananas', 'kg', 'Bouaké', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'ananas', 'Ananas', 'kg', 'Yamoussoukro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'ananas', 'Ananas', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'ananas', 'Ananas', 'kg', 'Korhogo', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'citron', 'Citron', 'kg', 'Abidjan', 350, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'citron', 'Citron', 'kg', 'San-Pédro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'citron', 'Citron', 'kg', 'Bouaké', 875, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'citron', 'Citron', 'kg', 'Yamoussoukro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'citron', 'Citron', 'kg', 'Man', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'citron', 'Citron', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'avocat', 'Avocat', 'kg', 'Abidjan', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'avocat', 'Avocat', 'kg', 'San-Pédro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'avocat', 'Avocat', 'kg', 'Bouaké', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'avocat', 'Avocat', 'kg', 'Yamoussoukro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'avocat', 'Avocat', 'kg', 'Man', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'avocat', 'Avocat', 'kg', 'Korhogo', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'noix-coco', 'Noix de coco', 'unité', 'Abidjan', 200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'noix-coco', 'Noix de coco', 'unité', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'noix-coco', 'Noix de coco', 'unité', 'Bouaké', 200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'noix-coco', 'Noix de coco', 'unité', 'Yamoussoukro', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'noix-coco', 'Noix de coco', 'unité', 'Man', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'noix-coco', 'Noix de coco', 'unité', 'Korhogo', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-dessert', 'Banane dessert', 'kg', 'Abidjan', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-dessert', 'Banane dessert', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-dessert', 'Banane dessert', 'kg', 'Bouaké', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-dessert', 'Banane dessert', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-dessert', 'Banane dessert', 'kg', 'Man', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'banane-dessert', 'Banane dessert', 'kg', 'Korhogo', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'papaye', 'Papaye', 'kg', 'Abidjan', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'papaye', 'Papaye', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'papaye', 'Papaye', 'kg', 'Bouaké', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'papaye', 'Papaye', 'kg', 'Yamoussoukro', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'papaye', 'Papaye', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'papaye', 'Papaye', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'orange', 'Orange', 'kg', 'Abidjan', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'orange', 'Orange', 'kg', 'San-Pédro', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'orange', 'Orange', 'kg', 'Bouaké', 200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'orange', 'Orange', 'kg', 'Yamoussoukro', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'orange', 'Orange', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'orange', 'Orange', 'kg', 'Korhogo', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pasteque', 'Pastèque', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pasteque', 'Pastèque', 'kg', 'Bouaké', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pasteque', 'Pastèque', 'kg', 'Yamoussoukro', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pasteque', 'Pastèque', 'kg', 'Man', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pasteque', 'Pastèque', 'kg', 'Korhogo', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-wita9', 'Riz local Wita 9', 'kg', 'Abidjan', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-wita9', 'Riz local Wita 9', 'kg', 'Bouaké', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-wita9', 'Riz local Wita 9', 'kg', 'Yamoussoukro', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-wita9', 'Riz local Wita 9', 'kg', 'Man', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-wita9', 'Riz local Wita 9', 'kg', 'Korhogo', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-danane', 'Riz Danané', 'kg', 'Abidjan', 700, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-danane', 'Riz Danané', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-danane', 'Riz Danané', 'kg', 'Bouaké', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-danane', 'Riz Danané', 'kg', 'Yamoussoukro', 650, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-danane', 'Riz Danané', 'kg', 'Man', 550, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'riz-danane', 'Riz Danané', 'kg', 'Korhogo', 400, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-soja', 'Farine de soja', 'kg', 'Abidjan', 800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-soja', 'Farine de soja', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-soja', 'Farine de soja', 'kg', 'Korhogo', 1250, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mais', 'Farine de maïs', 'kg', 'Abidjan', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mais', 'Farine de maïs', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mais', 'Farine de maïs', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mais', 'Farine de maïs', 'kg', 'Korhogo', 1300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-sorgho', 'Farine de sorgho', 'kg', 'Abidjan', 650, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-sorgho', 'Farine de sorgho', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-sorgho', 'Farine de sorgho', 'kg', 'Korhogo', 1300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mais-kabato', 'Farine de maïs (kabato)', 'kg', 'Abidjan', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mais-kabato', 'Farine de maïs (kabato)', 'kg', 'San-Pédro', 300, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mais-kabato', 'Farine de maïs (kabato)', 'kg', 'Yamoussoukro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mais-kabato', 'Farine de maïs (kabato)', 'kg', 'Korhogo', 650, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mil', 'Farine de mil', 'kg', 'Abidjan', 500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mil', 'Farine de mil', 'kg', 'Yamoussoukro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-mil', 'Farine de mil', 'kg', 'Korhogo', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-cajou', 'Farine d''amande de cajou', 'kg', 'Abidjan', 5000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-cajou', 'Farine d''amande de cajou', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-cajou', 'Farine d''amande de cajou', 'kg', 'Yamoussoukro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-manioc', 'Farine de manioc', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'farine-manioc', 'Farine de manioc', 'kg', 'Korhogo', 350, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-pistache', 'Pâte de pistache', 'kg', 'San-Pédro', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-pistache', 'Pâte de pistache', 'kg', 'Yamoussoukro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-pistache', 'Pâte de pistache', 'kg', 'Korhogo', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-arachide', 'Pâte d''arachide', 'kg', 'San-Pédro', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-arachide', 'Pâte d''arachide', 'kg', 'Bouaké', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-arachide', 'Pâte d''arachide', 'kg', 'Yamoussoukro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'pate-arachide', 'Pâte d''arachide', 'kg', 'Korhogo', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sesame', 'Sésame', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'niebe', 'Niébé (haricot blanc)', 'kg', 'San-Pédro', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'fonio-precuit', 'Fonio précuit', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'fonio-precuit', 'Fonio précuit', 'kg', 'Bouaké', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'fonio-precuit', 'Fonio précuit', 'kg', 'Korhogo', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-roux', 'Sucre roux', 'kg', 'San-Pédro', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-roux', 'Sucre roux', 'kg', 'Bouaké', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-roux', 'Sucre roux', 'kg', 'Yamoussoukro', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-roux', 'Sucre roux', 'kg', 'Man', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-roux', 'Sucre roux', 'kg', 'Korhogo', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-blanc', 'Sucre blanc', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-blanc', 'Sucre blanc', 'kg', 'Bouaké', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-blanc', 'Sucre blanc', 'kg', 'Yamoussoukro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-blanc', 'Sucre blanc', 'kg', 'Man', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'sucre-blanc', 'Sucre blanc', 'kg', 'Korhogo', 900, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'lait-liquide', 'Lait liquide (litre)', 'litre', 'San-Pédro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'lait-liquide', 'Lait liquide (litre)', 'litre', 'Yamoussoukro', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'lait-liquide', 'Lait liquide (litre)', 'litre', 'Korhogo', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gingembre', 'Gingembre', 'kg', 'Abidjan', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gingembre', 'Gingembre', 'kg', 'San-Pédro', 3500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gingembre', 'Gingembre', 'kg', 'Bouaké', 3500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gingembre', 'Gingembre', 'kg', 'Yamoussoukro', 3500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gingembre', 'Gingembre', 'kg', 'Man', 3000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'gingembre', 'Gingembre', 'kg', 'Korhogo', 3500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'bissap', 'Feuille de bissap', 'kg', 'Abidjan', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'bissap', 'Feuille de bissap', 'kg', 'San-Pédro', 600, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'bissap', 'Feuille de bissap', 'kg', 'Yamoussoukro', 1800, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'bissap', 'Feuille de bissap', 'kg', 'Man', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'bissap', 'Feuille de bissap', 'kg', 'Korhogo', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomi', 'Tomi', 'kg', 'Abidjan', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomi', 'Tomi', 'kg', 'San-Pédro', 1000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomi', 'Tomi', 'kg', 'Bouaké', 1200, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomi', 'Tomi', 'kg', 'Yamoussoukro', 1500, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)'),
  ('moyen', 'tomi', 'Tomi', 'kg', 'Korhogo', 2000, '2026-09-28', '2026-10-05', 'C''est combien ? (OCPV · CNLVC · ministère du Commerce)')
ON CONFLICT (type, produit_id, unite, ville, date_debut) DO NOTHING;

-- ─── 2. MOMENT DU TRAJET ──────────────────────────────────
ALTER TABLE public.signalements
  ADD COLUMN IF NOT EXISTS moment TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE public.signalements DROP CONSTRAINT IF EXISTS signalements_moment_check;
ALTER TABLE public.signalements ADD CONSTRAINT signalements_moment_check
  CHECK (moment IN ('normal', 'pointe', 'nuit', 'pluie'));

-- ─── 3. LIMITES ANTI-ABUS ─────────────────────────────────
-- Un prix n'est « vérifié » que si 3 comptes différents le constatent.
-- Ces limites empêchent un même compte de peser plus qu'un citoyen normal.
CREATE OR REPLACE FUNCTION public.signalements_anti_abus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Renvoi d'un signalement déjà enregistré (nouvelle tentative de synchronisation)
  IF EXISTS (SELECT 1 FROM public.signalements WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- 30 signalements au plus par compte et par 24 heures
  IF (SELECT COUNT(*) FROM public.signalements
      WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '24 hours') >= 30 THEN
    RAISE EXCEPTION 'Limite quotidienne de signalements atteinte';
  END IF;

  -- Un seul signalement du même produit au même endroit par demi-journée
  IF EXISTS (
    SELECT 1 FROM public.signalements
    WHERE user_id = NEW.user_id
      AND produit_id = NEW.produit_id
      AND commune = NEW.commune
      AND LOWER(BTRIM(nom_lieu)) = LOWER(BTRIM(NEW.nom_lieu))
      AND created_at > NOW() - INTERVAL '12 hours'
  ) THEN
    RAISE EXCEPTION 'Produit déjà signalé à cet endroit aujourd''hui';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_signalements_anti_abus ON public.signalements;
CREATE TRIGGER trigger_signalements_anti_abus
  BEFORE INSERT ON public.signalements
  FOR EACH ROW EXECUTE FUNCTION public.signalements_anti_abus();

CREATE OR REPLACE FUNCTION public.validations_anti_abus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.validations WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- 60 votes au plus par compte et par 24 heures
  IF (SELECT COUNT(*) FROM public.validations
      WHERE user_id = NEW.user_id AND date_vote > NOW() - INTERVAL '24 hours') >= 60 THEN
    RAISE EXCEPTION 'Limite quotidienne de votes atteinte';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validations_anti_abus ON public.validations;
CREATE TRIGGER trigger_validations_anti_abus
  BEFORE INSERT ON public.validations
  FOR EACH ROW EXECUTE FUNCTION public.validations_anti_abus();

-- ─── 4. VÉRIFICATION ──────────────────────────────────────
-- SELECT ville, COUNT(*) FROM public.prix_reference GROUP BY ville ORDER BY ville;
--   → 6 villes
-- ============================================================
-- FIN DE MIGRATION
-- ============================================================
