-- Tighten RLS policies and fix security & performance findings from security audit

-- 1. Drop duplicate policy on activities
DROP POLICY IF EXISTS "activities_insert_own" ON public.activities;

-- 2. Tighten comments update policy by adding WITH CHECK and optimize performance
DROP POLICY IF EXISTS "Allow users to update their own comments" ON public.comments;
CREATE POLICY "Allow users to update their own comments" ON public.comments
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. Tighten recommendations update policy by adding WITH CHECK and optimize performance
DROP POLICY IF EXISTS "Allow users to update their own recommendations" ON public.recommendations;
CREATE POLICY "Allow users to update their own recommendations" ON public.recommendations
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Rewrite other policies on public.comments to use performance-optimized (SELECT auth.uid())
DROP POLICY IF EXISTS "Allow authenticated users to insert their own comments" ON public.comments;
CREATE POLICY "Allow authenticated users to insert their own comments" ON public.comments
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.comments;
CREATE POLICY "Allow users to delete their own comments" ON public.comments
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 5. Rewrite other policies on public.recommendations to use performance-optimized (SELECT auth.uid())
DROP POLICY IF EXISTS "Allow authenticated users to insert their own recommendations" ON public.recommendations;
CREATE POLICY "Allow authenticated users to insert their own recommendations" ON public.recommendations
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own recommendations" ON public.recommendations;
CREATE POLICY "Allow users to delete their own recommendations" ON public.recommendations
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);
