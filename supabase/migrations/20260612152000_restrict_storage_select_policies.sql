-- Restrict storage bucket SELECT policies to prevent unauthorized file listing/enumeration
-- while maintaining full public access to file URLs (handled automatically by Supabase for public buckets)

-- 1. Restrict avatars SELECT policy
DROP POLICY IF EXISTS "Public SELECT access for avatars" ON storage.objects;
CREATE POLICY "Owner SELECT access for avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (split_part(name, '/', 1) = (SELECT auth.uid())::text)
);

-- 2. Restrict activity-images SELECT policy
DROP POLICY IF EXISTS "Public SELECT access for activity-images" ON storage.objects;
CREATE POLICY "Owner SELECT access for activity-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'activity-images'
  AND owner = (SELECT auth.uid())
);
