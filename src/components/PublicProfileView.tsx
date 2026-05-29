"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, MapPin, X, Loader2, UserPlus, UserCheck, Clock, UserMinus } from "lucide-react";
import ActivityCard from "./ActivityCard";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  name: string | null;
  username: string | null;
  initials: string;
  color: string;
  avatarUrl?: string | null;
}

interface PlaceItem {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  isMustSee?: boolean;
  review: string;
  timestamp: string;
  categories?: string[];
  imageUrls?: string[];
}

interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted";
}

export default function PublicProfileView({
  friend,
  friendsCount = 0,
  places = [],
  initialWishlistedIds = [],
  initialFriendship = null,
  currentUserId,
}: {
  friend: User;
  friendsCount?: number;
  places?: PlaceItem[];
  initialWishlistedIds?: string[];
  initialFriendship?: Friendship | null;
  currentUserId: string;
}) {
  const [wishlistIds, setWishlistIds] = useState<string[]>(initialWishlistedIds);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendship, setFriendship] = useState<Friendship | null>(initialFriendship);
  const [isSubmittingFriendship, setIsSubmittingFriendship] = useState(false);
  const [localFriendsCount, setLocalFriendsCount] = useState(friendsCount);
  const supabase = createClient();

  useEffect(() => {
    setFriendship(initialFriendship);
  }, [initialFriendship]);

  useEffect(() => {
    setLocalFriendsCount(friendsCount);
  }, [friendsCount]);

  const sendFriendRequest = async () => {
    setIsSubmittingFriendship(true);
    try {
      const { data, error } = await supabase
        .from("friendships")
        .insert({
          sender_id: currentUserId,
          receiver_id: friend.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      setFriendship(data);
    } catch (err) {
      console.error("Error sending friend request:", err);
    } finally {
      setIsSubmittingFriendship(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!friendship) return;
    setIsSubmittingFriendship(true);
    try {
      const { data, error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendship.id)
        .select()
        .single();

      if (error) throw error;
      setFriendship(data);
      setLocalFriendsCount((prev) => prev + 1);
    } catch (err) {
      console.error("Error accepting friend request:", err);
    } finally {
      setIsSubmittingFriendship(false);
    }
  };

  const removeFriendship = async () => {
    if (!friendship) return;
    setIsSubmittingFriendship(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id);

      if (error) throw error;
      const wasAccepted = friendship.status === "accepted";
      setFriendship(null);
      if (wasAccepted) {
        setLocalFriendsCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error removing friendship:", err);
    } finally {
      setIsSubmittingFriendship(false);
    }
  };

  const fetchFriends = async () => {
    setIsLoadingFriends(true);
    setIsFriendsModalOpen(true);
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          sender:profiles!friendships_sender_id_fkey(id, username, full_name, avatar_url),
          receiver:profiles!friendships_receiver_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq("status", "accepted")
        .or(`sender_id.eq.${friend.id},receiver_id.eq.${friend.id}`);

      if (error) throw error;

      const mappedFriends = (data || []).map((row: any) => {
        const otherUser = row.sender_id === friend.id ? row.receiver : row.sender;
        const avatarUrl = otherUser.avatar_url
          ? supabase.storage.from("avatars").getPublicUrl(otherUser.avatar_url).data.publicUrl
          : null;
        return {
          id: otherUser.id,
          username: otherUser.username,
          full_name: otherUser.full_name,
          avatarUrl,
        };
      });
      setFriendsList(mappedFriends);
    } catch (err) {
      console.error("Error fetching friends:", err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const getInitials = (name?: string | null, username?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return "?";
  };

  useEffect(() => {
    setWishlistIds(initialWishlistedIds);
  }, [initialWishlistedIds]);

  useEffect(() => {
    if (!friend.avatarUrl) {
      setAvatarPublicUrl(null);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(friend.avatarUrl);
    setAvatarPublicUrl(`${data.publicUrl}?t=${Date.now()}`);
  }, [friend.avatarUrl]);

  const toggleWishlist = async (activityId: string) => {
    const isSaved = wishlistIds.includes(activityId);
    if (isSaved) {
      setWishlistIds((prev) => prev.filter((id) => id !== activityId));
      try {
        const response = await fetch(`/api/wishlist?activityId=${activityId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error();
      } catch (err) {
        setWishlistIds((prev) => [...prev, activityId]);
      }
    } else {
      setWishlistIds((prev) => [...prev, activityId]);
      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId }),
        });
        if (!response.ok) throw new Error();
      } catch (err) {
        setWishlistIds((prev) => prev.filter((id) => id !== activityId));
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <Link
          href="/profile/friends"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Profil</h1>
        <div className="w-8" /> {/* Spacer to center the title */}
      </header>

      <div className="flex-grow overflow-y-auto px-4 pt-6 page-transition">
        {/* Profile Card Info */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative">
            {avatarPublicUrl ? (
              <div className="flex h-22 w-22 items-center justify-center rounded-full bg-slate-100 shadow-md">
                <img
                  src={avatarPublicUrl}
                  alt="Profilbild"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            ) : (
              <div className={`flex h-22 w-22 items-center justify-center rounded-full text-white font-bold text-2xl shadow-md ${friend.color}`}>
                {friend.initials}
              </div>
            )}
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-950">
            {friend.name ?? "Freund"}
          </h2>
          {friend.username && (
            <p className="text-xs font-semibold text-brand-green-700 mt-0.5">
              @{friend.username}
            </p>
          )}

          <button
            onClick={fetchFriends}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-green-800 transition-colors cursor-pointer"
          >
            <span>
              {localFriendsCount} {localFriendsCount === 1 ? "Freund" : "Freunde"}
            </span>
          </button>

          <div className="mt-4">
            {isSubmittingFriendship ? (
              <button
                disabled
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-400"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Verarbeiten...</span>
              </button>
            ) : !friendship ? (
              <button
                onClick={sendFriendRequest}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 active:scale-95 transition-all text-white font-bold px-4.5 py-2 cursor-pointer text-xs shadow-sm hover:shadow"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Freund hinzufügen</span>
              </button>
            ) : friendship.status === "pending" && friendship.sender_id === currentUserId ? (
              <button
                onClick={removeFriendship}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-650 active:scale-95 transition-all text-slate-500 font-bold px-4.5 py-2 cursor-pointer text-xs border border-slate-200/40"
                title="Anfrage zurückziehen"
              >
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Anfrage ausstehend</span>
              </button>
            ) : friendship.status === "pending" ? (
              <button
                onClick={acceptFriendRequest}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 active:scale-95 transition-all text-white font-bold px-4.5 py-2 cursor-pointer text-xs shadow-sm"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Anfrage annehmen</span>
              </button>
            ) : (
              <div
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4.5 py-2 text-slate-600 font-bold text-xs border border-slate-200/40 cursor-default"
              >
                <UserCheck className="h-3.5 w-3.5 text-brand-green-700" />
                <span>Befreundet</span>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Empfehlungen von {friend.name?.split(" ")[0] ?? "Freund"}
            </h3>
          </div>

          {/* Places List */}
          {friendship?.status === "accepted" ? (
            <div className="space-y-3.5 pb-8">
              {places.length > 0 ? (
                places.map((place) => (
                  <ActivityCard
                    key={place.id}
                    id={place.id}
                    placeName={place.name}
                    latitude={place.latitude}
                    longitude={place.longitude}
                    isMustSee={place.isMustSee}
                    description={place.review}
                    categories={place.categories}
                    timestamp={place.timestamp}
                    imageUrls={place.imageUrls}
                    actions={
                      <button
                        onClick={() => toggleWishlist(place.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-white hover:bg-slate-50 active:scale-90 transition-all cursor-pointer shadow-sm"
                        title={wishlistIds.includes(place.id) ? "Aus Wishlist entfernen" : "In Wishlist speichern"}
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 transition-colors ${
                            wishlistIds.includes(place.id)
                              ? "text-brand-green-700 fill-brand-green-700"
                              : "text-slate-400 hover:text-brand-green-700"
                          }`}
                        />
                      </button>
                    }
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                  <MapPin className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Noch keine Empfehlungen eingetragen
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 py-12 text-center shadow-sm">
              <MapPin className="h-8 w-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-800 mt-3">
                Beiträge sind privat
              </h4>
              <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto mt-1 leading-relaxed">
                Verbinde dich mit {friend.name?.split(" ")[0] ?? "diesem User"}, um seine Empfehlungen zu sehen.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Friends Modal */}
      {isFriendsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl transition-all duration-350 flex flex-col min-h-[400px] max-h-[80vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-white">
              <h2 className="text-sm font-bold text-slate-900">Freunde von {friend.name?.split(" ")[0]}</h2>
              <button
                onClick={() => {
                  setIsFriendsModalOpen(false);
                  setFriendsList([]);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-grow overflow-y-auto p-5">
              {isLoadingFriends ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-brand-green-600" />
                  <p className="text-xs text-slate-450 mt-3 font-medium">Freunde werden geladen...</p>
                </div>
              ) : friendsList.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                  {friendsList.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 first:pt-2 last:pb-2">
                      <Link
                        href={`/profile/${f.id}`}
                        onClick={() => setIsFriendsModalOpen(false)}
                        className="flex items-center gap-3 hover:opacity-85 active:scale-[0.98] transition-all cursor-pointer group flex-1"
                      >
                        {/* Avatar */}
                        <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full font-bold text-xs shadow-sm group-hover:scale-105 transition-transform duration-200 bg-slate-200 text-slate-600 border border-slate-300/40`}>
                          {f.avatarUrl ? (
                            <img
                              src={f.avatarUrl}
                              alt="Profilbild"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(f.full_name, f.username)
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-green-700 transition-colors">
                            {f.full_name ?? "User"}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {f.username ? `@${f.username}` : ""}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    Noch keine Freunde
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
