"use client";

import React, { useState, useEffect } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import { Search, Users, MapPin, Sparkles, Layers, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  name: string;
  initials: string;
  color: string;
}

interface Place {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  name: string;
  latitude: number;
  longitude: number;
  isMustSee: boolean;
  review: string;
  categories: string[];
}

interface ActivityComment {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  content: string;
  createdAt: string;
}

const COLORS = [
  "bg-emerald-600",
  "bg-rose-500",
  "bg-amber-600",
  "bg-blue-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-fuchsia-600",
  "bg-cyan-600",
];

function getUserColorClass(userId: string): string {
  let sum = 0;
  for (let i = 0; i < userId.length; i++) {
    sum += userId.charCodeAt(i);
  }
  return COLORS[sum % COLORS.length];
}

const MAP_STYLES = [
  { id: "streets", name: "Standard", url: "mapbox://styles/mapbox/streets-v12" },
  { id: "light", name: "Hell (Schwarz-Weiß)", url: "mapbox://styles/mapbox/light-v11" },
  { id: "dark", name: "Dunkel", url: "mapbox://styles/mapbox/dark-v11" },
  { id: "satellite", name: "Satellit", url: "mapbox://styles/mapbox/satellite-streets-v12" },
  { id: "outdoors", name: "Outdoor", url: "mapbox://styles/mapbox/outdoors-v12" },
];

export default function MapViewContent() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const [viewState, setViewState] = useState({
    longitude: 12.1016,
    latitude: 49.0151,
    zoom: 12,
  });

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [currentStyle, setCurrentStyle] = useState("mapbox://styles/mapbox/streets-v12");
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentInput, setEditingCommentInput] = useState("");
  const [isCommentUpdating, setIsCommentUpdating] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    async function loadMapData() {
      try {
        setIsLoading(true);
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          setPlaces([]);
          setFriends([]);
          setIsLoading(false);
          return;
        }

        setUser(authUser);

        // Fetch own profile
        const { data: ownProfile } = await supabase
          .from("profiles")
          .select("id, username, full_name")
          .eq("id", authUser.id)
          .single();

        // Fetch accepted friendships
        const { data: friendships } = await supabase
          .from("friendships")
          .select(`
            id,
            sender_id,
            receiver_id,
            status,
            sender:profiles!friendships_sender_id_fkey(id, username, full_name),
            receiver:profiles!friendships_receiver_id_fkey(id, username, full_name)
          `)
          .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
          .eq("status", "accepted");

        const loadedFriends = (friendships || []).map((f: any) => {
          const otherProfile = f.sender_id === authUser.id ? f.receiver : f.sender;
          const name = otherProfile?.full_name ?? otherProfile?.username ?? "Freund";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "?";
          return {
            id: otherProfile.id,
            name,
            initials,
            color: getUserColorClass(otherProfile.id),
          };
        });

        setFriends(loadedFriends);

        // Profile lookup map
        const profileMap = new globalThis.Map<string, { name: string; initials: string; color: string }>();
        const ownName = ownProfile?.full_name ?? ownProfile?.username ?? "Ich";
        const ownInitials = ownName
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";

        profileMap.set(authUser.id, {
          name: ownName,
          initials: ownInitials,
          color: getUserColorClass(authUser.id),
        });

        loadedFriends.forEach((f) => {
          profileMap.set(f.id, {
            name: f.name,
            initials: f.initials,
            color: f.color,
          });
        });

        // Fetch activities for self and friends
        const allowedUserIds = [authUser.id, ...loadedFriends.map((f) => f.id)];
        const { data: activities } = await supabase
          .from("activities")
          .select("id, user_id, place_id, place_name, place_address, latitude, longitude, is_superlike, description, categories")
          .in("user_id", allowedUserIds);

        const loadedPlaces = (activities || [])
          .filter((act) => act.latitude !== null && act.longitude !== null)
          .map((act) => {
            const prof = profileMap.get(act.user_id) || {
              name: "Unbekannt",
              initials: "?",
              color: "bg-slate-500",
            };
            return {
              id: act.id,
              userId: act.user_id,
              userName: prof.name,
              userInitials: prof.initials,
              userColor: prof.color,
              name: act.place_name,
              latitude: act.latitude as number,
              longitude: act.longitude as number,
              isMustSee: act.is_superlike,
              review: act.description || "",
              categories: Array.isArray(act.categories) ? act.categories : [],
            };
          });

        setPlaces(loadedPlaces);

        // Dynamically center map on first recommendation if exists
        if (loadedPlaces.length > 0) {
          setViewState({
            latitude: loadedPlaces[0].latitude,
            longitude: loadedPlaces[0].longitude,
            zoom: 12,
          });
        }
      } catch (err) {
        console.error("Error loading map data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMapData();
  }, []);

  const fetchComments = async (activityId: string, isActive?: () => boolean) => {
    setIsCommentsLoading(true);
    setCommentError(null);

    const { data, error } = await supabase
      .from("activity_comments")
      .select(
        "id, content, created_at, user_id, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name)"
      )
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });

    if (isActive && !isActive()) return;

    if (error) {
      setComments([]);
      setCommentError("Kommentare konnten nicht geladen werden.");
    } else {
      const loadedComments = (data || []).map((row: any) => {
        const profile = row.profiles;
        const name = profile?.full_name ?? profile?.username ?? "Nutzer";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";
        return {
          id: row.id,
          userId: row.user_id,
          userName: name,
          userInitials: initials,
          userColor: getUserColorClass(row.user_id),
          content: row.content,
          createdAt: row.created_at,
        } as ActivityComment;
      });
      setComments(loadedComments);
    }

    setIsCommentsLoading(false);
  };

  useEffect(() => {
    if (!selectedPlace || !user) {
      setComments([]);
      setCommentError(null);
      setCommentInput("");
      setEditingCommentId(null);
      setEditingCommentInput("");
      return;
    }

    let isActive = true;

    fetchComments(selectedPlace.id, () => isActive).catch((error) => {
      if (!isActive) return;
      console.error("Error loading comments:", error);
      setComments([]);
      setCommentError("Kommentare konnten nicht geladen werden.");
      setIsCommentsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [selectedPlace?.id, user?.id]);

  const handleSelectUser = (userId: string | null) => {
    setSelectedUser(userId);
    setSelectedPlace(null);
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selectedPlace) return;
    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentError("Kommentar fehlt.");
      return;
    }

    setIsCommentSaving(true);
    setCommentError(null);

    const { error } = await supabase.from("activity_comments").insert({
      activity_id: selectedPlace.id,
      user_id: user.id,
      content: trimmed,
    });

    if (error) {
      setCommentError("Kommentar konnte nicht gespeichert werden.");
    } else {
      setCommentInput("");
      await fetchComments(selectedPlace.id);
    }

    setIsCommentSaving(false);
  };

  const startEditComment = (comment: ActivityComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentInput(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentInput("");
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!selectedPlace) return;
    const trimmed = editingCommentInput.trim();
    if (!trimmed) {
      setCommentError("Kommentar fehlt.");
      return;
    }

    setIsCommentUpdating(true);
    setCommentError(null);

    const { error } = await supabase
      .from("activity_comments")
      .update({ content: trimmed })
      .eq("id", commentId);

    if (error) {
      setCommentError("Kommentar konnte nicht gespeichert werden.");
    } else {
      cancelEditComment();
      await fetchComments(selectedPlace.id);
    }

    setIsCommentUpdating(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPlace) return;
    if (!globalThis.confirm("Kommentar wirklich loeschen?")) return;

    setCommentDeletingId(commentId);
    setCommentError(null);

    const { error } = await supabase
      .from("activity_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setCommentError("Kommentar konnte nicht geloescht werden.");
    } else {
      await fetchComments(selectedPlace.id);
    }

    setCommentDeletingId(null);
  };

  const filteredPlaces = selectedUser
    ? places.filter((place) => place.userId === selectedUser)
    : places;

  if (!mapboxToken) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="rounded-full bg-red-50 p-3 text-red-500">
          <MapPin className="h-8 w-8" />
        </div>
        <h3 className="mt-4 font-semibold text-slate-800">Mapbox Token fehlt</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-xs">
          Bitte stelle sicher, dass `NEXT_PUBLIC_MAPBOX_TOKEN` in deiner `.env.local` definiert ist.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex-1 flex flex-col">
      {/* Subtle Data Fetching Spinner Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-30 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 px-4 py-2.5 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 pointer-events-auto">
            <Loader2 className="h-4 w-4 animate-spin text-brand-green-700" />
            <span className="text-xs font-semibold text-slate-700">Karte wird aktualisiert...</span>
          </div>
        </div>
      )}

      {/* Floating Friends Filter Bar - Only shown if user is logged in and has friends */}
      {user && friends.length > 0 && (
        <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => handleSelectUser(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95 ${
              selectedUser === null
                ? "bg-brand-green-800 border-brand-green-800 text-white"
                : "bg-white/95 border-slate-100 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Alle</span>
          </button>

          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => handleSelectUser(friend.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95 ${
                selectedUser === friend.id
                  ? "bg-brand-green-800 border-brand-green-800 text-white"
                  : "bg-white/95 border-slate-100 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${friend.color}`}>
                {friend.initials}
              </div>
              <span>{friend.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mapbox Map */}
      <div className="w-full h-full flex-1">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: "100%", height: "100%" }}
          mapStyle={currentStyle}
          mapboxAccessToken={mapboxToken}
        >
          {filteredPlaces.map((place) => (
            <Marker
              key={place.id}
              latitude={place.latitude}
              longitude={place.longitude}
              anchor="bottom"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlace(place);
                }}
                className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border border-white shadow-lg transition-colors duration-200 ${
                  place.isMustSee
                    ? "bg-amber-500 text-white shadow-amber-500/30"
                    : "bg-brand-green-700 text-white shadow-brand-green-700/30"
                }`}>
                  {place.isMustSee ? (
                    <Sparkles className="h-4 w-4 fill-amber-300" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </div>
                <div className="absolute -top-8 bg-slate-900/90 text-white text-[10px] px-2 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none font-medium backdrop-blur-sm">
                  {place.name}
                </div>
              </button>
            </Marker>
          ))}

          {selectedPlace && (
            <Popup
              latitude={selectedPlace.latitude}
              longitude={selectedPlace.longitude}
              onClose={() => setSelectedPlace(null)}
              anchor="top"
              closeButton={false}
              className="z-20 font-sans"
              maxWidth="260px"
            >
              <div className="p-3 bg-white rounded-xl shadow-sm text-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900">{selectedPlace.name}</h4>
                  {selectedPlace.isMustSee && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-600/15">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-400 animate-pulse" />
                      Must See
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${selectedPlace.userColor}`}>
                    {selectedPlace.userInitials}
                  </div>
                  <span>Empfohlen von {selectedPlace.userName}</span>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {selectedPlace.review}
                </p>

                {selectedPlace.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedPlace.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-600"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wide">Kommentare</span>
                    <span>{comments.length}</span>
                  </div>

                  {commentError && (
                    <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-[10px] text-red-700">
                      {commentError}
                    </div>
                  )}

                  {isCommentsLoading ? (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Kommentare werden geladen...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="mt-2 text-[10px] text-slate-500">
                      Noch keine Kommentare.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white ${comment.userColor}`}>
                            {comment.userInitials}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-slate-700">
                                {comment.userName}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {formatCommentTimestamp(comment.createdAt)}
                              </span>
                              {user?.id === comment.userId && editingCommentId !== comment.id && (
                                <div className="ml-auto flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditComment(comment)}
                                    className="text-[9px] font-semibold text-slate-500 hover:text-slate-700"
                                  >
                                    Bearbeiten
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(comment.id)}
                                    disabled={commentDeletingId === comment.id}
                                    className="text-[9px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
                                  >
                                    Loeschen
                                  </button>
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
                                  onClick={() => handleUpdateComment(comment.id)}
                                  disabled={isCommentUpdating || editingCommentInput.trim().length === 0}
                                  className="rounded-lg bg-brand-green-700 px-2 py-1 text-[9px] font-semibold text-white disabled:opacity-60"
                                >
                                  {isCommentUpdating ? "..." : "OK"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditComment}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500"
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

                  {user ? (
                    <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                      <input
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Kommentar schreiben"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-brand-green-500"
                      />
                      <button
                        type="submit"
                        disabled={isCommentSaving || commentInput.trim().length === 0}
                        className="rounded-lg bg-brand-green-700 px-3 py-1.5 text-[10px] font-semibold text-white transition-all disabled:opacity-60"
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
              </div>
            </Popup>
          )}

          {/* Map Style Selector - inside Map so absolute positioning works correctly */}
          <div className="absolute bottom-6 right-4 z-10 flex flex-col items-end gap-2">
            {isStyleMenuOpen && (
              <div className="flex flex-col gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100/50 shadow-xl">
                {MAP_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setCurrentStyle(style.url);
                      setIsStyleMenuOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl text-left transition-all duration-200 cursor-pointer min-w-[120px] ${
                      currentStyle === style.url
                        ? "bg-brand-green-800 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white/95 backdrop-blur-md text-slate-700 shadow-lg transition-all duration-200 cursor-pointer hover:bg-slate-50 active:scale-95 ${
                isStyleMenuOpen ? "ring-2 ring-brand-green-700 text-brand-green-800" : ""
              }`}
              title="Kartenstil ändern"
            >
              <Layers className="h-5 w-5" />
            </button>
          </div>
        </Map>
      </div>

      {/* Floating Login/Register Prompt Modal at the bottom when logged out */}
      {!isLoading && !user && (
        <div className="absolute bottom-20 left-4 right-4 z-20 bg-white/95 border border-slate-150 p-5 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Entdecke Orte mit deinen Freunden</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Melde dich an oder registriere dich, um die Lieblingsorte deiner Freunde auf der interaktiven Karte zu sehen.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 text-center py-2.5 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 text-xs font-bold text-white transition-all shadow-sm shadow-brand-green-700/10 active:scale-[0.98]"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 bg-white transition-all shadow-sm active:scale-[0.98]"
            >
              Registrieren
            </Link>
          </div>
        </div>
      )}

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

