-- Reports the role PostgREST resolved from the caller's JWT.
--
-- requireCronSecret() authenticates a machine caller by string-comparing the
-- Authorization header against SUPABASE_SERVICE_ROLE_KEY. That breaks the
-- moment a project runs both legacy JWT keys and the newer sb_secret_/
-- sb_publishable_ scheme, because the env var and the key an operator copies
-- out of the dashboard are then two different strings for the same authority.
--
-- Calling this over PostgREST with the caller's own token settles it without a
-- shared secret: PostgREST verifies the JWT signature against the project
-- secret before any SQL runs, so a forged or altered token never reaches here,
-- and an anon token reports 'anon'. It reads no table and touches no user data.
CREATE OR REPLACE FUNCTION public.current_jwt_role()
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::json->>'role',
    'anon'
  );
$function$;

GRANT EXECUTE ON FUNCTION public.current_jwt_role() TO anon, authenticated, service_role;
