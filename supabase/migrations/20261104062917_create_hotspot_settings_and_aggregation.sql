/*
# Hotspot settings, boundaries and geographic aggregation functions

## Plain-English summary
Adds the rules that turn complaints into hotspots and the database functions the map and dashboard use. Complaints are grouped into square grid cells on the map (the cell size is configurable). Each cell is classified as High (20+ complaints), Medium (10-19) or Low (1-9). Super admins can change these thresholds and the cell size.

## New objects
- Table `hotspot_settings` (single row): `high_min` (20), `medium_min` (10), `low_min` (1), `grid_size_m` (1000 metres).
- Table `admin_boundaries`: state and district outlines (PostGIS polygons). Empty until boundary data is loaded.
- Function `filter_complaints(...)`: the shared filter used by every analytics function (date range, categories, statuses, district, river).
- Function `get_hotspots(...)`: one row per grid cell with its hotspot ID, classification, counts, most common category and district, latest complaint and centre point.
- Function `get_hotspot_complaints(cell_x, cell_y, ...)`: complaints inside one hotspot.
- Function `get_complaint_points(...)`: complaints for map markers and heatmap.
- Function `get_dashboard_analytics(...)`: totals, top rivers, category distribution, monthly trend and unresolved complaints by district.
- Function `get_filter_options()`: distinct districts and river names for the filter menus.
- Function `get_boundaries()`: boundary outlines as GeoJSON.

## Security
- Every aggregation function returns nothing unless the caller is an official or super admin.
- `hotspot_settings`: officials can read; only super admins can update the threshold columns.
- `admin_boundaries`: readable only by officials.

## Important notes
1. Analytics use SECURITY INVOKER, so row-level security still applies.
2. Grid aggregation uses PostGIS coordinate transforms (Web Mercator, metres) so cell sizes are real distances.
3. The migration is idempotent and safe to re-run.
*/

CREATE TABLE IF NOT EXISTS public.hotspot_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  high_min integer NOT NULL DEFAULT 20 CHECK (high_min >= 1),
  medium_min integer NOT NULL DEFAULT 10 CHECK (medium_min >= 1),
  low_min integer NOT NULL DEFAULT 1 CHECK (low_min >= 1),
  grid_size_m integer NOT NULL DEFAULT 1000 CHECK (grid_size_m BETWEEN 100 AND 10000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT hotspot_thresholds_ordered CHECK (high_min > medium_min AND medium_min > low_min)
);

INSERT INTO public.hotspot_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.hotspot_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.hotspot_settings TO authenticated;
GRANT UPDATE (high_min, medium_min, low_min, grid_size_m, updated_at, updated_by) ON public.hotspot_settings TO authenticated;

DROP POLICY IF EXISTS "hotspot_settings_select_official" ON public.hotspot_settings;
CREATE POLICY "hotspot_settings_select_official" ON public.hotspot_settings FOR SELECT
  TO authenticated USING (public.is_official());

DROP POLICY IF EXISTS "hotspot_settings_update_super_admin" ON public.hotspot_settings;
CREATE POLICY "hotspot_settings_update_super_admin" ON public.hotspot_settings FOR UPDATE
  TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin() AND updated_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.admin_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boundary_level text NOT NULL CHECK (boundary_level IN ('state', 'district')),
  name text NOT NULL,
  state text,
  geom extensions.geometry(MultiPolygon, 4326) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_boundaries_geom_idx ON public.admin_boundaries USING GIST (geom);

ALTER TABLE public.admin_boundaries ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.admin_boundaries TO authenticated;

DROP POLICY IF EXISTS "admin_boundaries_select_official" ON public.admin_boundaries;
CREATE POLICY "admin_boundaries_select_official" ON public.admin_boundaries FOR SELECT
  TO authenticated USING (public.is_official());

CREATE OR REPLACE FUNCTION public.filter_complaints(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_river text DEFAULT NULL
)
RETURNS SETOF public.complaints
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT c.*
  FROM public.complaints c
  WHERE (p_date_from IS NULL OR c.created_at >= p_date_from)
    AND (p_date_to IS NULL OR c.created_at < p_date_to)
    AND (p_categories IS NULL OR c.category = ANY (p_categories))
    AND (p_statuses IS NULL OR c.status = ANY (p_statuses))
    AND (p_district IS NULL OR c.district = p_district)
    AND (p_river IS NULL OR c.river_name = p_river)
$$;

CREATE OR REPLACE FUNCTION public.get_hotspots(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_river text DEFAULT NULL
)
RETURNS TABLE (
  hotspot_id text,
  cell_x integer,
  cell_y integer,
  classification text,
  complaint_count integer,
  pending_count integer,
  resolved_count integer,
  top_category text,
  top_district text,
  rivers text[],
  latest_reported_at timestamptz,
  center_lat double precision,
  center_lng double precision,
  grid_size_m integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH settings AS (
    SELECT s.* FROM public.hotspot_settings s WHERE s.id = 1
  ),
  pts AS (
    SELECT f.id, f.category, f.district, f.river_name, f.status, f.created_at, f.latitude, f.longitude,
      floor(extensions.ST_X(extensions.ST_Transform(f.geom, 3857)) / st.grid_size_m)::integer AS gx,
      floor(extensions.ST_Y(extensions.ST_Transform(f.geom, 3857)) / st.grid_size_m)::integer AS gy
    FROM public.filter_complaints(p_date_from, p_date_to, p_categories, p_statuses, p_district, p_river) f
    CROSS JOIN settings st
  ),
  cell_stats AS (
    SELECT p.gx, p.gy,
      count(*)::integer AS n,
      count(*) FILTER (WHERE p.status <> 'resolved')::integer AS pending_n,
      count(*) FILTER (WHERE p.status = 'resolved')::integer AS resolved_n,
      max(p.created_at) AS latest_at,
      avg(p.latitude) AS avg_lat,
      avg(p.longitude) AS avg_lng,
      array_agg(DISTINCT p.river_name ORDER BY p.river_name) AS river_list
    FROM pts p
    GROUP BY p.gx, p.gy
  ),
  cat_counts AS (
    SELECT p.gx, p.gy, p.category, count(*) AS n FROM pts p GROUP BY p.gx, p.gy, p.category
  ),
  top_cat AS (
    SELECT DISTINCT ON (cc.gx, cc.gy) cc.gx, cc.gy, cc.category
    FROM cat_counts cc
    ORDER BY cc.gx, cc.gy, cc.n DESC, cc.category
  ),
  dist_counts AS (
    SELECT p.gx, p.gy, p.district, count(*) AS n FROM pts p GROUP BY p.gx, p.gy, p.district
  ),
  top_dist AS (
    SELECT DISTINCT ON (dc.gx, dc.gy) dc.gx, dc.gy, dc.district
    FROM dist_counts dc
    ORDER BY dc.gx, dc.gy, dc.n DESC, dc.district
  )
  SELECT
    format('HS-%s:%s', cs.gx, cs.gy),
    cs.gx,
    cs.gy,
    CASE
      WHEN cs.n >= st.high_min THEN 'high'
      WHEN cs.n >= st.medium_min THEN 'medium'
      ELSE 'low'
    END,
    cs.n,
    cs.pending_n,
    cs.resolved_n,
    tc.category,
    td.district,
    cs.river_list,
    cs.latest_at,
    cs.avg_lat,
    cs.avg_lng,
    st.grid_size_m
  FROM cell_stats cs
  CROSS JOIN settings st
  JOIN top_cat tc ON tc.gx = cs.gx AND tc.gy = cs.gy
  JOIN top_dist td ON td.gx = cs.gx AND td.gy = cs.gy
  WHERE cs.n >= st.low_min
    AND public.is_official()
  ORDER BY cs.n DESC, cs.gx, cs.gy
$$;

CREATE OR REPLACE FUNCTION public.get_hotspot_complaints(
  p_cell_x integer,
  p_cell_y integer,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_river text DEFAULT NULL
)
RETURNS SETOF public.complaints
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT f.*
  FROM public.filter_complaints(p_date_from, p_date_to, p_categories, p_statuses, p_district, p_river) f
  CROSS JOIN public.hotspot_settings st
  WHERE st.id = 1
    AND floor(extensions.ST_X(extensions.ST_Transform(f.geom, 3857)) / st.grid_size_m)::integer = p_cell_x
    AND floor(extensions.ST_Y(extensions.ST_Transform(f.geom, 3857)) / st.grid_size_m)::integer = p_cell_y
    AND public.is_official()
  ORDER BY f.created_at DESC
  LIMIT 500
$$;

CREATE OR REPLACE FUNCTION public.get_complaint_points(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_river text DEFAULT NULL
)
RETURNS SETOF public.complaints
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT f.*
  FROM public.filter_complaints(p_date_from, p_date_to, p_categories, p_statuses, p_district, p_river) f
  WHERE public.is_official()
  ORDER BY f.created_at DESC
  LIMIT 5000
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_categories text[] DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_river text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'total', count(*),
        'pending', count(*) FILTER (WHERE f.status <> 'resolved'),
        'resolved', count(*) FILTER (WHERE f.status = 'resolved'),
        'districts', count(DISTINCT f.district)
      )
      FROM public.filter_complaints(p_date_from, p_date_to, p_categories, p_statuses, p_district, p_river) f
    ),
    'rivers', (
      SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) FROM (
        SELECT f.river_name, count(*)::integer AS complaints,
          count(*) FILTER (WHERE f.status <> 'resolved')::integer AS unresolved
        FROM public.filter_complaints(p_date_from, p_date_to, p_categories, p_statuses, p_district, p_river) f
        GROUP BY f.river_name
        ORDER BY complaints DESC, f.river_name
        LIMIT 10
      ) r
    ),
    'categories', (
      SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) FROM (
        SELECT f.category, count(*)::integer AS complaints
        FROM public.filter_complaints(p_date_from, p_date_to, p_categories, p_statuses, p_district, p_river) f
        GROUP BY f.category
        ORDER BY complaints DESC, f.category
      ) c
    ),
    'monthly', (
      SELECT COALESCE(jsonb_agg(m ORDER BY m.month), '[]'::jsonb) FROM (
        SELECT to_char(date_trunc('month', f.created_at), 'YYYY-MM') AS month,
          count(*)::integer AS complaints,
          count(*) FILTER (WHERE f.status = 'resolved')::integer AS resolved
        FROM public.filter_complaints(p_date_from, p_date_to, p_categories, p_statuses, p_district, p_river) f
        WHERE f.created_at >= date_trunc('month', now()) - interval '11 months'
        GROUP BY date_trunc('month', f.created_at)
      ) m
    ),
    'unresolved_by_district', (
      SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
        SELECT f.district, count(*)::integer AS unresolved
        FROM public.filter_complaints(p_date_from, p_date_to, p_categories, p_statuses, p_district, p_river) f
        WHERE f.status <> 'resolved'
        GROUP BY f.district
        ORDER BY unresolved DESC, f.district
        LIMIT 15
      ) d
    )
  )
  WHERE public.is_official()
$$;

CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'districts', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d), '[]'::jsonb)
      FROM (SELECT DISTINCT c.district AS d FROM public.complaints c) x
    ),
    'rivers', (
      SELECT COALESCE(jsonb_agg(r ORDER BY r), '[]'::jsonb)
      FROM (SELECT DISTINCT c.river_name AS r FROM public.complaints c) y
    )
  )
  WHERE public.is_official()
$$;

CREATE OR REPLACE FUNCTION public.get_boundaries()
RETURNS TABLE (
  boundary_id uuid,
  boundary_level text,
  boundary_name text,
  boundary_state text,
  geojson text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT b.id, b.boundary_level, b.name, b.state, extensions.ST_AsGeoJSON(b.geom)
  FROM public.admin_boundaries b
  WHERE public.is_official()
$$;

REVOKE EXECUTE ON FUNCTION public.filter_complaints(timestamptz, timestamptz, text[], text[], text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hotspots(timestamptz, timestamptz, text[], text[], text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hotspot_complaints(integer, integer, timestamptz, timestamptz, text[], text[], text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_complaint_points(timestamptz, timestamptz, text[], text[], text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_analytics(timestamptz, timestamptz, text[], text[], text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_filter_options() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_boundaries() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_hotspots(timestamptz, timestamptz, text[], text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hotspot_complaints(integer, integer, timestamptz, timestamptz, text[], text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_complaint_points(timestamptz, timestamptz, text[], text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics(timestamptz, timestamptz, text[], text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_filter_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_boundaries() TO authenticated;
