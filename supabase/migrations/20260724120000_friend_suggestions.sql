-- Friend discovery for the mobile app's Freunde tab.
-- Adds: get_friend_suggestions() (friends-of-friends ranked by mutual count),
-- user_email_hashes (private lookup table) + trigger maintenance, and
-- find_contacts_on_p4f() (address-book matching on hashed e-mail addresses).
--
-- Both RPCs are SECURITY DEFINER: they bypass RLS to walk the friendship graph
-- and read auth.users, so the exclusion set inside each function IS the access
-- control. They return only columns the caller can already read through the
-- public `profiles` SELECT policy — never widen that shape.

-- ============================================================
-- 1. Shared candidate filter
-- ============================================================
-- True when `p_candidate` may be suggested to `p_uid`: not self, no friendship
-- or request in either direction, not blocked either way, not banned.
CREATE OR REPLACE FUNCTION public.is_suggestable(p_uid uuid, p_candidate uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_candidate IS DISTINCT FROM p_uid
     AND NOT EXISTS (
       SELECT 1 FROM public.friendships f
       WHERE (f.sender_id = p_uid AND f.receiver_id = p_candidate)
          OR (f.receiver_id = p_uid AND f.sender_id = p_candidate)
     )
     AND NOT public.is_blocked_between(p_uid, p_candidate)
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = p_candidate AND p.banned_at IS NULL
     );
$$;

-- Number of accepted friends `p_uid` and `p_candidate` have in common.
CREATE OR REPLACE FUNCTION public.mutual_friend_count(p_uid uuid, p_candidate uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH mine AS (
    SELECT CASE WHEN f.sender_id = p_uid THEN f.receiver_id ELSE f.sender_id END AS friend_id
    FROM public.friendships f
    WHERE f.status = 'accepted' AND (f.sender_id = p_uid OR f.receiver_id = p_uid)
  ),
  theirs AS (
    SELECT CASE WHEN f.sender_id = p_candidate THEN f.receiver_id ELSE f.sender_id END AS friend_id
    FROM public.friendships f
    WHERE f.status = 'accepted' AND (f.sender_id = p_candidate OR f.receiver_id = p_candidate)
  )
  SELECT count(*)::int FROM mine JOIN theirs USING (friend_id);
$$;

-- ============================================================
-- 2. Friends-of-friends suggestions
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id           uuid,
  username     text,
  full_name    text,
  avatar_url   text,
  mutual_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  my_friends AS (
    SELECT CASE WHEN f.sender_id = me.uid THEN f.receiver_id ELSE f.sender_id END AS friend_id
    FROM public.friendships f, me
    WHERE me.uid IS NOT NULL
      AND f.status = 'accepted'
      AND (f.sender_id = me.uid OR f.receiver_id = me.uid)
  ),
  candidates AS (
    SELECT CASE WHEN f.sender_id = mf.friend_id THEN f.receiver_id ELSE f.sender_id END AS cand_id
    FROM public.friendships f
    JOIN my_friends mf ON (f.sender_id = mf.friend_id OR f.receiver_id = mf.friend_id)
    WHERE f.status = 'accepted'
  )
  SELECT p.id, p.username, p.full_name, p.avatar_url, count(*)::int AS mutual_count
  FROM candidates c
  JOIN public.profiles p ON p.id = c.cand_id, me
  WHERE public.is_suggestable(me.uid, c.cand_id)
  GROUP BY p.id, p.username, p.full_name, p.avatar_url
  ORDER BY mutual_count DESC, p.full_name NULLS LAST
  LIMIT greatest(1, least(coalesce(p_limit, 20), 50));
$$;

-- ============================================================
-- 3. Address-book matching
-- ============================================================
-- Private mirror of the sha256 of each user's e-mail. RLS is enabled with NO
-- policies, so no client can read it — only the SECURITY DEFINER function
-- below. Keeping the hashes out of `profiles` (which is world-readable) is the
-- whole point: a dumpable hash column would be brute-forceable offline.
CREATE TABLE IF NOT EXISTS public.user_email_hashes (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_hash text NOT NULL
);
CREATE INDEX IF NOT EXISTS user_email_hashes_hash_idx ON public.user_email_hashes (email_hash);
ALTER TABLE public.user_email_hashes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_email_hashes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.email_hash(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_email IS NULL OR btrim(p_email) = '' THEN NULL
    ELSE encode(extensions.digest(lower(btrim(p_email)), 'sha256'), 'hex')
  END;
$$;

INSERT INTO public.user_email_hashes (user_id, email_hash)
SELECT u.id, public.email_hash(u.email)
FROM auth.users u
WHERE public.email_hash(u.email) IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET email_hash = excluded.email_hash;

-- Keep the mirror current: extend the existing auth.users triggers rather than
-- adding new ones.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, avatar_url, email_verified)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'username',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    COALESCE((new.raw_app_meta_data->>'provider' != 'email'), false)
  );

  IF public.email_hash(new.email) IS NOT NULL THEN
    INSERT INTO public.user_email_hashes (user_id, email_hash)
    VALUES (new.id, public.email_hash(new.email))
    ON CONFLICT (user_id) DO UPDATE SET email_hash = excluded.email_hash;
  END IF;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.profiles
  SET
    full_name = COALESCE(profiles.full_name, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    avatar_url = COALESCE(profiles.avatar_url, new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  WHERE id = new.id;

  -- Follow e-mail changes so contact matching keeps working.
  IF public.email_hash(new.email) IS NOT NULL THEN
    INSERT INTO public.user_email_hashes (user_id, email_hash)
    VALUES (new.id, public.email_hash(new.email))
    ON CONFLICT (user_id) DO UPDATE SET email_hash = excluded.email_hash;
  END IF;

  RETURN new;
END;
$function$;

-- Match hashed contact e-mails against registered users. The client hashes
-- locally and sends at most 1000 hashes per call, so raw addresses never leave
-- the device. Callers can still probe whether a specific address is registered
-- — the batch cap bounds that; do not raise it, and do not return anything
-- beyond public profile columns.
CREATE OR REPLACE FUNCTION public.find_contacts_on_p4f(p_email_hashes text[])
RETURNS TABLE (
  id           uuid,
  username     text,
  full_name    text,
  avatar_url   text,
  mutual_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR p_email_hashes IS NULL THEN
    RETURN;
  END IF;
  IF array_length(p_email_hashes, 1) > 1000 THEN
    RAISE EXCEPTION 'too many hashes (max 1000 per call)';
  END IF;

  RETURN QUERY
  WITH wanted AS (SELECT DISTINCT unnest(p_email_hashes) AS h)
  SELECT p.id, p.username, p.full_name, p.avatar_url,
         public.mutual_friend_count(v_uid, p.id) AS mutual_count
  FROM wanted w
  JOIN public.user_email_hashes eh ON eh.email_hash = w.h
  JOIN public.profiles p ON p.id = eh.user_id
  WHERE public.is_suggestable(v_uid, p.id)
  ORDER BY mutual_count DESC, p.full_name NULLS LAST
  LIMIT 100;
END;
$$;

-- ============================================================
-- 4. Grants — signed-in users only
-- ============================================================
REVOKE ALL ON FUNCTION public.get_friend_suggestions(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_contacts_on_p4f(text[])    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_suggestable(uuid, uuid)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutual_friend_count(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_hash(text)                FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_friend_suggestions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_contacts_on_p4f(text[])    TO authenticated;
