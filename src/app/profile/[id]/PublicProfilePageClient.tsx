"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import PublicProfileView from "@/components/PublicProfileView";
import AuthGate from "@/components/auth/AuthGate";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp, getUserColorClass } from "@/lib/auth/placeFormatting";

interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted";
}

function PublicProfileContent({
  friendId,
  isInvite,
  currentUserId,
}: {
  friendId: string;
  isInvite: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendData, setFriendData] = useState<Parameters<
    typeof PublicProfileView
  >[0]["friend"] | null>(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [places, setPlaces] = useState<Parameters<typeof PublicProfileView>[0]["places"]>(
    []
  );
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [friendship, setFriendship] = useState<Friendship | null>(null);

  useEffect(() => {
    if (currentUserId === friendId) {
      router.replace("/profile");
    }
  }, [currentUserId, friendId, router]);

  useEffect(() => {
    if (currentUserId === friendId) return;

    let mounted = true;

    async function load() {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", friendId)
        .single();

      if (!mounted) return;

      if (error || !profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { count } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`sender_id.eq.${friendId},receiver_id.eq.${friendId}`)
        .eq("status", "accepted");

      const { data: activities } = await supabase
        .from("activities")
        .select(
          "id, place_name, latitude, longitude, is_superlike, description, created_at, categories, image_urls"
        )
        .eq("user_id", friendId)
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
        .select("activity_id")
        .eq("user_id", currentUserId);

      const { data: friendshipsData } = await supabase
        .from("friendships")
        .select("id, sender_id, receiver_id, status")
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      const matchedFriendship =
        (friendshipsData || []).find(
          (f) => f.sender_id === friendId || f.receiver_id === friendId
        ) || null;

      const name = profile.full_name ?? profile.username ?? "Freund";
      const initials =
        name
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";

      if (!mounted) return;

      setFriendData({
        id: profile.id,
        name,
        username: profile.username,
        initials,
        color: getUserColorClass(profile.id),
        avatarUrl: profile.avatar_url ?? null,
      });
      setFriendsCount(count ?? 0);
      setPlaces(loadedPlaces);
      setWishlistedIds((wishlistData || []).map((w) => w.activity_id));
      setFriendship(matchedFriendship as Friendship | null);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [supabase, friendId, currentUserId]);

  if (currentUserId === friendId) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green-700" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green-700" />
      </div>
    );
  }

  if (notFound || !friendData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-900">Profil nicht gefunden</p>
        <p className="mt-2 text-xs text-slate-500">
          Dieses Profil existiert nicht oder ist nicht mehr verfügbar.
        </p>
      </div>
    );
  }

  return (
    <PublicProfileView
      friend={friendData}
      friendsCount={friendsCount}
      places={places}
      initialWishlistedIds={wishlistedIds}
      initialFriendship={friendship}
      currentUserId={currentUserId}
      isInvite={isInvite}
    />
  );
}

export default function PublicProfilePageClient({
  friendId,
  isInvite,
}: {
  friendId: string;
  isInvite: boolean;
}) {
  return (
    <AuthGate context="profile" headerTitle="Profil">
      {(user: User) => (
        <PublicProfileContent
          friendId={friendId}
          isInvite={isInvite}
          currentUserId={user.id}
        />
      )}
    </AuthGate>
  );
}
