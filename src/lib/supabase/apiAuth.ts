import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated user for API route handlers.
 * Tries cookie-based session first, then Bearer token from the client.
 */
export async function getApiUser(request: Request): Promise<User | null> {
  const cookieClient = await createClient();
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser();
  if (cookieUser) return cookieUser;

  const authorization = request.headers.get("Authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) return null;

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Supabase client scoped to the API caller (cookies or Bearer token). */
export async function createApiClient(request: Request) {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (token) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return createClient();
}
