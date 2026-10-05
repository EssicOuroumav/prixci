-- ============================================================
-- CORRECTIF — envoi des votes refusé (PrixCI)
-- Symptôme : « permission denied for table signalements » quand un
-- utilisateur confirme ou conteste un prix.
-- Cause : un ancien déclencheur (trigger_update_visibility), exécuté avec les
-- droits de l'utilisateur, était encore présent sur la table des votes.
--
-- À exécuter dans : Supabase Dashboard > SQL Editor.
-- Sans risque : ne touche à aucune donnée, peut être relancé.
-- Le résultat affiché à la fin liste les déclencheurs de la table des votes :
-- toutes les lignes doivent indiquer « droits_serveur = true ».
-- ============================================================

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
-- Ancien mécanisme « visible après 10 confirmations » : son déclencheur
-- modifiait la table signalements avec les droits de l'utilisateur, ce qui
-- faisait refuser chaque vote. La règle est désormais gérée par l'application
-- (3 constats concordants). Les colonnes visible et nb_confirmations_requis
-- restent en place, sans effet.
DROP TRIGGER IF EXISTS trigger_update_visibility ON public.validations;
DROP FUNCTION IF EXISTS public.update_signalement_visibility();

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


-- Les fonctions de vote appartiennent au propriétaire des tables
ALTER FUNCTION public.validations_controle() OWNER TO postgres;
ALTER FUNCTION public.validations_appliquer_vote() OWNER TO postgres;
ALTER FUNCTION public.validations_anti_abus() OWNER TO postgres;
ALTER FUNCTION public.signalements_valeurs_initiales() OWNER TO postgres;
ALTER FUNCTION public.signalements_compteur_auteur() OWNER TO postgres;
ALTER FUNCTION public.signalements_anti_abus() OWNER TO postgres;

-- ─── Contrôle : état des déclencheurs ─────────────────────
SELECT
  c.relname  AS table_concernee,
  t.tgname   AS declencheur,
  p.proname  AS fonction,
  p.prosecdef AS droits_serveur,
  pg_get_userbyid(p.proowner) AS proprietaire
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname IN ('validations', 'signalements')
  AND c.relnamespace = 'public'::regnamespace
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
