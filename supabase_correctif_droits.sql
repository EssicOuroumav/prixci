-- ============================================================
-- CORRECTIF — droits de base manquants (PrixCI)
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor
-- Sans risque : n'ajoute que des droits, ne touche à aucune donnée.
-- (Ce bloc est aussi inclus au début de supabase_migration_v2.sql.)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.users, public.signalements, public.validations
  TO anon, authenticated;
GRANT INSERT ON public.users, public.signalements, public.validations
  TO authenticated;
