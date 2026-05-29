import AuthPrompt from "@/components/AuthPrompt";
import SettingsView from "@/components/SettingsView";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Einstellungen",
  description: "Verwalte deine Profileinstellungen, Kontodetails und Benachrichtigungen auf places4friends.",
};

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
          <h1 className="text-sm font-bold text-slate-900">Einstellungen</h1>
        </header>
        <AuthPrompt context="profile" />
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, notifications_friend_requests")
    .eq("id", user.id)
    .single();

  const userData = {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    username: profile?.username ?? user.user_metadata?.username ?? null,
    notificationsFriendRequests: profile?.notifications_friend_requests ?? true,
  };

  return <SettingsView user={userData} />;
}
