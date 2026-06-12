"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  refreshVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  emailVerified: true,
  refreshVerification: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [loading, setLoading] = useState(true);

  const checkVerification = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email_verified")
      .eq("id", userId)
      .single();

    if (profile) {
      setEmailVerified(profile.email_verified);
    }
  }, []);

  const refreshVerification = useCallback(async () => {
    if (user) {
      await checkVerification(user.id);
    }
  }, [user, checkVerification]);

  // Decoupled effect: Fetch email verification status whenever the user changes
  useEffect(() => {
    if (!user) {
      setEmailVerified(true);
      return;
    }

    const userId = user.id;
    let mounted = true;
    async function loadVerification() {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("id", userId)
        .single();

      if (mounted && profile) {
        setEmailVerified(profile.email_verified);
      }
    }

    loadVerification();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Load initial user and subscribe to auth changes
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setUser(user);
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, emailVerified, refreshVerification }}>
      {children}
    </AuthContext.Provider>
  );
}


