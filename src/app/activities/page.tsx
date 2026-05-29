import ActivitiesView from "@/components/ActivitiesView";
import AuthPrompt from "@/components/AuthPrompt";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktivitäten",
  description: "Entdecke die neuesten Aktivitäten und persönlichen Empfehlungen deiner Freunde auf places4friends.",
};

export const revalidate = 0; // Disable caching to ensure fresh feed

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

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
          <h1 className="text-lg font-bold text-slate-900">Aktivitäten</h1>
        </header>
        <AuthPrompt context="activities" />
      </div>
    );
  }

  // Fetch accepted friendships
  const { data: friendships } = await supabase
    .from("friendships")
    .select(`
      id,
      sender_id,
      receiver_id,
      status,
      sender:profiles!friendships_sender_id_fkey(id, username, full_name, avatar_url),
      receiver:profiles!friendships_receiver_id_fkey(id, username, full_name, avatar_url)
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "accepted");

  const friends = (friendships || []).map((f: any) => {
    return f.sender_id === user.id ? f.receiver : f.sender;
  });

  const friendIds = friends.map((f: any) => f.id);

  let activities: any[] = [];
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from("activities")
      .select("id, user_id, place_name, latitude, longitude, is_superlike, description, created_at, categories, image_urls")
      .in("user_id", friendIds)
      .order("created_at", { ascending: false });
    
    if (data) {
      const activityIds = data.map((act) => act.id);
      const { data: commentsData } = await supabase
        .from("activity_comments")
        .select("activity_id")
        .in("activity_id", activityIds);

      const commentCountMap: Record<string, number> = {};
      (commentsData || []).forEach((c: any) => {
        commentCountMap[c.activity_id] = (commentCountMap[c.activity_id] || 0) + 1;
      });

      activities = data.map((act) => {
        const friend = friends.find((f: any) => f.id === act.user_id);
        const name = friend?.full_name ?? friend?.username ?? "Freund";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";
        const avatarUrl = friend?.avatar_url
          ? `${supabase.storage.from("avatars").getPublicUrl(friend.avatar_url).data.publicUrl}?t=${Date.now()}`
          : null;

        return {
          id: act.id,
          placeName: act.place_name,
          latitude: act.latitude,
          longitude: act.longitude,
          isMustSee: act.is_superlike,
          description: act.description || "",
          categories: Array.isArray(act.categories) ? act.categories : [],
          imageUrls: Array.isArray(act.image_urls) ? act.image_urls : [],
          timestamp: formatTimestamp(act.created_at),
          commentCount: commentCountMap[act.id] || 0,
          friend: {
            id: act.user_id,
            name,
            username: friend?.username ?? "",
            initials,
            color: getUserColorClass(act.user_id),
            avatarUrl,
          }
        };
      });
    }
  }

  // Fetch wishlisted activities
  const { data: wishlistData } = await supabase
    .from("wishlist")
    .select("activity_id")
    .eq("user_id", user.id);
  const initialWishlistedIds = (wishlistData || []).map((w: any) => w.activity_id);

  return <ActivitiesView activities={activities} initialWishlistedIds={initialWishlistedIds} />;
}

