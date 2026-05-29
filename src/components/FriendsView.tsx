"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Search, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  Clock, 
  Loader2, 
  User, 
  Check, 
  X,
  MoreVertical,
  Share2,
  Sparkles
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";


interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
}

interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted";
}

interface FriendsViewProps {
  currentUser: {
    id: string;
    email: string;
    name: string | null;
    username: string | null;
  };
}

export default function FriendsView({ currentUser }: FriendsViewProps) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendsList, setFriendsList] = useState<(Profile & { friendshipId: string })[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<(Profile & { friendshipId: string })[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<(Profile & { friendshipId: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingIds, setSubmittingIds] = useState<Record<string, boolean>>({});
  const [activeDropdownFriendId, setActiveDropdownFriendId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShareInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/profile/${currentUser.id}?invite=true`;
    const shareData = {
      title: "places4friends",
      text: "Lass uns auf places4friends befreundet sein, um unsere Lieblingsorte auf einer gemeinsamen Karte zu sehen!",
      url: inviteUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    }
  };

  const getAvatarPublicUrl = (path?: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  // Fetch friendships and classify them
  const fetchFriendships = useCallback(async () => {
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
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

    if (error) {
      console.error("Error fetching friendships:", error);
      setIsLoading(false);
      return;
    }

    const friends: (Profile & { friendshipId: string })[] = [];
    const incoming: (Profile & { friendshipId: string })[] = [];
    const outgoing: (Profile & { friendshipId: string })[] = [];
    const rawFriendshipsList: Friendship[] = [];

    type DBFriendshipResult = {
      id: string;
      sender_id: string;
      receiver_id: string;
      status: "pending" | "accepted";
      sender: Profile;
      receiver: Profile;
    };

    (data as unknown as DBFriendshipResult[] | null)?.forEach((row) => {
      rawFriendshipsList.push({
        id: row.id,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        status: row.status,
      });

      const otherUser = row.sender_id === currentUser.id ? row.receiver : row.sender;
      if (!otherUser) return;

      if (row.status === "accepted") {
        friends.push({
          id: otherUser.id,
          username: otherUser.username,
          full_name: otherUser.full_name,
          avatar_url: otherUser.avatar_url,
          avatarUrl: getAvatarPublicUrl(otherUser.avatar_url),
          friendshipId: row.id,
        });
      } else if (row.status === "pending" && row.receiver_id === currentUser.id) {
        incoming.push({
          id: otherUser.id,
          username: otherUser.username,
          full_name: otherUser.full_name,
          avatar_url: otherUser.avatar_url,
          avatarUrl: getAvatarPublicUrl(otherUser.avatar_url),
          friendshipId: row.id,
        });
      } else if (row.status === "pending" && row.sender_id === currentUser.id) {
        outgoing.push({
          id: otherUser.id,
          username: otherUser.username,
          full_name: otherUser.full_name,
          avatar_url: otherUser.avatar_url,
          avatarUrl: getAvatarPublicUrl(otherUser.avatar_url),
          friendshipId: row.id,
        });
      }
    });

    setFriendships(rawFriendshipsList);
    setFriendsList(friends);
    setIncomingRequests(incoming);
    setOutgoingRequests(outgoing);
    setIsLoading(false);
  }, [currentUser.id, supabase]);

  useEffect(() => {
    let active = true;
    let channel: any = null;

    async function initSubscription() {
      await fetchFriendships();

      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;

      channel = supabase
        .channel("friends-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friendships",
          },
          () => {
            fetchFriendships();
          }
        )
        .subscribe();
    }

    initSubscription();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchFriendships, supabase]);

  // Handle Search Query Submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const queryValue = `%${searchQuery.trim()}%`;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .or(`username.ilike.${queryValue},full_name.ilike.${queryValue}`)
      .neq("id", currentUser.id)
      .limit(15);

    if (error) {
      console.error("Error searching profiles:", error);
      setIsSearching(false);
      return;
    }

    const enriched = (data || []).map((profile) => ({
      ...profile,
      avatarUrl: getAvatarPublicUrl(profile.avatar_url),
    }));
    setSearchResults(enriched);
    setIsSearching(false);
  };

  // Search results are cleared directly via input change handler

  // Get current friendship status relative to a profile
  const getRelationship = (profileId: string) => {
    const rel = friendships.find(
      (f) =>
        (f.sender_id === currentUser.id && f.receiver_id === profileId) ||
        (f.receiver_id === currentUser.id && f.sender_id === profileId)
    );
    if (!rel) return null;
    return {
      id: rel.id,
      status: rel.status,
      isSender: rel.sender_id === currentUser.id,
    };
  };

  // Send a friendship request
  const sendRequest = async (targetUserId: string) => {
    setSubmittingIds((prev) => ({ ...prev, [targetUserId]: true }));
    
    const { error } = await supabase
      .from("friendships")
      .insert({
        sender_id: currentUser.id,
        receiver_id: targetUserId,
        status: "pending",
      });

    if (error) {
      console.error("Error sending request:", error);
    } else {
      await fetchFriendships();
    }
    setSubmittingIds((prev) => ({ ...prev, [targetUserId]: false }));
  };

  // Accept an incoming request
  const acceptRequest = async (friendshipId: string, senderId: string) => {
    setSubmittingIds((prev) => ({ ...prev, [senderId]: true }));

    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (error) {
      console.error("Error accepting request:", error);
    } else {
      await fetchFriendships();
    }
    setSubmittingIds((prev) => ({ ...prev, [senderId]: false }));
  };

  // Delete/Decline/Cancel request or friendship
  const deleteFriendship = async (friendshipId: string, otherUserId: string) => {
    setSubmittingIds((prev) => ({ ...prev, [otherUserId]: true }));

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      console.error("Error deleting relationship:", error);
    } else {
      await fetchFriendships();
    }
    setSubmittingIds((prev) => ({ ...prev, [otherUserId]: false }));
  };

  // Get initials for profile placeholder
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-24 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <div className="w-16" /> {/* Left Spacer to center title */}
        <h1 className="text-sm font-bold text-slate-900">Freunde & Anfragen</h1>
        <div className="w-16" />
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white px-4 py-2 sticky top-14 z-10">
        <button
          onClick={() => setActiveTab("friends")}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "friends"
              ? "border-brand-green-700 text-brand-green-700 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Freunde
          {friendsList.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
              {friendsList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "requests"
              ? "border-brand-green-700 text-brand-green-700 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Anfragen
          {incomingRequests.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-brand-green-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-green-800 animate-pulse">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>
      <div className="flex-1 px-4 pt-5 page-transition">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-brand-green-600" />
            <p className="text-xs text-slate-400 mt-3 font-medium">Daten werden geladen...</p>
          </div>
        ) : (
          <>
            {/* MY FRIENDS TAB */}
            {activeTab === "friends" && (
              <div className="space-y-4">
                {/* Per Link einladen card */}
                <div className="rounded-2xl border border-brand-green-100 bg-gradient-to-br from-brand-green-50/30 to-brand-green-50/70 p-4 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-green-100 text-brand-green-700 flex-shrink-0">
                      <Sparkles className="h-4 w-4 fill-brand-green-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-slate-900">
                        Freunde per Link einladen
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Teile deinen persönlichen Einladungslink mit Freunden. Sobald sie ihn öffnen, seid ihr direkt befreundet.
                      </p>
                      
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={handleShareInviteLink}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 text-white font-bold px-4 py-2 cursor-pointer text-[10px] transition-all active:scale-[0.97] shadow-sm shadow-brand-green-700/10"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>{copied ? "Link kopiert!" : "Einladungslink teilen"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {friendsList.length > 0 && (
                  <button
                    onClick={() => setIsSearchModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 text-white font-bold py-3.5 px-4 shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer text-xs"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Freunde suchen & hinzufügen</span>
                  </button>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Befreundete User
                  </h3>
                </div>

                {friendsList.length > 0 ? (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                    {friendsList.map((friend) => {
                      const isSubmitting = !!submittingIds[friend.id];

                      return (
                        <div key={friend.id} className="flex items-center justify-between p-3 first:pt-2 last:pb-2">
                          <Link
                            href={`/profile/${friend.id}`}
                            className="flex items-center gap-3 hover:opacity-80 active:scale-[0.98] transition-all cursor-pointer group"
                          >
                            {/* Avatar */}
                            <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full font-bold text-xs shadow-sm group-hover:scale-105 transition-transform duration-200 ${
                              friend.avatarUrl 
                                ? "bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white" 
                                : "bg-slate-200 text-slate-600 border border-slate-300/40"
                            }`}>
                              {friend.avatarUrl ? (
                                <img
                                  src={friend.avatarUrl}
                                  alt="Profilbild"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(friend.full_name, friend.username)
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-green-700 transition-colors">
                                {friend.full_name ?? "User"}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {friend.username ? `@${friend.username}` : ""}
                              </p>
                            </div>
                          </Link>

                          <div className="relative flex items-center">
                            {isSubmitting ? (
                              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            ) : (
                              <>
                                <button
                                  onClick={() => setActiveDropdownFriendId(activeDropdownFriendId === friend.id ? null : friend.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer"
                                  title="Optionen anzeigen"
                                >
                                  <MoreVertical className="h-4.5 w-4.5" />
                                </button>

                                {activeDropdownFriendId === friend.id && (
                                  <>
                                    {/* Backdrop */}
                                    <div
                                      className="fixed inset-0 z-40 bg-transparent"
                                      onClick={() => setActiveDropdownFriendId(null)}
                                    />
                                    {/* Dropdown Menu */}
                                    <div className="absolute right-0 top-full mt-1 w-36 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                                      <button
                                        onClick={() => {
                                          setActiveDropdownFriendId(null);
                                          deleteFriendship(friend.friendshipId, friend.id);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 active:scale-98 transition-all cursor-pointer text-left"
                                      >
                                        <UserMinus className="h-3.5 w-3.5" />
                                        <span>Freund entfernen</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
                    <User className="h-9 w-9 text-slate-300 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 mt-3">Noch keine Freunde</h4>
                    <p className="text-[11px] text-slate-450 max-w-xs mx-auto mt-1 px-4 leading-relaxed">
                      Suche nach anderen Usern, um ihre Empfehlungen auf deiner Karte freizuschalten.
                    </p>
                    <button
                      onClick={() => setIsSearchModalOpen(true)}
                      className="mt-4 inline-flex items-center gap-1 rounded-xl bg-brand-green-700 px-3.5 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-brand-green-800 transition-all cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Freunde finden</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* REQUESTS TAB */}
            {activeTab === "requests" && (
              <div className="space-y-6">
                {/* Eingehende Anfragen */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Eingehende Freundschaftsanfragen
                  </h3>
                  {incomingRequests.length > 0 ? (
                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                      {incomingRequests.map((req) => {
                        const isSubmitting = !!submittingIds[req.id];

                        return (
                          <div key={req.id} className="flex items-center justify-between p-3 first:pt-2 last:pb-2">
                            <Link
                              href={`/profile/${req.id}`}
                              className="flex items-center gap-3 hover:opacity-80 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                              {/* Avatar */}
                              <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full font-bold text-xs shadow-sm group-hover:scale-105 transition-transform duration-200 ${
                                req.avatarUrl 
                                  ? "bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white" 
                                  : "bg-slate-200 text-slate-600 border border-slate-300/40"
                              }`}>
                                {req.avatarUrl ? (
                                  <img
                                    src={req.avatarUrl}
                                    alt="Profilbild"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  getInitials(req.full_name, req.username)
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-green-700 transition-colors">
                                  {req.full_name ?? "User"}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {req.username ? `@${req.username}` : ""}
                                </p>
                              </div>
                            </Link>

                            <div className="flex items-center gap-2">
                              {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => acceptRequest(req.friendshipId, req.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green-50 text-brand-green-700 hover:bg-brand-green-100 hover:text-brand-green-800 transition-all cursor-pointer"
                                    title="Anfrage annehmen"
                                  >
                                    <Check className="h-4 w-4 stroke-[2.5]" />
                                  </button>
                                  <button
                                    onClick={() => deleteFriendship(req.friendshipId, req.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-650 transition-all cursor-pointer"
                                    title="Anfrage ablehnen"
                                  >
                                    <X className="h-4 w-4 stroke-[2.5]" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center">
                      <Clock className="h-7 w-7 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 mt-2 font-medium">Keine eingehenden Anfragen</p>
                    </div>
                  )}
                </div>

                {/* Ausgehende Anfragen */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ausgehende Freundschaftsanfragen
                  </h3>
                  {outgoingRequests.length > 0 ? (
                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                      {outgoingRequests.map((req) => {
                        const isSubmitting = !!submittingIds[req.id];

                        return (
                          <div key={req.id} className="flex items-center justify-between p-3 first:pt-2 last:pb-2">
                            <Link
                              href={`/profile/${req.id}`}
                              className="flex items-center gap-3 hover:opacity-80 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                              {/* Avatar */}
                              <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full font-bold text-xs shadow-sm group-hover:scale-105 transition-transform duration-200 ${
                                req.avatarUrl 
                                  ? "bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white" 
                                  : "bg-slate-200 text-slate-600 border border-slate-300/40"
                              }`}>
                                {req.avatarUrl ? (
                                  <img
                                    src={req.avatarUrl}
                                    alt="Profilbild"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  getInitials(req.full_name, req.username)
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-green-700 transition-colors">
                                  {req.full_name ?? "User"}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {req.username ? `@${req.username}` : ""}
                                </p>
                              </div>
                            </Link>

                            <div className="flex items-center gap-2">
                              {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                              ) : (
                                <button
                                  onClick={() => deleteFriendship(req.friendshipId, req.id)}
                                  className="flex h-8 px-2.5 items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-650 transition-all cursor-pointer text-[10px] font-bold"
                                  title="Anfrage zurückziehen"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Zurückziehen</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center">
                      <Clock className="h-7 w-7 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 mt-2 font-medium">Keine ausgehenden Anfragen</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl transition-all duration-350 flex flex-col min-h-[520px] max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-white">
              <h2 className="text-sm font-bold text-slate-900">Freunde suchen & hinzufügen</h2>
              <button
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex flex-1 items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
                  <Search className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (val.trim() === "") {
                        setSearchResults([]);
                      }
                    }}
                    placeholder="Username oder Name suchen..."
                    className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-green-800 active:scale-[0.97] transition-all cursor-pointer"
                >
                  Suchen
                </button>
              </form>

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Suchergebnisse
                </h3>

                {isSearching ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                    {searchResults.map((profile) => {
                      const rel = getRelationship(profile.id);
                      const isSubmitting = !!submittingIds[profile.id];

                      return (
                        <div key={profile.id} className="flex items-center justify-between p-3 first:pt-2 last:pb-2">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full font-bold text-xs shadow-sm ${
                              profile.avatarUrl 
                                ? "bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white" 
                                : "bg-slate-200 text-slate-600 border border-slate-300/40"
                            }`}>
                              {profile.avatarUrl ? (
                                <img
                                  src={profile.avatarUrl}
                                  alt="Profilbild"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(profile.full_name, profile.username)
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">
                                {profile.full_name ?? "User"}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {profile.username ? `@${profile.username}` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Relationship actions */}
                          <div className="flex items-center">
                            {isSubmitting ? (
                              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            ) : !rel ? (
                              <button
                                onClick={() => sendRequest(profile.id)}
                                className="flex items-center justify-center gap-1 rounded-lg bg-brand-green-50 px-2.5 py-1.5 text-[11px] font-bold text-brand-green-700 hover:bg-brand-green-100 transition-all cursor-pointer"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Hinzufügen</span>
                              </button>
                            ) : rel.status === "accepted" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-brand-green-50 px-2 py-1 text-[10px] font-bold text-brand-green-700 ring-1 ring-brand-green-600/15">
                                <UserCheck className="h-3 w-3" />
                                Befreundet
                              </span>
                            ) : rel.isSender ? (
                              <button
                                onClick={() => deleteFriendship(rel.id, profile.id)}
                                className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                                title="Anfrage zurückziehen"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>Ausstehend</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => acceptRequest(rel.id, profile.id)}
                                className="flex items-center justify-center gap-1 rounded-lg bg-brand-green-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-brand-green-800 transition-all cursor-pointer"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Annehmen</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : searchQuery.trim() !== "" ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center flex flex-col items-center justify-center min-h-[260px]">
                    <User className="h-8 w-8 text-slate-300 mb-3" />
                    <p className="text-xs text-slate-450 mt-2 font-medium">Keine Profile gefunden</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center flex flex-col items-center justify-center min-h-[260px]">
                    <Search className="h-8 w-8 text-slate-300 mb-3" />
                    <p className="text-xs text-slate-400 font-medium max-w-[200px] leading-relaxed">
                      Finde deine Freunde über ihren Namen oder Username
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
