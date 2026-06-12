-- Add email_verified column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Mark existing users as verified so we do not disrupt them
UPDATE public.profiles SET email_verified = true WHERE email_verified IS NULL OR email_verified = false;

-- Recreate trigger function to set email_verified based on provider
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, avatar_url, email_verified)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'username',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    COALESCE((new.raw_app_meta_data->>'provider' != 'email'), false)
  );
  RETURN new;
END;
$$;

-- Create email_verifications table for soft verification tokens
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Grant select, insert, update, and delete privileges to service_role to support server action operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_verifications TO service_role;

