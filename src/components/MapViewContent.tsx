"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import { Search, Users, MapPin, Sparkles, Layers, Loader2, Bookmark, UserPlus, MessageCircle, X, Locate, SlidersHorizontal, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatarUrl?: string | null;
}

interface Place {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  userAvatarUrl?: string | null;
  name: string;
  latitude: number;
  longitude: number;
  isMustSee: boolean;
  review: string;
  categories: string[];
  imageUrls?: string[];
  createdAt: string;
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

interface SearchSuggestion {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isRecommendation: boolean;
  isMustSee?: boolean;
  userName?: string;
  placeData?: Place;
  type?: string;
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

const POPUP_OFFSETS: { [key: string]: [number, number] } = {
  'top': [0, 10],
  'top-left': [0, 10],
  'top-right': [0, 10],
  'bottom': [0, -42],
  'bottom-left': [0, -42],
  'bottom-right': [0, -42],
  'left': [14, -16],
  'right': [-14, -16]
};

export default function MapViewContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const [viewState, setViewState] = useState({
    longitude: 12.1016,
    latitude: 49.0151,
    zoom: 12,
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [recommendationFilter, setRecommendationFilter] = useState<"all" | "must-see">("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mapStyle") ?? "mapbox://styles/mapbox/streets-v12";
    }
    return "mapbox://styles/mapbox/streets-v12";
  });
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentInput, setEditingCommentInput] = useState("");
  const [isCommentUpdating, setIsCommentUpdating] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);

  const mapRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search bar states
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
          .select("id, username, full_name, avatar_url")
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
            sender:profiles!friendships_sender_id_fkey(id, username, full_name, avatar_url),
            receiver:profiles!friendships_receiver_id_fkey(id, username, full_name, avatar_url)
          `)
          .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
          .eq("status", "accepted");

        const getAvatarPublicUrl = (path?: string | null) => {
          if (!path) return null;
          const { data } = supabase.storage.from("avatars").getPublicUrl(path);
          return `${data.publicUrl}?t=${Date.now()}`;
        };

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
            avatarUrl: getAvatarPublicUrl(otherProfile.avatar_url),
          };
        });

        setFriends(loadedFriends);

        // Profile lookup map
        const profileMap = new globalThis.Map<string, { name: string; initials: string; color: string; avatarUrl?: string | null }>();
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
          avatarUrl: getAvatarPublicUrl(ownProfile?.avatar_url),
        });

        loadedFriends.forEach((f) => {
          profileMap.set(f.id, {
            name: f.name,
            initials: f.initials,
            color: f.color,
            avatarUrl: f.avatarUrl,
          });
        });

        // Fetch activities for self and friends
        const allowedUserIds = [authUser.id, ...loadedFriends.map((f) => f.id)];
        const { data: activities } = await supabase
          .from("activities")
          .select("id, user_id, place_id, place_name, place_address, latitude, longitude, is_superlike, description, categories, image_urls, created_at")
          .in("user_id", allowedUserIds);

        const loadedPlaces = (activities || [])
          .filter((act) => act.latitude !== null && act.longitude !== null)
          .map((act) => {
            const prof = profileMap.get(act.user_id) || {
              name: "Unbekannt",
              initials: "?",
              color: "bg-slate-500",
              avatarUrl: null,
            };
            return {
              id: act.id,
              userId: act.user_id,
              userName: prof.name,
              userInitials: prof.initials,
              userColor: prof.color,
              userAvatarUrl: prof.avatarUrl ?? null,
              name: act.place_name,
              latitude: act.latitude as number,
              longitude: act.longitude as number,
              isMustSee: act.is_superlike,
              review: act.description || "",
              categories: Array.isArray(act.categories) ? act.categories : [],
              imageUrls: Array.isArray(act.image_urls) ? act.image_urls : [],
              createdAt: act.created_at,
            };
          });

        setPlaces(loadedPlaces);

        // Fetch user's wishlist
        const { data: wishlistEntries } = await supabase
          .from("wishlist")
          .select("activity_id")
          .eq("user_id", authUser.id);
        setWishlistIds((wishlistEntries || []).map((w: any) => w.activity_id));

        // Dynamically center map on first recommendation if exists, unless overridden by search params
        const urlParams = new URLSearchParams(window.location.search);
        const latParam = urlParams.get("lat");
        const lngParam = urlParams.get("lng");
        const placeIdParam = urlParams.get("placeId");

        if (latParam && lngParam) {
          const lat = parseFloat(latParam);
          const lng = parseFloat(lngParam);
          if (!isNaN(lat) && !isNaN(lng)) {
            setViewState({
              latitude: lat,
              longitude: lng,
              zoom: 15,
            });
          }
        } else if (placeIdParam) {
          const matched = loadedPlaces.find((p) => p.id === placeIdParam);
          if (matched) {
            setViewState({
              latitude: matched.latitude,
              longitude: matched.longitude,
              zoom: 15,
            });
          }
        } else if (loadedPlaces.length > 0) {
          setViewState({
            latitude: loadedPlaces[0].latitude,
            longitude: loadedPlaces[0].longitude,
            zoom: 12,
          });
        }

        if (placeIdParam) {
          const matched = loadedPlaces.find((p) => p.id === placeIdParam);
          if (matched) {
            setSelectedPlace(matched);
          }
        }
      } catch (err) {
        console.error("Error loading map data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMapData();
  }, []);

  // Handle zoom and select from URL search params reactively
  useEffect(() => {
    if (places.length === 0) return;

    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const placeIdParam = searchParams.get("placeId");

    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        setViewState((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          zoom: 15,
        }));
      }
    } else if (placeIdParam) {
      const matched = places.find((p) => p.id === placeIdParam);
      if (matched) {
        setViewState((prev) => ({
          ...prev,
          latitude: matched.latitude,
          longitude: matched.longitude,
          zoom: 15,
        }));
      }
    }

    if (placeIdParam) {
      const matched = places.find((p) => p.id === placeIdParam);
      if (matched) {
        setSelectedPlace(matched);
      }
    }
  }, [searchParams, places]);

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    places.forEach((place) => {
      place.categories.forEach((category) => unique.add(category));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [places]);

  const filteredPlaces = useMemo(() => {
    let next = places;
    if (selectedUsers.length > 0) {
      next = next.filter((place) => selectedUsers.includes(place.userId));
    }
    if (recommendationFilter === "must-see") {
      next = next.filter((place) => place.isMustSee);
    }
    if (selectedCategories.length > 0) {
      next = next.filter((place) =>
        place.categories.some((category) => selectedCategories.includes(category))
      );
    }
    return next;
  }, [places, recommendationFilter, selectedCategories, selectedUsers]);

  useEffect(() => {
    if (!selectedPlace) return;
    const isVisible = filteredPlaces.some((place) => place.id === selectedPlace.id);
    if (!isVisible) {
      setSelectedPlace(null);
    }
  }, [filteredPlaces, selectedPlace]);

  // Search effect to search places (both local recommendations and global geocoding API)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const queryLower = searchQuery.toLowerCase();
    const localMatches = filteredPlaces
      .filter(
        (p) =>
          p.name.toLowerCase().includes(queryLower) ||
          p.review.toLowerCase().includes(queryLower) ||
          (p.categories && p.categories.some((c) => c.toLowerCase().includes(queryLower)))
      )
      .map((p) => ({
        id: `local-${p.id}`,
        name: p.name,
        address: p.review ? (p.review.length > 60 ? p.review.slice(0, 60) + "..." : p.review) : "Empfohlener Ort",
        latitude: p.latitude,
        longitude: p.longitude,
        isRecommendation: true,
        isMustSee: p.isMustSee,
        userName: p.userName,
        placeData: p,
        type: "poi",
      }));

    setIsSearching(true);

    const delayDebounce = setTimeout(async () => {
      try {
        let url = `/api/places/search?query=${encodeURIComponent(searchQuery)}`;
        if (viewState.latitude && viewState.longitude) {
          url += `&lat=${viewState.latitude}&lng=${viewState.longitude}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const globalResults = (data.results || []).map((item: any) => ({
            id: `global-${item.id}`,
            name: item.name,
            address: item.address || "",
            latitude: item.latitude,
            longitude: item.longitude,
            isRecommendation: false,
            type: item.type,
          }));

          const combined = [...localMatches, ...globalResults];
          setSuggestions(combined);
        } else {
          setSuggestions(localMatches);
        }
      } catch (err) {
        console.error("Error fetching search suggestions:", err);
        setSuggestions(localMatches);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, filteredPlaces, viewState.latitude, viewState.longitude]);

  // Click outside search bar to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getZoomLevelForType = (type?: string): number => {
    switch (type) {
      case "country":
        return 4.5;
      case "region":
        return 7.5;
      case "city":
        return 11.5;
      case "neighborhood":
        return 14.5;
      case "address":
        return 16;
      case "poi":
      default:
        return 17;
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.latitude && suggestion.longitude) {
      const zoom = getZoomLevelForType(suggestion.type);

      mapRef.current?.flyTo({
        center: [suggestion.longitude, suggestion.latitude],
        zoom: zoom,
        duration: 1500,
      });

      setViewState((prev) => ({
        ...prev,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        zoom: zoom,
      }));

      if (suggestion.isRecommendation && suggestion.placeData) {
        setSelectedPlace(suggestion.placeData);
      } else {
        setSelectedPlace(null);
      }

      setSearchQuery(suggestion.name);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolokalisierung wird von deinem Browser nicht unterstützt.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setIsLocating(false);

        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          duration: 1500,
        });

        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
          zoom: 15,
        }));
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLocating(false);
        let message = "Dein Standort konnte nicht ermittelt werden.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Standortzugriff wurde verweigert. Bitte erlaube den Standortzugriff in deinem Browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Standortinformationen sind derzeit nicht verfügbar.";
        } else if (error.code === error.TIMEOUT) {
          message = "Die Anfrage zur Ermittlung des Standorts hat das Zeitlimit überschritten.";
        }
        alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const toggleWishlist = async (activityId: string) => {
    if (!user) return;
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

  const fetchComments = async (activityId: string, isActive?: () => boolean) => {
    setIsCommentsLoading(true);
    setCommentError(null);

    const { data, error } = await supabase
      .from("activity_comments")
      .select(
        "id, content, created_at, user_id, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)"
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
        const avatarUrl = profile?.avatar_url
          ? `${supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl}?t=${Date.now()}`
          : null;
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

  useEffect(() => {
    setIsCommentsOpen(false);
  }, [selectedPlace?.id]);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
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

  const openComments = () => {
    if (!selectedPlace) return;
    setIsCommentsOpen(true);
  };

  const closeComments = () => {
    setIsCommentsOpen(false);
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
    if (!globalThis.confirm("Kommentar wirklich löschen?")) return;

    setCommentDeletingId(commentId);
    setCommentError(null);

    const { error } = await supabase
      .from("activity_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setCommentError("Kommentar konnte nicht gelöscht werden.");
    } else {
      await fetchComments(selectedPlace.id);
    }

    setCommentDeletingId(null);
  };

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

      {/* Floating Search Bar */}
      {!isLoading && (
        <div ref={searchContainerRef} className="absolute top-4 left-4 right-4 z-20">
          <div className="relative z-20 flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] px-4 py-3 transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-green-700/10">
            <Search className="h-4 w-4 text-slate-400 mr-3.5 flex-shrink-0" />
            <input
              type="text"
              placeholder="Ort suchen..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm text-slate-800 focus:outline-none placeholder-slate-400 font-medium cursor-pointer"
            />
            <button
              onClick={() => setIsFilterMenuOpen((prev) => !prev)}
              className={`ml-2 flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all flex-shrink-0 cursor-pointer ${
                isFilterMenuOpen ? "ring-2 ring-brand-green-700/20 text-brand-green-800" : ""
              }`}
              title="Filter"
              aria-label="Filter"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100 flex-shrink-0 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {isFilterMenuOpen && (
              <div className="absolute right-3 top-full mt-2 w-64 rounded-2xl border border-slate-100 bg-white shadow-xl z-50 p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Empfehlungen
                </div>
                <button
                  onClick={() => {
                    setRecommendationFilter("all");
                    setIsFilterMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    recommendationFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Alle Empfehlungen
                </button>
                <button
                  onClick={() => {
                    setRecommendationFilter("must-see");
                    setIsFilterMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    recommendationFilter === "must-see"
                      ? "bg-amber-500 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Must See
                </button>

                <div className="mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Kategorien
                </div>
                {categoryOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 px-2 pb-1">
                    {categoryOptions.map((category) => {
                      const isActive = selectedCategories.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategories((prev) =>
                              prev.includes(category)
                                ? prev.filter((item) => item !== category)
                                : [...prev, category]
                            );
                          }}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                            isActive
                              ? "border-brand-green-600 bg-brand-green-50 text-brand-green-800"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 pb-1 text-[11px] text-slate-500">
                    Keine Kategorien vorhanden.
                  </div>
                )}
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Kategorien zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && (suggestions.length > 0 || isSearching) && (
            <div className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] max-h-72 overflow-y-auto z-30 py-2 divide-y divide-slate-50">
              {isSearching && suggestions.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-green-700" />
                  <span>Ort wird gesucht...</span>
                </div>
              ) : (
                <>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full flex items-start text-left px-4 py-3 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors gap-3 cursor-pointer group"
                    >
                      <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${
                        suggestion.isRecommendation
                          ? suggestion.isMustSee
                            ? "bg-amber-50 text-amber-600"
                            : "bg-brand-green-50 text-brand-green-700"
                          : "bg-slate-50 text-slate-400"
                      }`}>
                        {suggestion.isRecommendation ? (
                          suggestion.isMustSee ? (
                            <Sparkles className="h-3.5 w-3.5 fill-amber-300" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <MapPin className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-xs font-bold text-slate-800 truncate group-hover:text-brand-green-800 transition-colors">
                            {suggestion.name}
                          </span>
                          {suggestion.isRecommendation && (
                            <span className="text-[8px] font-bold text-brand-green-700 bg-brand-green-50/80 px-1.5 py-0.5 rounded-full border border-brand-green-100/30 flex-shrink-0">
                              Von {suggestion.userName}
                            </span>
                          )}
                        </div>
                        {suggestion.address && (
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5 leading-snug">
                            {suggestion.address}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Friends Filter Bar or Add Friends Button */}
      {!isLoading && (
        user && friends.length > 0 ? (
          <div className="absolute left-0 right-0 z-10 top-[72px] flex flex-nowrap gap-2 overflow-x-auto no-scrollbar px-4 py-1">
            <button
              onClick={() => {
                setSelectedUsers([]);
                setSelectedPlace(null);
              }}
              className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95 ${
                selectedUsers.length === 0
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
                onClick={() => handleToggleUser(friend.id)}
                className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95 ${
                  selectedUsers.includes(friend.id)
                    ? "bg-brand-green-800 border-brand-green-800 text-white"
                    : "bg-white/95 border-slate-100 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className={`flex h-5 w-5 items-center justify-center overflow-hidden rounded-full text-[9px] font-bold text-white ${friend.color}`}>
                  {friend.avatarUrl ? (
                    <img
                      src={friend.avatarUrl}
                      alt="Profilbild"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    friend.initials
                  )}
                </div>
                <span>{friend.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="absolute left-0 right-0 z-10 top-[72px] flex flex-nowrap gap-2 overflow-x-auto no-scrollbar px-4 py-1">
            <Link
              href="/profile/friends"
              className="flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-100 bg-white/95 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Freunde hinzufügen</span>
            </Link>
          </div>
        )
      )}


      {/* Mapbox Map */}
      <div className="w-full h-full flex-1">
        <Map
          ref={mapRef}
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

          {userLocation && (
            <Marker
              latitude={userLocation.latitude}
              longitude={userLocation.longitude}
              anchor="center"
            >
              <div className="relative flex h-5 w-5 items-center justify-center pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white shadow-md"></span>
              </div>
            </Marker>
          )}

          {selectedPlace && (
            <Popup
              latitude={selectedPlace.latitude}
              longitude={selectedPlace.longitude}
              onClose={() => setSelectedPlace(null)}
              closeButton={false}
              className="z-20 font-sans custom-map-popup"
              maxWidth="260px"
              offset={POPUP_OFFSETS}
            >
              <div className="p-3 bg-white rounded-xl shadow-lg text-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/activities/${selectedPlace.id}`}
                    className="group/popup-link cursor-pointer hover:underline decoration-brand-green-700/40"
                  >
                    <h4 className="font-bold text-sm text-slate-900 group-hover/popup-link:text-brand-green-700 transition-colors">
                      {selectedPlace.name}
                    </h4>
                  </Link>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {selectedPlace.isMustSee && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-600/15 flex-shrink-0">
                        <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-400 animate-pulse" />
                        Must See
                      </span>
                    )}
                    {selectedPlace.createdAt && (
                      <span className="text-[10px] text-slate-400 font-medium select-none">
                        {formatCommentTimestamp(selectedPlace.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className={`flex h-4 w-4 items-center justify-center overflow-hidden rounded-full text-[8px] font-bold text-white ${selectedPlace.userColor}`}>
                    {selectedPlace.userAvatarUrl ? (
                      <img
                        src={selectedPlace.userAvatarUrl}
                        alt="Profilbild"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      selectedPlace.userInitials
                    )}
                  </div>
                  <span>
                    Empfohlen von{" "}
                    <Link
                      href={user && selectedPlace.userId === user.id ? "/profile" : `/profile/${selectedPlace.userId}`}
                      className="font-semibold text-slate-700 hover:text-brand-green-700 hover:underline transition-colors cursor-pointer"
                    >
                      {selectedPlace.userName}
                    </Link>
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {selectedPlace.review}
                </p>

                {selectedPlace.imageUrls && selectedPlace.imageUrls.length > 0 && (
                  <div className="mt-2.5 grid grid-cols-3 gap-1">
                    {selectedPlace.imageUrls.map((url, idx) => (
                      <Link
                        key={idx}
                        href={`/activities/${selectedPlace.id}`}
                        className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img src={url} alt={`Bild ${idx + 1}`} className="h-full w-full object-cover" />
                      </Link>
                    ))}
                  </div>
                )}

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

                <div className="mt-3 flex items-center gap-2">
                  {user && selectedPlace.userId !== user.id && (
                    <button
                      onClick={() => toggleWishlist(selectedPlace.id)}
                      className={`flex items-center justify-center active:scale-90 transition-all cursor-pointer p-0.5 ${
                        wishlistIds.includes(selectedPlace.id)
                          ? "text-brand-green-700"
                          : "text-slate-500 hover:text-brand-green-800"
                      }`}
                      title={wishlistIds.includes(selectedPlace.id) ? "Aus Wishlist entfernen" : "In Wishlist speichern"}
                    >
                      <Bookmark
                        className="h-4.5 w-4.5 transition-colors"
                        fill={wishlistIds.includes(selectedPlace.id) ? "currentColor" : "none"}
                      />
                    </button>
                  )}
                  <Link
                    href={`/activities/${selectedPlace.id}`}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-brand-green-800 transition-colors cursor-pointer p-0.5"
                  >
                    <MessageCircle className="h-4 w-4 transition-colors" />
                    <span>{comments.length}</span>
                  </Link>
                </div>
              </div>
            </Popup>
          )}

          {/* Map Style & Location controls - inside Map so absolute positioning works correctly */}
          <div className="absolute bottom-[calc(64px+8px+env(safe-area-inset-bottom))] right-4 z-10 flex flex-col items-end gap-2">
            {isStyleMenuOpen && (
              <div className="flex flex-col gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100/50 shadow-xl">
                {MAP_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setCurrentStyle(style.url);
                      localStorage.setItem("mapStyle", style.url);
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
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white/95 backdrop-blur-md text-slate-700 shadow-lg transition-all duration-200 cursor-pointer hover:bg-slate-50 active:scale-95 outline-none focus:outline-none ${
                isStyleMenuOpen ? "ring-2 ring-brand-green-700 text-brand-green-800" : ""
              }`}
              title="Kartenstil ändern"
            >
              <Layers className="h-5 w-5" />
            </button>

            <button
              onClick={handleLocateUser}
              disabled={isLocating}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white/95 backdrop-blur-md text-slate-700 shadow-lg transition-all duration-200 cursor-pointer hover:bg-slate-50 active:scale-95 disabled:opacity-50 outline-none focus:outline-none"
              title="Meinen Standort anzeigen"
            >
              {isLocating ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-green-700" />
              ) : (
                <Locate className="h-5 w-5" />
              )}
            </button>
          </div>
        </Map>
      </div>

      {/* Floating Login/Register Prompt Modal at the bottom when logged out */}
      {!isLoading && !user && (
        <div className="absolute bottom-[calc(64px+8px+env(safe-area-inset-bottom))] left-4 right-4 z-20 bg-white/95 p-5 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-3">
          <div>

          {isCommentsOpen && selectedPlace && (
            <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 px-4 pb-6 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kommentare</p>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{selectedPlace.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeComments}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    aria-label="Kommentare schliessen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
                  {commentError && (
                    <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[10px] text-red-700">
                      {commentError}
                    </div>
                  )}

                  {isCommentsLoading ? (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Kommentare werden geladen...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-[11px] text-slate-500">Noch keine Kommentare.</div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <Link href={`/profile/${comment.userId}`} className="flex-shrink-0 hover:opacity-80 active:scale-[0.98] transition-all cursor-pointer">
                            <div className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full font-bold text-[9px] flex-shrink-0 ${
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
                                <span className="text-[11px] font-semibold text-slate-700">
                                  {comment.userName}
                                </span>
                              </Link>
                              <span className="text-[9px] text-slate-400">
                                {formatCommentTimestamp(comment.createdAt)}
                              </span>
                              {user?.id === comment.userId && editingCommentId !== comment.id && (
                                <div className="ml-auto relative">
                                  <button
                                    type="button"
                                    onClick={() => setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id)}
                                    className="flex h-5 w-5 items-center justify-center rounded-lg text-slate-455 hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer"
                                    title="Kommentaroptionen"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>

                                  {activeCommentMenuId === comment.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-130 bg-transparent"
                                        onClick={() => setActiveCommentMenuId(null)}
                                      />
                                      <div className="absolute right-0 top-full mt-0.5 w-28 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-140 animate-in fade-in slide-in-from-top-1 duration-100">
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
                                            handleDeleteComment(comment.id);
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
                </div>

                {user ? (
                  <form onSubmit={handleAddComment} className="border-t border-slate-100 px-4 py-3">
                    <div className="flex gap-2">
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
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500">
                    Melde dich an, um zu kommentieren.
                  </div>
                )}
              </div>
            </div>
          )}
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

      {/* Lightbox Modal */}
      {activeImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-all duration-300"
          onClick={() => setActiveImageUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={activeImageUrl} alt="Fullscreen View" className="max-h-[85vh] max-w-[85vw] object-contain" />
            <button
              onClick={() => setActiveImageUrl(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/85 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
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
