"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import ActivitiesView from "@/components/ActivitiesView";
import AuthGate from "@/components/auth/AuthGate";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp, getUserColorClass } from "@/lib/auth/placeFormatting";

function ActivitiesContent({ user }: { user: User }) {
  const supabase = createClient();
  const [activities, setActivities] = useState<
    Parameters<typeof ActivitiesView>[0]["activities"]
  >([]);
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: friendships } = await supabase
        .from("friendships")
        .select(
          `
          id,
          sender_id,
          receiver_id,
          status,
          sender:profiles!friendships_sender_id_fkey(id, username, full_name, avatar_url),
          receiver:profiles!friendships_receiver_id_fkey(id, username, full_name, avatar_url)
        `
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("status", "accepted");

      type FriendProfile = {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
      };
      type FriendshipRow = {
        sender_id: string;
        receiver_id: string;
        sender: FriendProfile;
        receiver: FriendProfile;
      };

      const friends = ((friendships || []) as unknown as FriendshipRow[]).map((f) =>
        f.sender_id === user.id ? f.receiver : f.sender
      );

      const friendIds = friends.map((f) => f.id);
      let loadedActivities: NonNullable<Parameters<typeof ActivitiesView>[0]["activities"]> = [];

      if (friendIds.length > 0) {
        const { data } = await supabase
          .from("activities")
          .select(
            "id, user_id, place_name, latitude, longitude, is_superlike, description, created_at, categories, image_urls"
          )
          .in("user_id", friendIds)
          .order("created_at", { ascending: false });

        if (data) {
          const activityIds = data.map((act) => act.id);
          const { data: commentsData } = await supabase
            .from("activity_comments")
            .select("activity_id")
            .in("activity_id", activityIds);

          const commentCountMap: Record<string, number> = {};
          (commentsData || []).forEach((c: { activity_id: string }) => {
            commentCountMap[c.activity_id] = (commentCountMap[c.activity_id] || 0) + 1;
          });

          loadedActivities = data.map((act) => {
            const friend = friends.find((f) => f.id === act.user_id);
            const name = friend?.full_name ?? friend?.username ?? "Freund";
            const initials =
              name
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
              },
            };
          });
        }
      }

      const { data: wishlistData } = await supabase
        .from("wishlist")
        .select("activity_id")
        .eq("user_id", user.id);

      if (!mounted) return;
      setActivities(loadedActivities);
      setWishlistedIds((wishlistData || []).map((w) => w.activity_id));
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [supabase, user.id]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green-700" />
      </div>
    );
  }

  return (
    <ActivitiesView activities={activities} initialWishlistedIds={wishlistedIds} />
  );
}

export default function ActivitiesPageClient() {
  return (
    <AuthGate context="activities" headerTitle="Aktivitäten">
      {(user) => <ActivitiesContent user={user} />}
    </AuthGate>
  );
}
