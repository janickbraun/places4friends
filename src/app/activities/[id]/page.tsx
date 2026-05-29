import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ActivityDetailView from "@/components/ActivityDetailView";
import AuthPrompt from "@/components/AuthPrompt";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: act } = await supabase
    .from("activities")
    .select("place_name, description")
    .eq("id", id)
    .single();

  if (!act) {
    return {
      title: "Ort Details | places4friends",
      description: "Empfehlung von deinen Freunden ansehen.",
    };
  }

  return {
    title: `${act.place_name} | places4friends`,
    description: act.description || `Details und Highlights für ${act.place_name} auf der interaktiven Karte ansehen.`,
  };
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
          <h1 className="text-lg font-bold text-slate-900">Ort Details</h1>
        </header>
        <AuthPrompt context="activities" />
      </div>
    );
  }

  // Fetch the activity
  const { data: act, error: activityError } = await supabase
    .from("activities")
    .select("id, user_id, place_name, place_address, latitude, longitude, is_superlike, description, created_at, categories, image_urls")
    .eq("id", id)
    .single();

  if (activityError || !act) {
    notFound();
  }

  // Fetch creator profile
  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", act.user_id)
    .single();

  const creatorName = creatorProfile?.full_name ?? creatorProfile?.username ?? "Freund";
  const creatorInitials = creatorName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  
  const creatorAvatarUrl = creatorProfile?.avatar_url
    ? `${supabase.storage.from("avatars").getPublicUrl(creatorProfile.avatar_url).data.publicUrl}?t=${Date.now()}`
    : null;

  const creatorData = {
    id: act.user_id,
    name: creatorName,
    username: creatorProfile?.username ?? "",
    initials: creatorInitials,
    color: getUserColorClass(act.user_id),
    avatarUrl: creatorAvatarUrl,
  };

  // Determine if user owns the activity
  const isOwner = user.id === act.user_id;

  // Check friendship status if not own activity
  let initialFriendship = null;
  if (!isOwner) {
    const { data: friendshipsData } = await supabase
      .from("friendships")
      .select("id, sender_id, receiver_id, status")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    
    initialFriendship = (friendshipsData || []).find(
      (f: any) => f.sender_id === act.user_id || f.receiver_id === act.user_id
    ) || null;
  }

  // Fetch wishlist status
  const { data: wishlistData } = await supabase
    .from("wishlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("activity_id", id)
    .maybeSingle();
  const initialWishlisted = !!wishlistData;

  // Fetch comments
  const { data: commentsData } = await supabase
    .from("activity_comments")
    .select(`
      id,
      activity_id,
      user_id,
      content,
      created_at,
      profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq("activity_id", id)
    .order("created_at", { ascending: true });

  const mappedComments = (commentsData || []).map((row: any) => {
    const profile = row.profiles;
    const name = profile?.full_name ?? profile?.username ?? "Nutzer";
    const initials = name
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
    const avatarUrl = profile?.avatar_url
      ? `${supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl}?t=${Date.now()}`
      : null;

    return {
      id: row.id,
      activityId: row.activity_id,
      userId: row.user_id,
      userName: name,
      userInitials: initials,
      userColor: getUserColorClass(row.user_id),
      userAvatarUrl: avatarUrl,
      content: row.content,
      createdAt: row.created_at,
    };
  });

  const activityData = {
    id: act.id,
    userId: act.user_id,
    placeName: act.place_name,
    placeAddress: act.place_address || null,
    latitude: act.latitude,
    longitude: act.longitude,
    isMustSee: act.is_superlike,
    description: act.description || "",
    categories: Array.isArray(act.categories) ? act.categories : [],
    imageUrls: Array.isArray(act.image_urls) ? act.image_urls : [],
    timestamp: formatTimestamp(act.created_at),
  };

  return (
    <ActivityDetailView
      activity={activityData}
      creator={creatorData}
      initialComments={mappedComments}
      initialWishlisted={initialWishlisted}
      initialFriendship={initialFriendship}
      isOwner={isOwner}
      currentUserId={user.id}
    />
  );
}
