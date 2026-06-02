"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import ActivityDetailView from "@/components/ActivityDetailView";
import AuthGate from "@/components/auth/AuthGate";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp, getUserColorClass } from "@/lib/auth/placeFormatting";

import { ActivityDetailSkeleton } from "@/components/ui/Skeleton";

interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted";
}

function ActivityDetailContent({
  activityId,
  currentUserId,
}: {
  activityId: string;
  currentUserId: string;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewProps, setViewProps] = useState<Parameters<typeof ActivityDetailView>[0] | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: act, error: activityError } = await supabase
        .from("activities")
        .select(
          "id, user_id, place_name, place_address, latitude, longitude, is_superlike, description, created_at, categories, image_urls"
        )
        .eq("id", activityId)
        .single();

      if (!mounted) return;

      if (activityError || !act) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", act.user_id)
        .single();

      const creatorName =
        creatorProfile?.full_name ?? creatorProfile?.username ?? "Freund";
      const creatorInitials =
        creatorName
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";

      const creatorAvatarUrl = creatorProfile?.avatar_url
        ? `${supabase.storage.from("avatars").getPublicUrl(creatorProfile.avatar_url).data.publicUrl}?t=${Date.now()}`
        : null;

      const isOwner = currentUserId === act.user_id;

      let initialFriendship: Friendship | null = null;
      if (!isOwner) {
        const { data: friendshipsData } = await supabase
          .from("friendships")
          .select("id, sender_id, receiver_id, status")
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

        initialFriendship =
          ((friendshipsData || []).find(
            (f) => f.sender_id === act.user_id || f.receiver_id === act.user_id
          ) as Friendship | undefined) ?? null;
      }

      const [{ data: wishlistData }, { count: saveCount }] = await Promise.all([
        supabase
          .from("wishlist")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("activity_id", activityId)
          .maybeSingle(),
        supabase
          .from("wishlist")
          .select("*", { count: "exact", head: true })
          .eq("activity_id", activityId),
      ]);

      const { data: commentsData } = await supabase
        .from("activity_comments")
        .select(
          `
          id,
          activity_id,
          user_id,
          content,
          created_at,
          profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)
        `
        )
        .eq("activity_id", activityId)
        .order("created_at", { ascending: true });

      type CommentRow = {
        id: string;
        activity_id: string;
        user_id: string;
        content: string;
        created_at: string;
        profiles: {
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
        } | null;
      };

      const mappedComments = ((commentsData || []) as unknown as CommentRow[]).map((row) => {
        const profile = row.profiles;
        const name = profile?.full_name ?? profile?.username ?? "Nutzer";
        const initials =
          name
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

      if (!mounted) return;

      setViewProps({
        activity: {
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
        },
        creator: {
          id: act.user_id,
          name: creatorName,
          username: creatorProfile?.username ?? "",
          initials: creatorInitials,
          color: getUserColorClass(act.user_id),
          avatarUrl: creatorAvatarUrl,
        },
        initialComments: mappedComments,
        initialWishlisted: !!wishlistData,
        initialSaveCount: saveCount ?? 0,
        initialFriendship,
        isOwner,
        currentUserId,
      });
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [supabase, activityId, currentUserId]);

  if (loading) {
    return <ActivityDetailSkeleton />;
  }

  if (notFound || !viewProps) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-900">Ort nicht gefunden</p>
        <p className="mt-2 text-xs text-slate-500">
          Diese Empfehlung existiert nicht oder ist nicht mehr verfügbar.
        </p>
      </div>
    );
  }

  return <ActivityDetailView {...viewProps} />;
}

export default function ActivityDetailPageClient({
  activityId,
}: {
  activityId: string;
}) {
  return (
    <AuthGate 
      context="activities" 
      headerTitle="Ort Details"
      skeleton={<ActivityDetailSkeleton />}
    >
      {(user: User) => (
        <ActivityDetailContent activityId={activityId} currentUserId={user.id} />
      )}
    </AuthGate>
  );
}
