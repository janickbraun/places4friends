-- Profile discovery hiding must be ONE-directional: hide a profile P from viewer V
-- only when P has blocked V (so the blocked user can't find the blocker). The blocker
-- must still see the blocked user — otherwise the "Blockierte Nutzer" unblock list
-- (which joins profiles) would be hidden by RLS. Comments + friend-requests stay mutual
-- (they use is_blocked_between).

CREATE OR REPLACE FUNCTION public.has_blocked(p_blocker uuid, p_target uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE ub.blocker_id = p_blocker AND ub.blocked_id = p_target
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_blocked(uuid, uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT TO public
  USING (
    (select auth.uid()) IS NULL
    OR NOT public.has_blocked(id, (select auth.uid()))
  );
