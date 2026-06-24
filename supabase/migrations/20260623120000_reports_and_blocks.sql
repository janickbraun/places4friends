-- Report & block system (App Store moderation compliance)
-- Adds: reports table, user_blocks table, profiles.banned_at,
-- is_blocked_between() helper, block_user()/unblock_user() RPCs, and
-- block-aware RLS on profiles (SELECT), friendships (INSERT), activity_comments (SELECT).

-- ============================================================
-- 1. reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  resolution  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (activity_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = (select auth.uid()));

-- ============================================================
-- 2. user_blocks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_id_idx ON public.user_blocks (blocked_id);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_select_involved" ON public.user_blocks;
CREATE POLICY "user_blocks_select_involved" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (blocker_id = (select auth.uid()) OR blocked_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_blocks_insert_own" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_own" ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_blocks_delete_own" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_own" ON public.user_blocks
  FOR DELETE TO authenticated
  USING (blocker_id = (select auth.uid()));

-- ============================================================
-- 3. profiles.banned_at (admin ban tracking)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- ============================================================
-- 4. is_blocked_between() — SECURITY DEFINER so policy checks don't recurse into user_blocks RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_blocked_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE (ub.blocker_id = a AND ub.blocked_id = b)
       OR (ub.blocker_id = b AND ub.blocked_id = a)
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated, anon;

-- ============================================================
-- 5. block_user() / unblock_user() RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_user(p_target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_target = v_uid THEN RAISE EXCEPTION 'cannot block yourself'; END IF;

  -- Drop any friendship/request in either direction.
  DELETE FROM public.friendships f
   WHERE (f.sender_id = v_uid AND f.receiver_id = p_target)
      OR (f.sender_id = p_target AND f.receiver_id = v_uid);

  -- Record the block.
  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (v_uid, p_target)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unblock_user(p_target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM public.user_blocks
   WHERE blocker_id = v_uid AND blocked_id = p_target;
END;
$$;
GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

-- ============================================================
-- 6. Block-aware RLS (recreate existing policies + AND-in block clause)
-- ============================================================

-- profiles SELECT: anonymous (uid null) still sees everything; authenticated callers
-- can't see profiles they have a block relationship with (either direction).
-- NOTE: superseded by 20260623120100 (one-directional via has_blocked()).
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT TO public
  USING (
    (select auth.uid()) IS NULL
    OR NOT public.is_blocked_between((select auth.uid()), id)
  );

-- friendships INSERT: was `(auth.uid() = sender_id) AND (status = 'pending')`.
DROP POLICY IF EXISTS "Users can insert their own friendship requests" ON public.friendships;
CREATE POLICY "Users can insert their own friendship requests" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = sender_id)
    AND (status = 'pending'::text)
    AND NOT public.is_blocked_between(auth.uid(), receiver_id)
  );

-- activity_comments SELECT: friend-or-author visibility check, now also hides
-- comments authored by anyone the viewer has a block relationship with.
DROP POLICY IF EXISTS "activity_comments_select" ON public.activity_comments;
CREATE POLICY "activity_comments_select" ON public.activity_comments
  FOR SELECT TO authenticated
  USING (
    (NOT public.is_blocked_between(auth.uid(), user_id))
    AND EXISTS (
      SELECT 1
      FROM activities a
      WHERE a.id = activity_comments.activity_id
        AND (
          a.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM friendships f
            WHERE f.status = 'accepted'::text
              AND (
                (f.sender_id = auth.uid()   AND f.receiver_id = a.user_id)
                OR (f.receiver_id = auth.uid() AND f.sender_id = a.user_id)
              )
          )
        )
    )
  );
