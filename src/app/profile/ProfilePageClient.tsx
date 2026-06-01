"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import ProfileView from "@/components/ProfileView";
import AuthGate from "@/components/auth/AuthGate";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp, getUserColorClass } from "@/lib/auth/placeFormatting";

function ProfileContent({ user }: { user: User }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{
    id: string;
    email: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [places, setPlaces] = useState<Parameters<typeof ProfileView>[0]["places"]>([]);
  const [wishlist, setWishlist] = useState<Parameters<typeof ProfileView>[0]["wishlist"]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", user.id)
        .single();

      const { count } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("status", "accepted");

      const { data: activities } = await supabase
        .from("activities")
        .select(
          "id, place_name, latitude, longitude, is_superlike, description, created_at, categories, image_urls"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const loadedPlaces = (activities || []).map((act) => ({
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

      const { data: wishlistData } = await supabase
        .from("wishlist")
        .select(
          `
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
            created_at,
            image_urls
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const wishlistRows = (wishlistData || []) as unknown as {
        id: string;
        created_at: string;
        activity: {
          id: string;
          user_id: string;
          place_name: string;
          latitude: number | null;
          longitude: number | null;
          is_superlike: boolean;
          description: string | null;
          categories: string[] | null;
          image_urls: string[] | null;
        } | null;
      }[];

      const wishlistFriendIds = wishlistRows
        .map((w) => w.activity?.user_id)
        .filter((id): id is string => Boolean(id));

      let wishlistFriendProfiles: {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
      }[] = [];

      if (wishlistFriendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", wishlistFriendIds as string[]);
        wishlistFriendProfiles = profiles || [];
      }

      const loadedWishlist = wishlistRows
        .map((w) => {
          const act = w.activity;
          if (!act) return null;
          const friend = wishlistFriendProfiles.find((p) => p.id === act.user_id);
          const friendName = friend?.full_name ?? friend?.username ?? "Freund";
          const friendInitials =
            friendName
              .split(" ")
              .map((n: string) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase() || "?";
          const friendAvatarUrl = friend?.avatar_url
            ? `${supabase.storage.from("avatars").getPublicUrl(friend.avatar_url).data.publicUrl}?t=${Date.now()}`
            : null;

          return {
            id: w.id,
            activityId: act.id,
            name: act.place_name,
            latitude: act.latitude,
            longitude: act.longitude,
            isMustSee: act.is_superlike,
            review: act.description || "",
            categories: Array.isArray(act.categories) ? act.categories : [],
            imageUrls: Array.isArray(act.image_urls) ? act.image_urls : [],
            timestamp: formatTimestamp(w.created_at),
            friend: {
              id: act.user_id,
              name: friendName,
              username: friend?.username ?? "",
              initials: friendInitials,
              color: getUserColorClass(act.user_id),
              avatarUrl: friendAvatarUrl,
            },
          };
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);

      if (!mounted) return;

      setUserData({
        id: user.id,
        email: user.email ?? "",
        name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
        username: profile?.username ?? user.user_metadata?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      });
      setFriendsCount(count ?? 0);
      setPlaces(loadedPlaces);
      setWishlist(loadedWishlist);
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

  return (
    <ProfileView
      user={userData}
      friendsCount={friendsCount}
      places={places}
      wishlist={wishlist}
    />
  );
}

export default function ProfilePageClient() {
  return (
    <AuthGate
      context="profile"
      headerTitle="Mein Profil"
      titleClassName="text-sm font-bold text-slate-900"
    >
      {(user) => <ProfileContent user={user} />}
    </AuthGate>
  );
}
