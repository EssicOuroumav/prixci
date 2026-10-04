-- ============================================================
-- SCHÉMA SUPABASE — PRIXCI
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── Table users ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  pseudonyme TEXT NOT NULL,
  score_confiance INTEGER NOT NULL DEFAULT 50 CHECK (score_confiance >= 0 AND score_confiance <= 100),
  nb_signalements INTEGER NOT NULL DEFAULT 0,
  nb_validations_recues INTEGER NOT NULL DEFAULT 0,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table signalements ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signalements (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  produit_id TEXT NOT NULL,
  produit_nom TEXT NOT NULL,
  categorie TEXT NOT NULL CHECK (categorie IN ('alimentation', 'transport')),
  sous_categorie TEXT NOT NULL,
  prix NUMERIC(10, 0) NOT NULL CHECK (prix > 0),
  unite TEXT NOT NULL,
  commune TEXT NOT NULL,
  quartier TEXT DEFAULT '',
  type_lieu TEXT NOT NULL DEFAULT 'autre',
  nom_lieu TEXT NOT NULL DEFAULT '',
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  date_signalement TIMESTAMPTZ NOT NULL,
  score_fiabilite NUMERIC(5, 1) NOT NULL DEFAULT 50,
  nb_confirmations INTEGER NOT NULL DEFAULT 0,
  nb_contestations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table validations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.validations (
  id TEXT PRIMARY KEY,
  signalement_id TEXT NOT NULL REFERENCES public.signalements(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  vote TEXT NOT NULL CHECK (vote IN ('confirme', 'conteste')),
  date_vote TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un utilisateur ne peut voter qu'une fois par signalement
  UNIQUE (signalement_id, user_id)
);

-- ─── Index de performance ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_signalements_commune ON public.signalements(commune);
CREATE INDEX IF NOT EXISTS idx_signalements_produit ON public.signalements(produit_id);
CREATE INDEX IF NOT EXISTS idx_signalements_date ON public.signalements(date_signalement DESC);
CREATE INDEX IF NOT EXISTS idx_signalements_score ON public.signalements(score_fiabilite);
CREATE INDEX IF NOT EXISTS idx_validations_signalement ON public.validations(signalement_id);

-- ─── Row Level Security (RLS) ─────────────────────────────
-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signalements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;

-- Users : lecture publique, écriture uniquement sur son propre profil
CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Signalements : lecture publique (score >= 30), écriture authentifiée
CREATE POLICY "signalements_select_public" ON public.signalements
  FOR SELECT USING (score_fiabilite >= 30);

CREATE POLICY "signalements_insert_auth" ON public.signalements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid()::text = user_id::text);

-- Validations : lecture publique, écriture authentifiée
CREATE POLICY "validations_select_all" ON public.validations FOR SELECT USING (true);
CREATE POLICY "validations_insert_auth" ON public.validations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- ─── Vue agrégée pour performance ─────────────────────────
CREATE OR REPLACE VIEW public.prix_agreges AS
SELECT
  produit_id,
  produit_nom,
  commune,
  unite,
  ROUND(AVG(prix), 0) AS prix_moyen,
  MIN(prix) AS prix_min,
  MAX(prix) AS prix_max,
  COUNT(*) AS nb_signalements,
  MAX(date_signalement) AS derniere_maj
FROM public.signalements
WHERE
  date_signalement > NOW() - INTERVAL '30 days'
  AND score_fiabilite >= 30
GROUP BY produit_id, produit_nom, commune, unite
ORDER BY nb_signalements DESC;
