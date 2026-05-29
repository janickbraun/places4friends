"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Compass, Bookmark, MessageCircle, Loader2, X } from "lucide-react";
import ActivityCard from "./ActivityCard";
import { createClient } from "@/lib/supabase/client";

interface FriendInfo {
  id: string;
  name: string;
  username: string;
  initials: string;
  color: string;
  avatarUrl?: string | null;
}

interface ActivityComment {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  userAvatarUrl?: string | null;
  content: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  placeName: string;
  isMustSee: boolean;
  description: string;
  categories: string[];
  timestamp: string;
  friend: FriendInfo;
  latitude?: number | null;
  longitude?: number | null;
  imageUrls?: string[];
}

export default function ActivitiesView({
  activities = [],
  initialWishlistedIds = [],
}: {
  activities?: ActivityItem[];
  initialWishlistedIds?: string[];
}) {
  const supabase = createClient();
  const [wishlistIds, setWishlistIds] = useState<string[]>(initialWishlistedIds);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<ActivityItem | null>(null);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentSaving, setIsCommentSaving] = useState(false);

  useEffect(() => {
    setWishlistIds(initialWishlistedIds);
  }, [initialWishlistedIds]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

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

  const getAvatarPublicUrl = (path?: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const getUserColorClass = (id: string): string => {
    const colors = [
      "bg-emerald-600",
      "bg-rose-500",
      "bg-amber-600",
      "bg-blue-600",
      "bg-indigo-600",
      "bg-violet-600",
      "bg-fuchsia-600",
      "bg-cyan-600",
    ];
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const fetchComments = async (activityId: string) => {
    setIsCommentsLoading(true);
    setCommentError(null);

    const { data, error } = await supabase
      .from("activity_comments")
      .select(
        "id, content, created_at, user_id, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)"
      )
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });

    if (error) {
      setComments([]);
      setCommentError("Kommentare konnten nicht geladen werden.");
    } else {
      const loaded = (data || []).map((row: any) => {
        const profile = row.profiles;
        const name = profile?.full_name ?? profile?.username ?? "Nutzer";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";
        const avatarUrl = getAvatarPublicUrl(profile?.avatar_url);

        return {
          id: row.id,
          userId: row.user_id,
          userName: name,
          userInitials: initials,
          userColor: getUserColorClass(row.user_id),
          userAvatarUrl: avatarUrl,
          content: row.content,
          createdAt: row.created_at,
        } as ActivityComment;
      });
      setComments(loaded);
    }

    setIsCommentsLoading(false);
  };

  const toggleComments = async (activity: ActivityItem) => {
    if (activeActivity?.id === activity.id) {
      setActiveActivity(null);
      setComments([]);
      setCommentInput("");
      setCommentError(null);
      return;
    }

    setActiveActivity(activity);
    setCommentInput("");
    await fetchComments(activity.id);
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !activeActivity) return;
    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentError("Kommentar fehlt.");
      return;
    }

    setIsCommentSaving(true);
    setCommentError(null);

    const { error } = await supabase.from("activity_comments").insert({
      activity_id: activeActivity.id,
      user_id: userId,
      content: trimmed,
    });

    if (error) {
      setCommentError("Kommentar konnte nicht gespeichert werden.");
    } else {
      setCommentInput("");
      await fetchComments(activeActivity.id);
    }

    setIsCommentSaving(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <h1 className="text-lg font-bold text-slate-900">Aktivitäten</h1>
      </header>

      <div className="flex-grow overflow-y-auto px-4 pt-6 page-transition">
        {/* Title & Description */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Feed deiner Freunde
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hier siehst du die neuesten Empfehlungen von Leuten, denen du folgst.
          </p>
        </div>
        {/* Activities List */}
        <div className="space-y-4 pb-8">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                id={activity.id}
                placeName={activity.placeName}
                latitude={activity.latitude}
                longitude={activity.longitude}
                isMustSee={activity.isMustSee}
                description={activity.description}
                categories={activity.categories}
                timestamp={activity.timestamp}
                friend={activity.friend}
                imageUrls={activity.imageUrls}
                actions={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleComments(activity)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-white hover:bg-slate-50 active:scale-90 transition-all cursor-pointer shadow-sm"
                      title="Kommentare"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-slate-400 hover:text-brand-green-700 transition-colors" />
                    </button>
                    <button
                      onClick={() => toggleWishlist(activity.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-white hover:bg-slate-50 active:scale-90 transition-all cursor-pointer shadow-sm"
                      title={wishlistIds.includes(activity.id) ? "Aus Wishlist entfernen" : "In Wishlist speichern"}
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 transition-colors ${
                          wishlistIds.includes(activity.id)
                            ? "text-brand-green-700 fill-brand-green-700"
                            : "text-slate-400 hover:text-brand-green-700"
                        }`}
                      />
                    </button>
                  </div>
                }
              >
                {activeActivity?.id === activity.id && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold uppercase tracking-wide">Kommentare</span>
                      <button
                        type="button"
                        onClick={() => toggleComments(activity)}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        aria-label="Kommentare schliessen"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {commentError && (
                      <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[10px] text-red-700">
                        {commentError}
                      </div>
                    )}

                    {isCommentsLoading ? (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Kommentare werden geladen...
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="mt-2 text-[11px] text-slate-500">Noch keine Kommentare.</div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <div className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[9px] font-bold text-white ${comment.userColor}`}>
                              {comment.userAvatarUrl ? (
                                <img
                                  src={comment.userAvatarUrl}
                                  alt="Profilbild"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                comment.userInitials
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-slate-700">
                                  {comment.userName}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {formatCommentTimestamp(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-snug">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {userId ? (
                      <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                        <input
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Kommentar schreiben"
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none focus:border-brand-green-500"
                        />
                        <button
                          type="submit"
                          disabled={isCommentSaving || commentInput.trim().length === 0}
                          className="rounded-lg bg-brand-green-700 px-3 py-2 text-[10px] font-semibold text-white transition-all disabled:opacity-60"
                        >
                          {isCommentSaving ? "..." : "Senden"}
                        </button>
                      </form>
                    ) : (
                      <div className="mt-3 text-[10px] text-slate-500">
                        Melde dich an, um zu kommentieren.
                      </div>
                    )}
                  </div>
                )}
              </ActivityCard>
            ))
          ) : (
            /* Empty State */
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 px-6 text-center shadow-sm">
              <Compass className="h-9 w-9 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 mt-3">
                Noch keine Aktivitäten
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                Füge Freunde hinzu, um deren Empfehlungen und Aktivitäten hier zu sehen.
              </p>
              <Link
                href="/profile/friends"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-green-800 transition-all cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Freunde finden
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function formatCommentTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `vor ${Math.max(1, diffMins)} Min.`;
  }
  if (diffHours < 24) {
    return `vor ${diffHours} Std.`;
  }
  if (diffDays === 1) {
    return "gestern";
  }
  if (diffDays < 7) {
    return `vor ${diffDays} Tagen`;
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
