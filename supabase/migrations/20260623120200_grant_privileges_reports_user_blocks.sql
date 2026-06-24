-- New tables don't inherit DML grants in this project (see grant_service_role_privileges).
-- Without these grants the RLS policies can never be reached: the admin panel (service_role)
-- gets 42501 on reports, and authenticated users can't read user_blocks / insert reports.

-- service_role: full DML for the admin panel (bypasses RLS).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_blocks TO service_role;

-- authenticated: only what the RLS policies allow (RLS remains the real gate).
GRANT SELECT, INSERT ON public.reports             TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
