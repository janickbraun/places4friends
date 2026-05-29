import FriendsView from "@/components/FriendsView";
import AuthPrompt from "@/components/AuthPrompt";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Freunde & Anfragen",
  description: "Finde deine Freunde auf places4friends und verwalte deine Freundschaftsanfragen.",
};

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
          <h1 className="text-lg font-bold text-slate-900">Freunde & Anfragen</h1>
        </header>
        <AuthPrompt context="friends" />
      </div>
    );
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name")
    .eq("id", user.id)
    .single();

  const userData = {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    username: profile?.username ?? user.user_metadata?.username ?? null,
  };

  return <FriendsView currentUser={userData} />;
}
