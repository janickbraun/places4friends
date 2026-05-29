import PublicProfileView from "@/components/PublicProfileView";
import AuthPrompt from "@/components/AuthPrompt";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

export const revalidate = 0; // Disable caching

const COLORS = [
  "bg-emerald-600",
  "bg-rose-500",
  "bg-amber-600",
  "bg-blue-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-fuchsia-600",
  "bg-cyan-600",
];

function getUserColorClass(userId: string): string {
  let sum = 0;
  for (let i = 0; i < userId.length; i++) {
    sum += userId.charCodeAt(i);
  }
  return COLORS[sum % COLORS.length];
}

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `vor ${Math.max(1, diffMins)} Min.`;
  } else if (diffHours < 24) {
    return `vor ${diffHours} Std.`;
  } else if (diffDays === 1) {
    return "gestern";
  } else if (diffDays < 7) {
    return `vor ${diffDays} Tagen`;
  } else {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { id: friendId } = await params;
  const sParams = await searchParams;
  const isInvite = sParams.invite === "true";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
          <h1 className="text-lg font-bold text-slate-900">Profil</h1>
        </header>
        <AuthPrompt context="profile" />
      </div>
    );
  }

  // Redirect to self profile page if accessing own ID
  if (user.id === friendId) {
    redirect("/profile");
  }

  // Fetch the friend's profile details
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", friendId)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Fetch friend's accepted friendships count
  const { count: friendsCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .or(`sender_id.eq.${friendId},receiver_id.eq.${friendId}`)
    .eq("status", "accepted");

  // Fetch friend's activities
  const { data: activities } = await supabase
    .from("activities")
    .select("id, place_name, latitude, longitude, is_superlike, description, created_at, categories, image_urls")
    .eq("user_id", friendId)
    .order("created_at", { ascending: false });

  const places = (activities || []).map((act) => ({
    id: act.id,
    name: act.place_name,
    latitude: act.latitude,
    longitude: act.longitude,
    isMustSee: act.is_superlike,
    review: act.description || "",
    categories: Array.isArray(act.categories) ? act.categories : [],
    imageUrls: Array.isArray(act.image_urls) ? act.image_urls : [],
    timestamp: formatTimestamp(act.created_at),
  }));

  const name = profile.full_name ?? profile.username ?? "Freund";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const friendData = {
    id: profile.id,
    name,
    username: profile.username,
    initials,
    color: getUserColorClass(profile.id),
    avatarUrl: profile.avatar_url ?? null,
  };

  // Fetch authenticated user's wishlist
  const { data: wishlistData } = await supabase
    .from("wishlist")
    .select("activity_id")
    .eq("user_id", user.id);
  const initialWishlistedIds = (wishlistData || []).map((w: any) => w.activity_id);

  // Fetch friendship relation
  const { data: friendshipsData } = await supabase
    .from("friendships")
    .select("id, sender_id, receiver_id, status")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

  const initialFriendship = (friendshipsData || []).find(
    (f: any) => f.sender_id === friendId || f.receiver_id === friendId
  ) || null;

  return (
    <PublicProfileView
      friend={friendData}
      friendsCount={friendsCount ?? 0}
      places={places}
      initialWishlistedIds={initialWishlistedIds}
      initialFriendship={initialFriendship}
      currentUserId={user.id}
      isInvite={isInvite}
    />
  );
}
