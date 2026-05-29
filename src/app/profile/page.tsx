import ProfileView from "@/components/ProfileView";
import AuthPrompt from "@/components/AuthPrompt";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
          <h1 className="text-lg font-bold text-slate-900">Mein Profil</h1>
        </header>
        <AuthPrompt context="profile" />
      </div>
    );
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Fetch friend count
  const { count: friendsCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "accepted");

  // Fetch activities (recommendations)
  const { data: activities } = await supabase
    .from("activities")
    .select("id, place_name, latitude, longitude, is_superlike, description, created_at, categories")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const places = (activities || []).map((act) => ({
    id: act.id,
    name: act.place_name,
    latitude: act.latitude,
    longitude: act.longitude,
    isMustSee: act.is_superlike,
    review: act.description || "",
    categories: Array.isArray(act.categories) ? act.categories : [],
    timestamp: formatTimestamp(act.created_at),
  }));

  // Fetch wishlist
  const { data: wishlistData } = await supabase
    .from("wishlist")
    .select(`
      id,
      activity_id,
      created_at,
      activity:activities (
        id,
        user_id,
        place_name,
        latitude,
        longitude,
        is_superlike,
        description,
        categories,
        created_at
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const wishlistFriendIds = wishlistData ? wishlistData.map((w: any) => w.activity?.user_id).filter(Boolean) : [];
  let wishlistFriendProfiles: any[] = [];
  if (wishlistFriendIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .in("id", wishlistFriendIds);
    wishlistFriendProfiles = profiles || [];
  }

  const wishlist = (wishlistData || []).map((w: any) => {
    const act = w.activity;
    if (!act) return null;
    const friend = wishlistFriendProfiles.find((p: any) => p.id === act.user_id);
    const friendName = friend?.full_name ?? friend?.username ?? "Freund";
    const friendInitials = friendName
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

    return {
      id: w.id,
      activityId: act.id,
      name: act.place_name,
      latitude: act.latitude,
      longitude: act.longitude,
      isMustSee: act.is_superlike,
      review: act.description || "",
      categories: Array.isArray(act.categories) ? act.categories : [],
      timestamp: formatTimestamp(w.created_at),
      friend: {
        id: act.user_id,
        name: friendName,
        username: friend?.username ?? "",
        initials: friendInitials,
        color: getUserColorClass(act.user_id),
      }
    };
  }).filter((w): w is Exclude<typeof w, null> => w !== null);

  const userData = {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    username: profile?.username ?? user.user_metadata?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };

  return <ProfileView user={userData} friendsCount={friendsCount ?? 0} places={places} wishlist={wishlist} />;
}

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
