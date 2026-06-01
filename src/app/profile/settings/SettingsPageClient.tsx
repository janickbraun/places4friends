"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import SettingsView from "@/components/SettingsView";
import AuthGate from "@/components/auth/AuthGate";
import { createClient } from "@/lib/supabase/client";

function SettingsContent({ user }: { user: User }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<Parameters<typeof SettingsView>[0]["user"] | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, notifications_friend_requests")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      setUserData({
        id: user.id,
        email: user.email ?? "",
        name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
        username: profile?.username ?? user.user_metadata?.username ?? null,
        notificationsFriendRequests: profile?.notifications_friend_requests ?? true,
      });
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [supabase, user]);

  if (loading || !userData) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green-700" />
      </div>
    );
  }

  return <SettingsView user={userData} />;
}

export default function SettingsPageClient() {
  return (
    <AuthGate
      context="profile"
      headerTitle="Einstellungen"
      titleClassName="text-sm font-bold text-slate-900"
    >
      {(user) => <SettingsContent user={user} />}
    </AuthGate>
  );
}
