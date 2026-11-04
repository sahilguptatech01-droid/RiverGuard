# RiverGuard

RiverGuard is a React + TypeScript application for citizen river-pollution reports and a government hotspot-monitoring dashboard. Supabase provides authentication, PostgreSQL/PostGIS data, RPC-based map aggregation, and Realtime complaint notifications.

## Local setup

1. Create a Supabase project.
2. In Supabase **Project Settings → API**, copy the project URL and publishable/anon key.
3. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In the Supabase SQL Editor, apply the SQL files in `supabase/migrations/` in filename order.
5. Install dependencies and start the app:

   ```bash
   npm install
   npm run dev
   ```

## Roles and access

New accounts are created as `citizen` by the database trigger. The role is deliberately not user-editable. A trusted database administrator must assign `official` or `super_admin` to an account in `public.profiles` after verifying the person. Do not let users choose their own privileged role in the browser.

Example role assignment (run only as a trusted Supabase database administrator, replacing the UUID):

```sql
update public.profiles
set role = 'official'
where id = 'AUTH_USER_UUID';
```

## Dashboard features

- Summary cards and live complaint counts
- Category, status, date, district, and river filters
- Leaflet map with heatmap, marker-cluster, and individual-marker modes
- Hotspot detail panel and top-hotspot ranking
- River/category/month/district analytics
- Supabase Realtime alerts for new complaints
- Super-admin hotspot threshold settings
- Complaint detail modal and status updates

## Important notes

- The hotspot map represents the density of citizen-submitted reports; it is not a laboratory water-quality measurement.
- Map aggregation is served by the SQL RPC functions in the migrations. Keep the database RLS policies enabled.
- Only the Supabase publishable/anon key belongs in the frontend. Never put a Supabase service-role key in `VITE_*` variables or client code.
- This project archive was supplied without a configured Supabase project or environment secrets. Configure those before expecting live authentication and database data.
