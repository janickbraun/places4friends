"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Search, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  Clock, 
  Loader2, 
  User, 
  Check, 
  X 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
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

  const [activeTab, setActiveTab] = useState<"search" | "friends" | "requests">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendsList, setFriendsList] = useState<(Profile & { friendshipId: string })[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<(Profile & { friendshipId: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingIds, setSubmittingIds] = useState<Record<string, boolean>>({});

  // Fetch friendships and classify them
  const fetchFriendships = useCallback(async () => {
    const { data, error } = await supabase
      .from("friendships")
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        sender:profiles!friendships_sender_id_fkey(id, username, full_name),
        receiver:profiles!friendships_receiver_id_fkey(id, username, full_name)
      `)
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

    if (error) {
      console.error("Error fetching friendships:", error);
      setIsLoading(false);
      return;
    }

    const friends: (Profile & { friendshipId: string })[] = [];
    const incoming: (Profile & { friendshipId: string })[] = [];
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
          friendshipId: row.id,
        });
      } else if (row.status === "pending" && row.receiver_id === currentUser.id) {
        incoming.push({
          id: otherUser.id,
          username: otherUser.username,
          full_name: otherUser.full_name,
          friendshipId: row.id,
        });
      }
    });

    setFriendships(rawFriendshipsList);
    setFriendsList(friends);
    setIncomingRequests(incoming);
    setIsLoading(false);
  }, [currentUser.id, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFriendships();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchFriendships]);

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
      .select("id, username, full_name")
      .or(`username.ilike.${queryValue},full_name.ilike.${queryValue}`)
      .neq("id", currentUser.id)
      .limit(15);

    if (error) {
      console.error("Error searching profiles:", error);
      setIsSearching(false);
      return;
    }

    setSearchResults(data || []);
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
        <Link 
          href="/profile" 
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-bold text-slate-900">Freunde & Anfragen</h1>
        <div className="w-8" /> {/* Spacer to center the title */}
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white px-4 py-2 sticky top-14 z-10">
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
            activeTab === "search"
              ? "border-brand-green-700 text-brand-green-700 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Hinzufügen
        </button>
        <button
          onClick={() => setActiveTab("friends")}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "friends"
              ? "border-brand-green-700 text-brand-green-700 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Meine Freunde
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
            {/* SEARCH TAB */}
            {activeTab === "search" && (
              <div className="space-y-5">
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
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white font-bold text-xs shadow-sm">
                                {getInitials(profile.full_name, profile.username)}
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
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                      <User className="h-8 w-8 text-slate-350 mx-auto" />
                      <p className="text-xs text-slate-450 mt-2 font-medium">Keine Profile gefunden</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                      <Search className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400 mt-2 font-medium">Finde deine Freunde über ihren Namen oder Username</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MY FRIENDS TAB */}
            {activeTab === "friends" && (
              <div className="space-y-4">
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
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white font-bold text-xs shadow-sm">
                              {getInitials(friend.full_name, friend.username)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">
                                {friend.full_name ?? "User"}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {friend.username ? `@${friend.username}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            {isSubmitting ? (
                              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            ) : (
                              <button
                                onClick={() => deleteFriendship(friend.friendshipId, friend.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                                title="Freund entfernen"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
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
                      onClick={() => setActiveTab("search")}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Eingehende Freundschaftsanfragen
                  </h3>
                </div>

                {incomingRequests.length > 0 ? (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                    {incomingRequests.map((req) => {
                      const isSubmitting = !!submittingIds[req.id];

                      return (
                        <div key={req.id} className="flex items-center justify-between p-3 first:pt-2 last:pb-2">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white font-bold text-xs shadow-sm">
                              {getInitials(req.full_name, req.username)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">
                                {req.full_name ?? "User"}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {req.username ? `@${req.username}` : ""}
                              </p>
                            </div>
                          </div>

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
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
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
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
                    <Clock className="h-9 w-9 text-slate-355 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 mt-3">Keine ausstehenden Anfragen</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 px-4 leading-relaxed">
                      Sobald dir jemand eine Freundschaftsanfrage schickt, siehst du sie hier.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
