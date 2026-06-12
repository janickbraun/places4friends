"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Plus, User, Activity, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const supabase = createClient();
  const { emailVerified } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [unseenActivitiesCount, setUnseenActivitiesCount] = useState(0);

  useEffect(() => {
    let active = true;
    let friendshipsChannel: any = null;
    let activitiesChannel: any = null;
    let currentUserId: string | null = null;
    let lastSeenActivitiesAt: string | null = null;
    let acceptedFriendIds: string[] = [];
    const isActivitiesPath = pathname.startsWith("/activities");

    const markActivitiesAsSeen = async () => {
      if (!currentUserId) return;
      const seenAt = new Date().toISOString();
      const { error } = await supabase.auth.updateUser({
        data: { last_activities_seen_at: seenAt },
      });

      if (!error && active) {
        lastSeenActivitiesAt = seenAt;
        setUnseenActivitiesCount(0);
      }
    };

    const fetchAcceptedFriendIds = async (userId: string) => {
      const { data, error } = await supabase
        .from("friendships")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "accepted");

      if (error || !active) return [];

      return (data || []).map((friendship) =>
        friendship.sender_id === userId ? friendship.receiver_id : friendship.sender_id
      );
    };

    const fetchUnseenActivitiesCount = async (friendIds: string[]) => {
      if (!active || friendIds.length === 0 || isActivitiesPath) {
        if (active) setUnseenActivitiesCount(0);
        return;
      }

      if (!lastSeenActivitiesAt) {
        const { count, error } = await supabase
          .from("activities")
          .select("*", { count: "exact", head: true })
          .in("user_id", friendIds);

        if (!error && count !== null && active) {
          setUnseenActivitiesCount(count);
        }
        return;
      }

      const { count, error } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .in("user_id", friendIds)
        .gt("created_at", lastSeenActivitiesAt);

      if (!error && count !== null && active) {
        setUnseenActivitiesCount(count);
      }
    };

    async function loadPendingCount() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) {
          setPendingCount(0);
          setUnseenActivitiesCount(0);
          return;
        }
        currentUserId = user.id;
        lastSeenActivitiesAt =
          typeof user.user_metadata?.last_activities_seen_at === "string"
            ? user.user_metadata.last_activities_seen_at
            : null;

        const fetchCount = async () => {
          const { count, error } = await supabase
            .from("friendships")
            .select("*", { count: "exact", head: true })
            .eq("receiver_id", user.id)
            .eq("status", "pending");

          if (!error && count !== null && active) {
            setPendingCount(count);
          }
        };

        await fetchCount();
        acceptedFriendIds = await fetchAcceptedFriendIds(user.id);

        if (isActivitiesPath) {
          await markActivitiesAsSeen();
        } else {
          await fetchUnseenActivitiesCount(acceptedFriendIds);
        }

        friendshipsChannel = supabase
          .channel("pending-friendships")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "friendships",
            },
            () => {
              fetchCount();
              if (!currentUserId) return;
              fetchAcceptedFriendIds(currentUserId).then((friendIds) => {
                acceptedFriendIds = friendIds;
                if (isActivitiesPath) {
                  markActivitiesAsSeen();
                } else {
                  fetchUnseenActivitiesCount(acceptedFriendIds);
                }
              });
            }
          )
          .subscribe();

        activitiesChannel = supabase
          .channel("friend-activities")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "activities",
            },
            (payload) => {
              if (!currentUserId) return;
              const newActivityUserId = payload.new?.user_id as string | undefined;
              if (!newActivityUserId || !acceptedFriendIds.includes(newActivityUserId)) return;

              if (isActivitiesPath) {
                markActivitiesAsSeen();
                return;
              }

              fetchUnseenActivitiesCount(acceptedFriendIds);
            }
          )
          .subscribe();
      } catch (err) {
        console.error("Error loading pending count:", err);
      }
    }

    loadPendingCount();

    return () => {
      active = false;
      if (friendshipsChannel) {
        supabase.removeChannel(friendshipsChannel);
      }
      if (activitiesChannel) {
        supabase.removeChannel(activitiesChannel);
      }
    };
  }, [pathname, supabase]);

  const isTabActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    if (path === "/profile") {
      return pathname === "/profile" || pathname.startsWith("/profile/settings");
    }
    if (path === "/profile/friends") {
      return pathname.startsWith("/profile/friends");
    }
    return pathname.startsWith(path);
  };

  const getTabClass = (path: string) => {
    const active = isTabActive(path);
    return `flex flex-col items-center justify-center gap-1 w-16 py-2 rounded-xl transition-all duration-200 ${
      active
        ? "text-brand-green-600 font-bold scale-105"
        : "text-slate-400 hover:text-slate-600 active:scale-95"
    }`;
  };

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 w-full border-t border-slate-100 bg-white/90 pb-safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div className="flex h-16 items-center justify-around px-2">
        {/* Map Tab */}
        <Link
          href="/"
          className={getTabClass("/")}
          onClick={() => {
            if (pathname === "/") {
              window.dispatchEvent(new CustomEvent("reset-map-zoom"));
            }
          }}
        >
          <MapPin className={`h-5 w-5 transition-all duration-200 ${isTabActive("/") ? "stroke-[2.6]" : "stroke-[2]"}`} />
          <span className="text-[10px] tracking-wide">Karte</span>
        </Link>

        {/* Activities Tab */}
        <Link href="/activities" className={getTabClass("/activities")}>
          <div className="relative">
            <Activity className={`h-5 w-5 transition-all duration-200 ${isTabActive("/activities") ? "stroke-[2.6]" : "stroke-[2]"}`} />
            {unseenActivitiesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-green-600 text-[8px] font-extrabold text-white ring-2 ring-white">
                {unseenActivitiesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wide">Aktivitäten</span>
        </Link>

        {/* Create / Recommend Tab */}
        <Link href="/create" className={getTabClass("/create")}>
          <Plus className={`h-5 w-5 transition-all duration-200 ${isTabActive("/create") ? "stroke-[2.8]" : "stroke-[2]"}`} />
          <span className="text-[10px] tracking-wide">Empfehlen</span>
        </Link>

        {/* Friends Tab */}
        <Link href="/profile/friends" className={getTabClass("/profile/friends")}>
          <div className="relative">
            <Users className={`h-5 w-5 transition-all duration-200 ${isTabActive("/profile/friends") ? "stroke-[2.6]" : "stroke-[2]"}`} />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-green-600 text-[8px] font-extrabold text-white ring-2 ring-white">
                {pendingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wide">Freunde</span>
        </Link>

        {/* Profile Tab */}
        <Link href="/profile" className={getTabClass("/profile")}>
          <div className="relative">
            <User className={`h-5 w-5 transition-all duration-200 ${isTabActive("/profile") ? "stroke-[2.6]" : "stroke-[2]"}`} />
            {!emailVerified && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-green-600 text-[8px] font-extrabold text-white ring-2 ring-white">
                1
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wide">Profil</span>
        </Link>
      </div>


    </nav>
  );
}
