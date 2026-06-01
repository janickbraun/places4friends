import { createClient } from "@/lib/supabase/client";

/** Clears the Supabase session in the browser (required for client-side auth). */
export async function signOutClient() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
