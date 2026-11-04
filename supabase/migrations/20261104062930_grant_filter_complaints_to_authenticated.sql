/*
# Allow signed-in officials to run the shared complaint filter

## Plain-English summary
The shared filter function is used inside the hotspot and analytics functions. It was locked down for anonymous visitors but also needs to be callable by signed-in users, otherwise the dashboard would fail.

## Security changes
- Grants execute on `filter_complaints` to the `authenticated` role only. Anonymous visitors still cannot call it.
- The function itself returns only rows the caller can see through row-level security.

## Important notes
1. The migration is idempotent and safe to re-run.
*/

GRANT EXECUTE ON FUNCTION public.filter_complaints(timestamptz, timestamptz, text[], text[], text, text) TO authenticated;
