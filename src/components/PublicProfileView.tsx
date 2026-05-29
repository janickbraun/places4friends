"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, MapPin, X, Loader2, UserPlus, UserCheck, Clock, UserMinus, MessageCircle, MoreVertical, Pencil, Trash2, Sparkles } from "lucide-react";
import ActivityCard from "./ActivityCard";
import { createClient } from "@/lib/supabase/client";

interface ActivityComment {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  userAvatarUrl?: string | null;
  content: string;
  createdAt: string;
}

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
  isInvite = false,
}: {
  friend: User;
  friendsCount?: number;
  places?: PlaceItem[];
  initialWishlistedIds?: string[];
  initialFriendship?: Friendship | null;
  currentUserId: string;
  isInvite?: boolean;
}) {
  const [wishlistIds, setWishlistIds] = useState<string[]>(initialWishlistedIds);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendship, setFriendship] = useState<Friendship | null>(initialFriendship);
  const [isSubmittingFriendship, setIsSubmittingFriendship] = useState(false);
  const [localFriendsCount, setLocalFriendsCount] = useState(friendsCount);
  const [commentsByPlace, setCommentsByPlace] = useState<Record<string, ActivityComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string | null>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentInput, setEditingCommentInput] = useState("");
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
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

  const handleAcceptInvite = async () => {
    setIsSubmittingFriendship(true);
    try {
      const response = await fetch("/api/friendships/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeId: friend.id }),
      });

      if (!response.ok) {
        throw new Error("Invite API call failed");
      }

      const result = await response.json();

      if (result.fallback) {
        // Fallback: use client-side supabase calls
        if (friendship && friendship.status === "pending" && friendship.sender_id !== currentUserId) {
          await acceptFriendRequest();
        } else if (!friendship) {
          await sendFriendRequest();
        }
      } else if (result.success && result.friendship) {
        const wasAccepted = friendship?.status === "accepted";
        setFriendship(result.friendship);
        if (result.friendship.status === "accepted" && !wasAccepted) {
          setLocalFriendsCount((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error("Error accepting invite:", err);
      // Fallback: use client-side supabase calls
      if (friendship && friendship.status === "pending" && friendship.sender_id !== currentUserId) {
        await acceptFriendRequest();
      } else if (!friendship) {
        await sendFriendRequest();
      }
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

  useEffect(() => {
    if (places.length === 0) {
      setCommentsByPlace({});
      return;
    }

    const activityIds = places.map((item) => item.id);
    let isActive = true;

    const loadComments = async () => {
      const { data, error } = await supabase
        .from("activity_comments")
        .select(
          "id, activity_id, user_id, content, created_at, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)"
        )
        .in("activity_id", activityIds)
        .order("created_at", { ascending: true });

      if (!isActive) return;

      if (error) {
        setCommentsByPlace({});
        return;
      }

      const grouped: Record<string, ActivityComment[]> = {};
      (data || []).forEach((row: any) => {
        const profile = row.profiles;
        const name = profile?.full_name ?? profile?.username ?? "Nutzer";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";

        let avatarUrl: string | null = null;
        if (profile?.avatar_url) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
          avatarUrl = urlData?.publicUrl ?? null;
        }

        const comment: ActivityComment = {
          id: row.id,
          activityId: row.activity_id,
          userId: row.user_id,
          userName: name,
          userInitials: initials,
          userColor: getUserColorClass(row.user_id),
          content: row.content,
          createdAt: row.created_at,
          userAvatarUrl: avatarUrl,
        };

        if (!grouped[comment.activityId]) {
          grouped[comment.activityId] = [];
        }
        grouped[comment.activityId].push(comment);
      });

      setCommentsByPlace(grouped);
    };

    loadComments().catch(() => {
      if (!isActive) return;
      setCommentsByPlace({});
    });

    return () => {
      isActive = false;
    };
  }, [places, currentUserId]);

  const toggleComments = (placeId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [placeId]: !prev[placeId],
    }));
  };

  const updateCommentInput = (placeId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [placeId]: value }));
  };

  const startEditComment = (comment: ActivityComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentInput(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentInput("");
  };

  const reloadCommentsForPlace = async (placeId: string) => {
    setLoadingComments((prev) => ({ ...prev, [placeId]: true }));
    const { data, error } = await supabase
      .from("activity_comments")
      .select(
        "id, activity_id, user_id, content, created_at, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)"
      )
      .eq("activity_id", placeId)
      .order("created_at", { ascending: true });

    if (error) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentare konnten nicht geladen werden." }));
      setLoadingComments((prev) => ({ ...prev, [placeId]: false }));
      return;
    }

    const loaded = (data || []).map((row: any) => {
      const profile = row.profiles;
      const name = profile?.full_name ?? profile?.username ?? "Nutzer";
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";

      let avatarUrl: string | null = null;
      if (profile?.avatar_url) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
        avatarUrl = `${urlData?.publicUrl}?t=${Date.now()}`;
      }

      return {
        id: row.id,
        activityId: row.activity_id,
        userId: row.user_id,
        userName: name,
        userInitials: initials,
        userColor: getUserColorClass(row.user_id),
        content: row.content,
        createdAt: row.created_at,
        userAvatarUrl: avatarUrl,
      } as ActivityComment;
    });

    setCommentsByPlace((prev) => ({ ...prev, [placeId]: loaded }));
    setCommentErrors((prev) => ({ ...prev, [placeId]: null }));
    setLoadingComments((prev) => ({ ...prev, [placeId]: false }));
  };

  const handleAddComment = async (placeId: string) => {
    if (!currentUserId) return;
    const content = (commentInputs[placeId] || "").trim();
    if (!content) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar fehlt." }));
      return;
    }

    setSavingCommentId(placeId);
    setCommentErrors((prev) => ({ ...prev, [placeId]: null }));

    const { error } = await supabase.from("activity_comments").insert({
      activity_id: placeId,
      user_id: currentUserId,
      content,
    });

    if (error) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar konnte nicht gespeichert werden." }));
    } else {
      setCommentInputs((prev) => ({ ...prev, [placeId]: "" }));
      await reloadCommentsForPlace(placeId);
    }

    setSavingCommentId(null);
  };

  const handleUpdateComment = async (placeId: string, commentId: string) => {
    const content = editingCommentInput.trim();
    if (!content) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar fehlt." }));
      return;
    }

    setSavingCommentId(placeId);
    setCommentErrors((prev) => ({ ...prev, [placeId]: null }));

    const { error } = await supabase
      .from("activity_comments")
      .update({ content })
      .eq("id", commentId);

    if (error) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar konnte nicht gespeichert werden." }));
    } else {
      cancelEditComment();
      await reloadCommentsForPlace(placeId);
    }

    setSavingCommentId(null);
  };

  const handleDeleteComment = async (placeId: string, commentId: string) => {
    if (!globalThis.confirm("Kommentar wirklich löschen?")) return;

    setCommentDeletingId(commentId);
    setCommentErrors((prev) => ({ ...prev, [placeId]: null }));

    const { error } = await supabase
      .from("activity_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar konnte nicht gelöscht werden." }));
    } else {
      await reloadCommentsForPlace(placeId);
    }

    setCommentDeletingId(null);
  };

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
        {isInvite && (!friendship || friendship.status === "pending") && (
          <div className="mb-6 rounded-2xl border border-brand-green-100 bg-gradient-to-br from-brand-green-50/40 to-brand-green-50 p-4 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-green-100 text-brand-green-700 flex-shrink-0">
                <Sparkles className="h-4 w-4 fill-brand-green-200" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-900">
                  Einladung von {friend.name?.split(" ")[0] ?? "Freund"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Verbinde dich direkt, um eure Lieblingsorte gegenseitig auf der Karte zu sehen und Highlights zu teilen.
                </p>
                
                <div className="mt-3.5">
                  {isSubmittingFriendship ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-[10px] font-bold text-slate-400"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Verbinden...</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAcceptInvite}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 text-white font-bold px-4 py-2 cursor-pointer text-[10px] transition-all active:scale-[0.97] shadow-sm shadow-brand-green-700/10"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Einladung annehmen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                    bottomLeftActions={
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleWishlist(place.id)}
                          className={`flex items-center justify-center active:scale-90 transition-all cursor-pointer p-1 ${
                            wishlistIds.includes(place.id)
                              ? "text-brand-green-700"
                              : "text-slate-500 hover:text-brand-green-800"
                          }`}
                          title={wishlistIds.includes(place.id) ? "Aus Wishlist entfernen" : "In Wishlist speichern"}
                        >
                          <Bookmark
                            className="h-5 w-5 transition-colors"
                            fill={wishlistIds.includes(place.id) ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleComments(place.id)}
                          className="flex items-center gap-1.5 justify-center text-slate-500 hover:text-brand-green-800 active:scale-90 transition-all cursor-pointer p-1"
                          title="Kommentare"
                        >
                          <MessageCircle className="h-4.5 w-4.5 transition-colors" />
                          {(commentsByPlace[place.id]?.length ?? 0) > 0 && (
                            <span className="text-[11px] font-semibold select-none">
                              {commentsByPlace[place.id].length}
                            </span>
                          )}
                        </button>
                      </div>
                    }
                  >
                    {expandedComments[place.id] && (
                      <div className="mt-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold uppercase tracking-wide">Kommentare</span>
                        </div>

                        {commentErrors[place.id] && (
                          <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[10px] text-red-700">
                            {commentErrors[place.id]}
                          </div>
                        )}

                        {loadingComments[place.id] ? (
                          <div className="mt-2 text-[10px] text-slate-500">
                            Kommentare werden geladen...
                          </div>
                        ) : (commentsByPlace[place.id] ?? []).length === 0 ? (
                          <div className="mt-2 text-[10px] text-slate-500">
                            Noch keine Kommentare.
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {(commentsByPlace[place.id] ?? []).map((comment) => (
                              <div key={comment.id} className="flex gap-2">
                                <Link href={`/profile/${comment.userId}`} className="flex-shrink-0 hover:opacity-80 active:scale-[0.98] transition-all cursor-pointer">
                                  <div className={`flex h-5 w-5 items-center justify-center overflow-hidden rounded-full font-bold text-[8px] flex-shrink-0 ${
                                    comment.userAvatarUrl 
                                      ? "bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white" 
                                      : `${comment.userColor} text-white`
                                  }`}>
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
                                </Link>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Link href={`/profile/${comment.userId}`} className="hover:text-brand-green-700 hover:underline cursor-pointer">
                                      <span className="text-[10px] font-semibold text-slate-700">
                                        {comment.userName}
                                      </span>
                                    </Link>
                                    <span className="text-[9px] text-slate-400">
                                      {formatCommentTimestamp(comment.createdAt)}
                                    </span>
                                    {currentUserId === comment.userId && editingCommentId !== comment.id && (
                                      <div className="ml-auto relative">
                                        <button
                                          type="button"
                                          onClick={() => setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id)}
                                          className="flex h-5 w-5 items-center justify-center rounded-lg text-slate-450 hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer"
                                          title="Kommentaroptionen"
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </button>

                                        {activeCommentMenuId === comment.id && (
                                          <>
                                            <div
                                              className="fixed inset-0 z-35 bg-transparent"
                                              onClick={() => setActiveCommentMenuId(null)}
                                            />
                                            <div className="absolute right-0 top-full mt-0.5 w-28 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-40 animate-in fade-in slide-in-from-top-1 duration-100">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveCommentMenuId(null);
                                                  startEditComment(comment);
                                                }}
                                                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer text-left"
                                              >
                                                <Pencil className="h-3 w-3 text-slate-400" />
                                                <span>Bearbeiten</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveCommentMenuId(null);
                                                  handleDeleteComment(place.id, comment.id);
                                                }}
                                                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-rose-650 hover:bg-rose-50 active:scale-98 transition-all cursor-pointer text-left"
                                              >
                                                <Trash2 className="h-3 w-3 text-rose-500" />
                                                <span>Löschen</span>
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {editingCommentId === comment.id ? (
                                    <div className="mt-1 flex gap-2">
                                      <input
                                        value={editingCommentInput}
                                        onChange={(e) => setEditingCommentInput(e.target.value)}
                                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-brand-green-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateComment(place.id, comment.id)}
                                        disabled={savingCommentId === place.id || editingCommentInput.trim().length === 0}
                                        className="rounded-lg bg-brand-green-700 px-2 py-1 text-[9px] font-semibold text-white disabled:opacity-60 cursor-pointer"
                                      >
                                        {savingCommentId === place.id ? "..." : "OK"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEditComment}
                                        className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 cursor-pointer"
                                      >
                                        X
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-600 leading-snug">
                                      {comment.content}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentUserId ? (
                          <div className="mt-3 flex gap-2">
                            <input
                              value={commentInputs[place.id] ?? ""}
                              onChange={(e) => updateCommentInput(place.id, e.target.value)}
                              placeholder="Kommentar schreiben"
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-brand-green-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(place.id)}
                              disabled={savingCommentId === place.id || !(commentInputs[place.id] || "").trim()}
                              className="rounded-lg bg-brand-green-700 px-3 py-1.5 text-[10px] font-semibold text-white transition-all disabled:opacity-60 cursor-pointer"
                            >
                              {savingCommentId === place.id ? "..." : "Senden"}
                            </button>
                          </div>
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

function getUserColorClass(userId: string): string {
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
  for (let i = 0; i < userId.length; i++) {
    sum += userId.charCodeAt(i);
  }
  return colors[sum % colors.length];
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
