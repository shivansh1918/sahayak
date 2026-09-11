REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.can_access_investigation(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.can_access_source(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_investigation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_source(uuid) TO authenticated, service_role;