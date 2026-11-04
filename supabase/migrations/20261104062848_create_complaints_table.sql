/*
# Create complaints table with geographic indexes and security

## Plain-English summary
Creates the table where citizen pollution complaints are stored. Each complaint has a GPS location, a river name, an address, a pollution category, a status and a timestamp. Citizens can submit complaints and see only their own. Officials can see all complaints and update their status.

## New objects
- Table `complaints`:
  - `user_id` (the citizen who submitted it, defaults to the signed-in user)
  - `category`: industrial_discharge, sewage, plastic_waste, oil_spill, chemical, other
  - `status`: pending, in_progress, resolved
  - `river_name`, `address`, `district`, `state`, `description`
  - `latitude`, `longitude` (GPS coordinates)
  - `geom` (a map point generated automatically from the coordinates)
  - `created_at`, `updated_at`
- Indexes: spatial index on `geom`, plus indexes on created_at, status, category, river_name, district and user_id.
- Trigger that refreshes `updated_at` on every change.
- Realtime: the table is published so the government dashboard receives new complaints live.

## Security
- Row Level Security enabled.
- Citizens: can insert their own complaints and read only their own.
- Officials (official, super_admin): can read all complaints.
- Only officials can change status, and only the status column is writable.
- Nobody can delete complaints through the app.

## Important notes
1. Latitude and longitude are validated with check constraints.
2. The migration is idempotent and safe to re-run.
*/

CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('industrial_discharge', 'sewage', 'plastic_waste', 'oil_spill', 'chemical', 'other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  river_name text NOT NULL CHECK (char_length(btrim(river_name)) BETWEEN 1 AND 120),
  address text NOT NULL CHECK (char_length(btrim(address)) BETWEEN 1 AND 300),
  district text NOT NULL CHECK (char_length(btrim(district)) BETWEEN 1 AND 120),
  state text NOT NULL CHECK (char_length(btrim(state)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  geom extensions.geometry(Point, 4326)
    GENERATED ALWAYS AS (extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS complaints_geom_idx ON public.complaints USING GIST (geom);
CREATE INDEX IF NOT EXISTS complaints_created_at_idx ON public.complaints (created_at DESC);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON public.complaints (status);
CREATE INDEX IF NOT EXISTS complaints_category_idx ON public.complaints (category);
CREATE INDEX IF NOT EXISTS complaints_river_name_idx ON public.complaints (river_name);
CREATE INDEX IF NOT EXISTS complaints_district_idx ON public.complaints (district);
CREATE INDEX IF NOT EXISTS complaints_user_id_idx ON public.complaints (user_id);

CREATE OR REPLACE FUNCTION public.touch_complaint_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS complaints_touch_updated_at ON public.complaints;
CREATE TRIGGER complaints_touch_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.touch_complaint_updated_at();

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.complaints TO authenticated;
GRANT UPDATE (status) ON public.complaints TO authenticated;

DROP POLICY IF EXISTS "complaints_select_own_or_official" ON public.complaints;
CREATE POLICY "complaints_select_own_or_official" ON public.complaints FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_official());

DROP POLICY IF EXISTS "complaints_insert_own" ON public.complaints;
CREATE POLICY "complaints_insert_own" ON public.complaints FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "complaints_update_official" ON public.complaints;
CREATE POLICY "complaints_update_official" ON public.complaints FOR UPDATE
  TO authenticated USING (public.is_official()) WITH CHECK (public.is_official());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'complaints'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
  END IF;
END $$;
