"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import FriendsView from "@/components/FriendsView";
import AuthGate from "@/components/auth/AuthGate";
import { createClient } from "@/lib/supabase/client";

function FriendsContent({ user }: { user: User }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string | null;
    username: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      setCurrentUser({
        id: user.id,
        email: user.email ?? "",
        name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
        username: profile?.username ?? user.user_metadata?.username ?? null,
      });
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [supabase, user]);

  if (loading || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green-700" />
      </div>
    );
  }

  return <FriendsView currentUser={currentUser} />;
}

export default function FriendsPageClient() {
  return (
    <AuthGate context="friends" headerTitle="Freunde & Anfragen">
      {(user) => <FriendsContent user={user} />}
    </AuthGate>
  );
}
