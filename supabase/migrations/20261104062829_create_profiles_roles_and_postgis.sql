/*
# Enable PostGIS and create user profiles with roles

## Plain-English summary
Turns on geographic (map) support for the database and creates a profile record for every account. Each profile has a role that decides what the person can see: citizens report pollution, officials see the hotspot dashboard, and super admins can also change hotspot thresholds.

## New objects
- Extension `postgis` (installed in the `extensions` schema) for geographic queries.
- Table `profiles`: one row per account with `full_name` and `role` (`citizen`, `official`, `super_admin`). New accounts always start as `citizen`.
- Function `handle_new_user`: automatically creates the profile when someone signs up.
- Helper functions `current_app_role`, `is_official`, `is_super_admin` used by security rules elsewhere.

## Security
- Row Level Security enabled on `profiles`.
- Users can read their own profile and change only their `full_name`.
- Users cannot change their own `role` (column-level permission withholds it).
- Helper and trigger functions are not callable by anonymous visitors.

## Important notes
1. Officials and super admins are assigned by an administrator in the database, never through the app.
2. The migration is idempotent and safe to re-run.
*/

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 120),
  role text NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'official', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_official()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() IN ('official', 'super_admin'), false)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() = 'super_admin', false)
$$;

REVOKE EXECUTE ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_official() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_official() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
