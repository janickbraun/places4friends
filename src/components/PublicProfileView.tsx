"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, MapPin } from "lucide-react";
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
}

export default function PublicProfileView({
  friend,
  friendsCount = 0,
  places = [],
  initialWishlistedIds = [],
}: {
  friend: User;
  friendsCount?: number;
  places?: PlaceItem[];
  initialWishlistedIds?: string[];
}) {
  const [wishlistIds, setWishlistIds] = useState<string[]>(initialWishlistedIds);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const supabase = createClient();

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
            <div className={`flex h-22 w-22 items-center justify-center rounded-full p-0.5 shadow-md ${friend.color}`}>
              {avatarPublicUrl ? (
                <img
                  src={avatarPublicUrl}
                  alt="Profilbild"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-slate-800 font-bold text-2xl">
                  {friend.initials}
                </div>
              )}
            </div>
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-950">
            {friend.name ?? "Freund"}
          </h2>
          {friend.username && (
            <p className="text-xs font-semibold text-brand-green-700 mt-0.5">
              @{friend.username}
            </p>
          )}

          {/* Stats Bar */}
          <div className="mt-6 flex w-full max-w-[280px] divide-x divide-slate-100 rounded-xl border border-slate-100 bg-white py-3 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="text-base font-extrabold text-slate-900">
                {places.length}
              </span>
              <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                Empfehlungen
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="text-base font-extrabold text-slate-900">
                {friendsCount}
              </span>
              <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                Freunde
              </span>
            </div>
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
        </div>
      </div>
    </div>
  );
}
