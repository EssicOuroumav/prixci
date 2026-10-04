-- ============================================================
-- MIGRATION SUPABASE — PrixCI v2
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Prérequis : supabase_schema.sql puis supabase_migration_sprint3.sql
-- Le script est idempotent : il peut être relancé sans risque.
-- Il ne supprime aucune donnée.
--
-- Contenu :
--   1. Tables enseignes et prix_officiels (absentes des scripts précédents)
--   2. Droits d'accès : une enseigne n'est modifiable que par son propriétaire
--   3. Scores calculés par le serveur uniquement (plus de triche possible)
--   4. Déclencheurs de vote corrigés (ils étaient bloqués par les droits d'accès)
--   5. Signalement de contenus abusifs
-- ============================================================

-- ─── 0. DROITS DE BASE SUR LES TABLES EXISTANTES ──────────
-- Sur ce projet, les tables créées par script ne sont pas ouvertes
-- automatiquement aux rôles de l'application : sans ces lignes, toute lecture
-- répond « permission denied ». Les droits par ligne (RLS) continuent de
-- filtrer ce que chacun peut voir ou écrire.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.users, public.signalements, public.validations
  TO anon, authenticated;
GRANT INSERT ON public.users, public.signalements, public.validations
  TO authenticated;

-- ─── 1. ENSEIGNES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enseignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID DEFAULT auth.uid(),
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  commune TEXT NOT NULL,
  quartier TEXT NOT NULL DEFAULT '',
  adresse TEXT NOT NULL DEFAULT '',
  telephone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'actif',
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la table existait déjà sans ces colonnes
ALTER TABLE public.enseignes
  ADD COLUMN IF NOT EXISTS owner_id UUID DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS quartier TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS adresse TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telephone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'actif',
  ADD COLUMN IF NOT EXISTS date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.enseignes DROP CONSTRAINT IF EXISTS enseignes_type_check;
ALTER TABLE public.enseignes ADD CONSTRAINT enseignes_type_check
  CHECK (type IN ('supermarche', 'boutique', 'pharmacie', 'marche'));

ALTER TABLE public.enseignes DROP CONSTRAINT IF EXISTS enseignes_statut_check;
ALTER TABLE public.enseignes ADD CONSTRAINT enseignes_statut_check
  CHECK (statut IN ('en_attente', 'actif', 'suspendu'));

ALTER TABLE public.enseignes DROP CONSTRAINT IF EXISTS enseignes_nom_check;
ALTER TABLE public.enseignes ADD CONSTRAINT enseignes_nom_check
  CHECK (char_length(btrim(nom)) BETWEEN 2 AND 80);

CREATE INDEX IF NOT EXISTS idx_enseignes_commune ON public.enseignes(commune);
CREATE INDEX IF NOT EXISTS idx_enseignes_owner ON public.enseignes(owner_id);

-- ─── 2. PRIX OFFICIELS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prix_officiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseigne_id UUID NOT NULL REFERENCES public.enseignes(id) ON DELETE CASCADE,
  produit_id TEXT NOT NULL,
  produit_nom TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'alimentation',
  prix NUMERIC(10, 0) NOT NULL,
  unite TEXT NOT NULL,
  date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prix_officiels DROP CONSTRAINT IF EXISTS prix_officiels_prix_check;
ALTER TABLE public.prix_officiels ADD CONSTRAINT prix_officiels_prix_check
  CHECK (prix > 0 AND prix <= 500000);

ALTER TABLE public.prix_officiels DROP CONSTRAINT IF EXISTS prix_officiels_categorie_check;
ALTER TABLE public.prix_officiels ADD CONSTRAINT prix_officiels_categorie_check
  CHECK (categorie IN ('alimentation', 'transport'));

-- Un seul prix par enseigne, produit et unité (utilisé par l'application pour la mise à jour)
CREATE UNIQUE INDEX IF NOT EXISTS prix_officiels_enseigne_produit_unite_key
  ON public.prix_officiels(enseigne_id, produit_id, unite);
CREATE INDEX IF NOT EXISTS idx_prix_officiels_produit ON public.prix_officiels(produit_id);

-- ─── 3. DROITS D'ACCÈS : ENSEIGNES ET PRIX OFFICIELS ──────
ALTER TABLE public.enseignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prix_officiels ENABLE ROW LEVEL SECURITY;

-- Corrige « permission denied for table enseignes »
GRANT SELECT ON public.enseignes, public.prix_officiels TO anon, authenticated;

-- L'application ne peut écrire que les champs descriptifs : le propriétaire
-- et le statut sont fixés par le serveur.
REVOKE INSERT, UPDATE, DELETE ON public.enseignes FROM anon, authenticated;
GRANT INSERT (nom, type, commune, quartier, adresse, telephone, email)
  ON public.enseignes TO authenticated;
GRANT UPDATE (nom, type, commune, quartier, adresse, telephone, email)
  ON public.enseignes TO authenticated;
GRANT DELETE ON public.enseignes TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.prix_officiels FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.prix_officiels TO authenticated;

DROP POLICY IF EXISTS "enseignes_select" ON public.enseignes;
CREATE POLICY "enseignes_select" ON public.enseignes
  FOR SELECT USING (statut = 'actif' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "enseignes_insert_own" ON public.enseignes;
CREATE POLICY "enseignes_insert_own" ON public.enseignes
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "enseignes_update_own" ON public.enseignes;
CREATE POLICY "enseignes_update_own" ON public.enseignes
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "enseignes_delete_own" ON public.enseignes;
CREATE POLICY "enseignes_delete_own" ON public.enseignes
  FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "prix_officiels_select" ON public.prix_officiels;
CREATE POLICY "prix_officiels_select" ON public.prix_officiels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "prix_officiels_insert_owner" ON public.prix_officiels;
CREATE POLICY "prix_officiels_insert_owner" ON public.prix_officiels
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.enseignes e
    WHERE e.id = enseigne_id AND e.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "prix_officiels_update_owner" ON public.prix_officiels;
CREATE POLICY "prix_officiels_update_owner" ON public.prix_officiels
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.enseignes e
    WHERE e.id = enseigne_id AND e.owner_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.enseignes e
    WHERE e.id = enseigne_id AND e.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "prix_officiels_delete_owner" ON public.prix_officiels;
CREATE POLICY "prix_officiels_delete_owner" ON public.prix_officiels
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.enseignes e
    WHERE e.id = enseigne_id AND e.owner_id = auth.uid()
  ));

-- ─── 4. PROFILS : SCORE FIXÉ PAR LE SERVEUR ───────────────
-- Avant : un utilisateur pouvait modifier lui-même son score de confiance.
REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT UPDATE (pseudonyme) ON public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.users_valeurs_initiales()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.score_confiance := 50;
  NEW.nb_signalements := 0;
  NEW.nb_validations_recues := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_users_valeurs_initiales ON public.users;
CREATE TRIGGER trigger_users_valeurs_initiales
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_valeurs_initiales();

-- ─── 5. SIGNALEMENTS : COMPTEURS FIXÉS PAR LE SERVEUR ─────
REVOKE UPDATE, DELETE ON public.signalements FROM anon, authenticated;

ALTER TABLE public.signalements DROP CONSTRAINT IF EXISTS signalements_prix_max_check;
ALTER TABLE public.signalements ADD CONSTRAINT signalements_prix_max_check
  CHECK (prix <= 500000) NOT VALID;

-- Nouveau type de lieu pour les transports
ALTER TABLE public.signalements DROP CONSTRAINT IF EXISTS signalements_type_lieu_check;
ALTER TABLE public.signalements ADD CONSTRAINT signalements_type_lieu_check
  CHECK (type_lieu IN (
    'marche_traditionnel', 'supermarche', 'boutique_quartier', 'vendeur_ambulant',
    'bord_route', 'station_service', 'gare_routiere', 'autre'
  ));

-- L'auteur voit toujours ses propres signalements, même masqués
DROP POLICY IF EXISTS "signalements_select_public" ON public.signalements;
CREATE POLICY "signalements_select_public" ON public.signalements
  FOR SELECT USING (score_fiabilite >= 30 OR auth.uid() = user_id);

-- Règle unique de fiabilité (identique à services/scoring.ts) :
--   départ = 60 % du score de l'auteur, +5 par confirmation, -8 par contestation
CREATE OR REPLACE FUNCTION public.signalements_valeurs_initiales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score_auteur INTEGER;
BEGIN
  SELECT score_confiance INTO score_auteur FROM public.users WHERE id = NEW.user_id;
  NEW.score_fiabilite := ROUND(COALESCE(score_auteur, 50) * 0.6);
  NEW.nb_confirmations := 0;
  NEW.nb_contestations := 0;
  NEW.date_signalement := LEAST(NEW.date_signalement, NOW());
  NEW.created_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_signalements_valeurs_initiales ON public.signalements;
CREATE TRIGGER trigger_signalements_valeurs_initiales
  BEFORE INSERT ON public.signalements
  FOR EACH ROW EXECUTE FUNCTION public.signalements_valeurs_initiales();

CREATE OR REPLACE FUNCTION public.signalements_compteur_auteur()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET nb_signalements = nb_signalements + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_signalements_compteur_auteur ON public.signalements;
CREATE TRIGGER trigger_signalements_compteur_auteur
  AFTER INSERT ON public.signalements
  FOR EACH ROW EXECUTE FUNCTION public.signalements_compteur_auteur();

-- ─── 6. VOTES ─────────────────────────────────────────────
REVOKE UPDATE, DELETE ON public.validations FROM anon, authenticated;

-- Interdit de voter sur son propre signalement
CREATE OR REPLACE FUNCTION public.validations_controle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.signalements
    WHERE id = NEW.signalement_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Vote interdit sur son propre signalement';
  END IF;
  NEW.date_vote := LEAST(NEW.date_vote, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validations_controle ON public.validations;
CREATE TRIGGER trigger_validations_controle
  BEFORE INSERT ON public.validations
  FOR EACH ROW EXECUTE FUNCTION public.validations_controle();

-- Les deux anciens déclencheurs s'exécutaient avec les droits du votant :
-- les droits d'accès bloquaient leurs mises à jour sans message d'erreur.
-- Ils sont remplacés par une seule fonction exécutée avec les droits du serveur.
DROP TRIGGER IF EXISTS trigger_maj_score ON public.validations;
DROP TRIGGER IF EXISTS trigger_score_user ON public.validations;
DROP FUNCTION IF EXISTS public.maj_score_signalement();
DROP FUNCTION IF EXISTS public.maj_score_user_apres_vote();

CREATE OR REPLACE FUNCTION public.validations_appliquer_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auteur UUID;
BEGIN
  IF NEW.vote = 'confirme' THEN
    UPDATE public.signalements
    SET nb_confirmations = nb_confirmations + 1,
        score_fiabilite = LEAST(100, score_fiabilite + 5)
    WHERE id = NEW.signalement_id
    RETURNING user_id INTO auteur;
  ELSE
    UPDATE public.signalements
    SET nb_contestations = nb_contestations + 1,
        score_fiabilite = GREATEST(0, score_fiabilite - 8)
    WHERE id = NEW.signalement_id
    RETURNING user_id INTO auteur;
  END IF;

  -- Le votant gagne 1 point
  UPDATE public.users
  SET score_confiance = LEAST(100, score_confiance + 1)
  WHERE id = NEW.user_id;

  -- L'auteur gagne 3 points par confirmation, en perd 5 par contestation
  UPDATE public.users
  SET score_confiance = CASE
        WHEN NEW.vote = 'confirme' THEN LEAST(100, score_confiance + 3)
        ELSE GREATEST(0, score_confiance - 5)
      END,
      nb_validations_recues = nb_validations_recues
        + CASE WHEN NEW.vote = 'confirme' THEN 1 ELSE 0 END
  WHERE id = auteur;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validations_appliquer_vote ON public.validations;
CREATE TRIGGER trigger_validations_appliquer_vote
  AFTER INSERT ON public.validations
  FOR EACH ROW EXECUTE FUNCTION public.validations_appliquer_vote();

-- ─── 7. SIGNALEMENT DE CONTENUS ABUSIFS ───────────────────
-- Les lignes se consultent et se traitent dans le Table Editor de Supabase.
-- Pour masquer un signalement abusif : mettre son score_fiabilite à 0.
CREATE TABLE IF NOT EXISTS public.abus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur_id UUID NOT NULL DEFAULT auth.uid(),
  cible_type TEXT NOT NULL CHECK (cible_type IN ('signalement', 'enseigne')),
  cible_id TEXT NOT NULL,
  motif TEXT NOT NULL CHECK (char_length(motif) BETWEEN 1 AND 300),
  traite BOOLEAN NOT NULL DEFAULT FALSE,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auteur_id, cible_type, cible_id)
);

ALTER TABLE public.abus ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.abus FROM anon, authenticated;
GRANT INSERT (cible_type, cible_id, motif) ON public.abus TO authenticated;

DROP POLICY IF EXISTS "abus_insert_own" ON public.abus;
CREATE POLICY "abus_insert_own" ON public.abus
  FOR INSERT WITH CHECK (auteur_id = auth.uid());

-- ─── 8. VÉRIFICATION ──────────────────────────────────────
-- Après exécution, ces requêtes doivent toutes répondre sans erreur :
--
-- SELECT COUNT(*) FROM public.enseignes;
-- SELECT COUNT(*) FROM public.prix_officiels;
-- SELECT tgname FROM pg_trigger
--   WHERE tgrelid = 'public.validations'::regclass AND NOT tgisinternal;
--   → trigger_validations_controle, trigger_validations_appliquer_vote
--
-- ============================================================
-- FIN DE MIGRATION
-- ============================================================
