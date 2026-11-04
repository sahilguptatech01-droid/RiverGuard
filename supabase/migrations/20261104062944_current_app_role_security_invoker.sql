/*
# Run the role helper as the caller instead of as its owner

## Plain-English summary
The helper that reads the signed-in user's role no longer runs with elevated rights. It only ever reads the caller's own profile, which the profile security rules already allow, so it does not need elevated rights.

## Security changes
- `current_app_role` switched from definer rights to caller rights, removing the lint warning about signed-in users running an elevated function.

## Important notes
1. The migration is idempotent and safe to re-run.
*/

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
