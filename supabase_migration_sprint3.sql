-- ============================================================
-- MIGRATION SUPABASE — PrixCI
-- Version : Sprint 3 → Sprint 4
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ⚠ Exécuter dans l'ordre. Chaque bloc est idempotent.
-- ============================================================

-- ─── 1. Ajout colonnes type_lieu et nom_lieu ──────────────
ALTER TABLE public.signalements
  ADD COLUMN IF NOT EXISTS type_lieu TEXT NOT NULL DEFAULT 'autre',
  ADD COLUMN IF NOT EXISTS nom_lieu  TEXT NOT NULL DEFAULT '';

-- Contrainte sur les valeurs autorisées
ALTER TABLE public.signalements
  DROP CONSTRAINT IF EXISTS signalements_type_lieu_check;

ALTER TABLE public.signalements
  ADD CONSTRAINT signalements_type_lieu_check
  CHECK (type_lieu IN (
    'marche_traditionnel',
    'supermarche',
    'boutique_quartier',
    'vendeur_ambulant',
    'bord_route',
    'station_service',
    'autre'
  ));

-- ─── 2. Ajout colonnes compteurs validation ───────────────
-- (si elles n'existent pas déjà depuis le schéma initial)
ALTER TABLE public.signalements
  ADD COLUMN IF NOT EXISTS nb_confirmations INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_contestations INTEGER NOT NULL DEFAULT 0;

-- ─── 3. Index de performance sur type_lieu ────────────────
CREATE INDEX IF NOT EXISTS idx_signalements_type_lieu
  ON public.signalements(type_lieu);

CREATE INDEX IF NOT EXISTS idx_signalements_nom_lieu
  ON public.signalements(nom_lieu)
  WHERE nom_lieu != '';

-- ─── 4. Mise à jour de la vue prix_agreges ────────────────
-- Recréer la vue avec les nouvelles colonnes
DROP VIEW IF EXISTS public.prix_agreges;

CREATE OR REPLACE VIEW public.prix_agreges AS
SELECT
  produit_id,
  produit_nom,
  commune,
  type_lieu,
  nom_lieu,
  unite,
  ROUND(AVG(prix), 0)           AS prix_moyen,
  MIN(prix)                     AS prix_min,
  MAX(prix)                     AS prix_max,
  COUNT(*)                      AS nb_signalements,
  SUM(nb_confirmations)         AS nb_confirmations_total,
  SUM(nb_contestations)         AS nb_contestations_total,
  MAX(date_signalement)         AS derniere_maj,
  ROUND(AVG(score_fiabilite), 1) AS score_fiabilite_moyen
FROM public.signalements
WHERE
  date_signalement > NOW() - INTERVAL '30 days'
  AND score_fiabilite >= 30
GROUP BY produit_id, produit_nom, commune, type_lieu, nom_lieu, unite
ORDER BY nb_signalements DESC;

-- ─── 5. Vue comparative par point de vente ────────────────
-- Nouvelle vue pour l'écran Explorer / comparaison
CREATE OR REPLACE VIEW public.comparaison_par_lieu AS
SELECT
  produit_id,
  produit_nom,
  commune,
  type_lieu,
  CASE
    WHEN nom_lieu != '' THEN nom_lieu
    ELSE type_lieu
  END                           AS nom_lieu_affiche,
  unite,
  ROUND(AVG(prix), 0)           AS prix_moyen,
  MIN(prix)                     AS prix_min,
  MAX(prix)                     AS prix_max,
  COUNT(*)                      AS nb_signalements,
  SUM(nb_confirmations)         AS nb_confirmations,
  SUM(nb_contestations)         AS nb_contestations,
  MAX(date_signalement)         AS derniere_maj,
  ROUND(AVG(score_fiabilite), 1) AS score_fiabilite_moyen,
  -- Rang du moins cher au plus cher dans la commune
  RANK() OVER (
    PARTITION BY produit_id, commune, unite
    ORDER BY AVG(prix) ASC
  )                             AS rang_prix
FROM public.signalements
WHERE
  date_signalement > NOW() - INTERVAL '30 days'
  AND score_fiabilite >= 30
GROUP BY produit_id, produit_nom, commune, type_lieu, nom_lieu, unite;

-- ─── 6. Mise à jour trigger score_fiabilite ───────────────
-- Trigger pour recalculer score_fiabilite lors d'un vote
CREATE OR REPLACE FUNCTION public.maj_score_signalement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.signalements
  SET
    nb_confirmations = (
      SELECT COUNT(*) FROM public.validations
      WHERE signalement_id = NEW.signalement_id AND vote = 'confirme'
    ),
    nb_contestations = (
      SELECT COUNT(*) FROM public.validations
      WHERE signalement_id = NEW.signalement_id AND vote = 'conteste'
    ),
    score_fiabilite = LEAST(100, GREATEST(0,
      50 + (
        SELECT COUNT(*) FILTER (WHERE vote = 'confirme') -
               COUNT(*) FILTER (WHERE vote = 'conteste') * 1.6
        FROM public.validations
        WHERE signalement_id = NEW.signalement_id
      ) * 5
    ))
  WHERE id = NEW.signalement_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_maj_score ON public.validations;

CREATE TRIGGER trigger_maj_score
  AFTER INSERT ON public.validations
  FOR EACH ROW
  EXECUTE FUNCTION public.maj_score_signalement();

-- ─── 7. Mise à jour trigger score utilisateur ─────────────
CREATE OR REPLACE FUNCTION public.maj_score_user_apres_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- Récompenser le votant (+1 pt)
  UPDATE public.users
  SET score_confiance = LEAST(100, score_confiance + 1)
  WHERE id = NEW.user_id;

  -- Pénaliser ou récompenser l'auteur du signalement
  UPDATE public.users
  SET score_confiance = CASE
    WHEN NEW.vote = 'confirme' THEN LEAST(100, score_confiance + 3)
    ELSE GREATEST(0, score_confiance - 5)
  END
  WHERE id = (
    SELECT user_id FROM public.signalements WHERE id = NEW.signalement_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_score_user ON public.validations;

CREATE TRIGGER trigger_score_user
  AFTER INSERT ON public.validations
  FOR EACH ROW
  EXECUTE FUNCTION public.maj_score_user_apres_vote();

-- ─── 8. Vérification post-migration ──────────────────────
-- Exécuter ces SELECTs pour valider que tout est en ordre :

-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'signalements'
-- ORDER BY ordinal_position;

-- SELECT COUNT(*) FROM public.signalements WHERE type_lieu IS NULL;
-- → Doit retourner 0

-- SELECT * FROM public.comparaison_par_lieu LIMIT 5;
-- → Doit retourner des lignes si des signalements existent

-- ============================================================
-- FIN DE MIGRATION
-- ============================================================
