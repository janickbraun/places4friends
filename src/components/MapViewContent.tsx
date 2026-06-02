"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import { Search, Users, MapPin, Sparkles, Layers, Loader2, Bookmark, UserPlus, MessageCircle, X, Locate, SlidersHorizontal, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authenticatedFetch } from "@/lib/auth/authenticatedFetch";
import {
  FALLBACK_VIEWPORT,
  GEOLOCATION_NOT_SUPPORTED_MESSAGE,
  ZOOM_DETAIL,
  ZOOM_GERMANY_MIN,
  ZOOM_OVERVIEW_DEFAULT,
  debounce,
  fetchApproximateGeoFromApi,
  getCurrentUserPosition,
  getGeolocationErrorMessage,
  getGeolocationPermission,
  getGeoBounds,
  locateUserPosition,
  resolveInitialViewport,
  resolveOverviewAnchor,
  saveViewport,
  selectPlacesForOverview,
  type MapViewport,
} from "@/lib/mapViewport";
import { getUserColorClass } from "@/lib/mapNetwork";
import {
  filterOverviewPins,
  mergeMapPlace,
  type MapOverviewPin,
  type MapPlace,
  type MapPlaceDetails,
  type MapPlacePin,
} from "@/lib/mapPlaces";
import { applyMapLabelLanguage, MAP_LABEL_LANGUAGE } from "@/lib/mapLanguage";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface UserProfile {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatarUrl?: string | null;
}

type ClusterablePin = Pick<MapPlacePin, "id" | "latitude" | "longitude"> & Partial<MapPlacePin>;

interface ClusteredPlaceGroup {
  id: string;
  latitude: number;
  longitude: number;
  places: ClusterablePin[];
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
  placeData?: MapPlacePin;
  type?: string;
}

const MAP_STYLES = [
  { id: "streets", name: "Standard", url: "mapbox://styles/mapbox/streets-v12" },
  { id: "light", name: "Hell (Schwarz-Weiß)", url: "mapbox://styles/mapbox/light-v11" },
  { id: "dark", name: "Dunkel", url: "mapbox://styles/mapbox/dark-v11" },
  { id: "satellite", name: "Satellit", url: "mapbox://styles/mapbox/satellite-streets-v12" },
  { id: "outdoors", name: "Outdoor", url: "mapbox://styles/mapbox/outdoors-v12" },
];

// Pin markers are h-10/w-10 (40px); cluster when circle centers would overlap.
const MARKER_DIAMETER_PX = 40;

// Pins use anchor="center"; tip should meet the top edge of the 40px circle.
const POPUP_TIP_GAP_PX = 2;
const POPUP_OFFSET_ABOVE_PIN = -(MARKER_DIAMETER_PX / 2 + POPUP_TIP_GAP_PX);

const POPUP_OFFSETS: { [key: string]: [number, number] } = {
  top: [0, 10],
  "top-left": [0, 10],
  "top-right": [0, 10],
  bottom: [0, POPUP_OFFSET_ABOVE_PIN],
  "bottom-left": [0, POPUP_OFFSET_ABOVE_PIN],
  "bottom-right": [0, POPUP_OFFSET_ABOVE_PIN],
  left: [14, -MARKER_DIAMETER_PX / 2],
  right: [-14, -MARKER_DIAMETER_PX / 2],
};

function projectToWorldPixel(longitude: number, latitude: number, zoom: number) {
  const worldSize = 512 * Math.pow(2, zoom);
  const x = ((longitude + 180) / 360) * worldSize;
  const latRad = (latitude * Math.PI) / 180;
  const mercatorY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = ((1 - mercatorY / Math.PI) / 2) * worldSize;
  return { x, y };
}

function clusterPlacesByScreenOverlap(places: ClusterablePin[], zoom: number): ClusteredPlaceGroup[] {
  if (places.length === 0) return [];

  const clusterZoom = Math.round(zoom * 2) / 2;
  const overlapDistanceSq = MARKER_DIAMETER_PX * MARKER_DIAMETER_PX;
  const points = places.map((place) => ({
    place,
    ...projectToWorldPixel(place.longitude, place.latitude, clusterZoom),
  }));

  const parent = points.map((_, index) => index);

  const findRoot = (index: number): number => {
    if (parent[index] !== index) {
      parent[index] = findRoot(parent[index]);
    }
    return parent[index];
  };

  const union = (leftIndex: number, rightIndex: number) => {
    const leftRoot = findRoot(leftIndex);
    const rightRoot = findRoot(rightIndex);
    if (leftRoot !== rightRoot) {
      parent[rightRoot] = leftRoot;
    }
  };

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy < overlapDistanceSq) {
        union(i, j);
      }
    }
  }

  const groups = new globalThis.Map<number, ClusterablePin[]>();
  points.forEach((point, index) => {
    const root = findRoot(index);
    const existing = groups.get(root);
    if (existing) {
      existing.push(point.place);
    } else {
      groups.set(root, [point.place]);
    }
  });

  return Array.from(groups.values()).map((groupedPlaces) => {
    const stablePlaceKey = groupedPlaces
      .map((place) => place.id)
      .sort((a, b) => a.localeCompare(b))
      .join("|");
    const latSum = groupedPlaces.reduce((sum, place) => sum + place.latitude, 0);
    const lngSum = groupedPlaces.reduce((sum, place) => sum + place.longitude, 0);
    return {
      id: stablePlaceKey,
      latitude: latSum / groupedPlaces.length,
      longitude: lngSum / groupedPlaces.length,
      places: groupedPlaces,
    };
  });
}

const CLUSTER_EXPAND_MAX_ZOOM = 19;
const CLUSTER_EXPAND_ZOOM_BUFFER = 0.5;

// Reserve space for floating search/filters (top) and tab bar + map controls (bottom).
const CLUSTER_EXPAND_MAP_PADDING = {
  top: 132,
  right: 56,
  bottom: 156,
  left: 56,
};

// Extra top inset so the place popup clears search bar + friend filters.
const SINGLE_PIN_SELECT_MAP_PADDING = {
  top: 320,
  right: 56,
  bottom: 156,
  left: 56,
};

const POPUP_REVIEW_MAX_LENGTH = 200;

function truncatePopupText(text: string, maxLength = POPUP_REVIEW_MAX_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}

function placesFitInViewport(
  places: ClusterablePin[],
  zoom: number,
  mapWidth: number,
  mapHeight: number,
  padding: typeof CLUSTER_EXPAND_MAP_PADDING
): boolean {
  if (places.length === 0) return true;

  const pixels = places.map((place) =>
    projectToWorldPixel(place.longitude, place.latitude, zoom)
  );
  const xs = pixels.map((point) => point.x);
  const ys = pixels.map((point) => point.y);
  const spanX = Math.max(...xs) - Math.min(...xs) + MARKER_DIAMETER_PX;
  const spanY = Math.max(...ys) - Math.min(...ys) + MARKER_DIAMETER_PX;
  const availableWidth = mapWidth - padding.left - padding.right;
  const availableHeight = mapHeight - padding.top - padding.bottom;

  return spanX <= availableWidth && spanY <= availableHeight;
}

function findMinZoomToSplitCluster(places: ClusterablePin[], currentZoom: number): number | null {
  const startZoom = Math.max(currentZoom + 0.5, 0);
  for (let zoom = startZoom; zoom <= CLUSTER_EXPAND_MAX_ZOOM; zoom += 0.5) {
    if (clusterPlacesByScreenOverlap(places, zoom).length > 1) {
      return zoom;
    }
  }
  return null;
}

function findOptimalClusterExpandZoom(
  places: ClusterablePin[],
  currentZoom: number,
  mapWidth: number,
  mapHeight: number
): number {
  const minSplitZoom = findMinZoomToSplitCluster(places, currentZoom);
  if (minSplitZoom === null) {
    return CLUSTER_EXPAND_MAX_ZOOM;
  }

  let low = minSplitZoom;
  let high = CLUSTER_EXPAND_MAX_ZOOM;
  let best = minSplitZoom;

  while (high - low > 0.05) {
    const mid = (low + high) / 2;
    const splits = clusterPlacesByScreenOverlap(places, mid).length > 1;
    const fits = placesFitInViewport(places, mid, mapWidth, mapHeight, CLUSTER_EXPAND_MAP_PADDING);
    if (splits && fits) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  const zoomWithBuffer = Math.max(0, best - CLUSTER_EXPAND_ZOOM_BUFFER);
  return Math.round(zoomWithBuffer * 2) / 2;
}

function getClusterBounds(
  places: Array<{ latitude: number; longitude: number }>
): [[number, number], [number, number]] {
  const lngs = places.map((place) => place.longitude);
  const lats = places.map((place) => place.latitude);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);

  if (minLng === maxLng) {
    const lngPad = 0.00025;
    minLng -= lngPad;
    maxLng += lngPad;
  }
  if (minLat === maxLat) {
    const latPad = 0.00025;
    minLat -= latPad;
    maxLat += latPad;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export default function MapViewContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isPinsRefreshing, setIsPinsRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [placePins, setPlacePins] = useState<MapPlacePin[]>([]);
  const [overviewPins, setOverviewPins] = useState<MapOverviewPin[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [friendPlaceCounts, setFriendPlaceCounts] = useState<Record<string, number>>({});

  const [viewState, setViewState] = useState<MapViewport>({
    longitude: FALLBACK_VIEWPORT.longitude,
    latitude: FALLBACK_VIEWPORT.latitude,
    zoom: FALLBACK_VIEWPORT.zoom,
  });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [recommendationFilter, setRecommendationFilter] = useState<"all" | "must-see">("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [isPlaceDetailLoading, setIsPlaceDetailLoading] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [selectedPlaceSaveCount, setSelectedPlaceSaveCount] = useState(0);
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
  const [locationToast, setLocationToast] = useState<string | null>(null);
  const [noPlacesToast, setNoPlacesToast] = useState<string | null>(null);
  const [commentDeleteConfirmId, setCommentDeleteConfirmId] = useState<string | null>(null);
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
  const viewStateRef = useRef(viewState);
  const viewportResolvedRef = useRef(false);
  const mapReadyRef = useRef(false);
  const pinsFetchAbortRef = useRef<AbortController | null>(null);
  const placeDetailsCacheRef = useRef(new globalThis.Map<string, MapPlaceDetails>());
  const deepLinkPlaceRef = useRef<MapPlace | null>(null);
  viewStateRef.current = viewState;

  const mapFilterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedUserId) params.set("userId", selectedUserId);
    if (recommendationFilter === "must-see") params.set("mustSee", "true");
    if (selectedCategories.length > 0) {
      params.set("categories", selectedCategories.join(","));
    }
    return params;
  }, [selectedUserId, recommendationFilter, selectedCategories]);

  const filteredOverviewPins = useMemo(
    () =>
      filterOverviewPins(overviewPins, {
        userId: selectedUserId,
        mustSee: recommendationFilter === "must-see",
        categories: selectedCategories,
      }),
    [overviewPins, selectedUserId, recommendationFilter, selectedCategories]
  );

  const persistViewportDebounced = useRef(
    debounce((userId: string, viewport: MapViewport) => {
      saveViewport(userId, viewport);
    }, 500)
  ).current;

  // Search bar states
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const fetchViewportPins = useCallback(async () => {
    if (!user || !mapReadyRef.current) return;

    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (!map?.getBounds) return;

    const bounds = map.getBounds();
    const params = new URLSearchParams(mapFilterParams);
    params.set("north", String(bounds.getNorth()));
    params.set("south", String(bounds.getSouth()));
    params.set("east", String(bounds.getEast()));
    params.set("west", String(bounds.getWest()));

    pinsFetchAbortRef.current?.abort();
    const controller = new AbortController();
    pinsFetchAbortRef.current = controller;

    setIsPinsRefreshing(true);
    try {
      const response = await authenticatedFetch(`/api/map/pins?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Pins konnten nicht geladen werden.");
      const data = (await response.json()) as { pins: MapPlacePin[] };
      setPlacePins(data.pins ?? []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Error loading viewport pins:", error);
    } finally {
      if (!controller.signal.aborted) {
        setIsPinsRefreshing(false);
      }
    }
  }, [user, mapFilterParams]);

  const loadPlaceDetails = useCallback(async (pin: MapPlacePin) => {
    const cached = placeDetailsCacheRef.current.get(pin.id);
    if (cached) {
      setSelectedPlace(mergeMapPlace(pin, cached));
      setIsPlaceDetailLoading(false);
      return;
    }

    setIsPlaceDetailLoading(true);
    try {
      const response = await authenticatedFetch(`/api/map/activities/${pin.id}`);
      if (!response.ok) throw new Error("Details konnten nicht geladen werden.");
      const place = (await response.json()) as MapPlace;
      const details: MapPlaceDetails = {
        review: place.review,
        categories: place.categories,
        imageUrls: place.imageUrls,
        createdAt: place.createdAt,
      };
      placeDetailsCacheRef.current.set(pin.id, details);
      setSelectedPlace((prev) => (prev?.id === pin.id ? place : prev));
    } catch (error) {
      console.error("Error loading place details:", error);
    } finally {
      setIsPlaceDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadMapSession() {
      try {
        setIsSessionLoading(true);
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          setPlacePins([]);
          setOverviewPins([]);
          setFriends([]);
          setCategoryOptions([]);
          setFriendPlaceCounts({});
          setIsSessionLoading(false);
          return;
        }

        setUser(authUser);

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

        const metaResponse = await authenticatedFetch("/api/map/meta");
        if (metaResponse.ok) {
          const meta = (await metaResponse.json()) as {
            categories: string[];
            friendPlaceCounts: Record<string, number>;
            overviewPins: MapOverviewPin[];
          };
          setCategoryOptions(meta.categories ?? []);
          setFriendPlaceCounts(meta.friendPlaceCounts ?? {});
          setOverviewPins(meta.overviewPins ?? []);
        }

        const { data: wishlistEntries } = await supabase
          .from("wishlist")
          .select("activity_id")
          .eq("user_id", authUser.id);
        setWishlistIds((wishlistEntries || []).map((w: any) => w.activity_id));

        const placeIdParam = new URLSearchParams(window.location.search).get("placeId");
        if (placeIdParam) {
          const detailResponse = await authenticatedFetch(`/api/map/activities/${placeIdParam}`);
          if (detailResponse.ok) {
            const place = (await detailResponse.json()) as MapPlace;
            deepLinkPlaceRef.current = place;
            setSelectedPlace(place);
            placeDetailsCacheRef.current.set(place.id, {
              review: place.review,
              categories: place.categories,
              imageUrls: place.imageUrls,
              createdAt: place.createdAt,
            });
          }
        }
      } catch (err) {
        console.error("Error loading map session:", err);
      } finally {
        setIsSessionLoading(false);
      }
    }

    loadMapSession();
  }, []);

  useEffect(() => {
    if (isSessionLoading || viewportResolvedRef.current) return;

    async function initViewport() {
      try {
        const deepLink = deepLinkPlaceRef.current;
        const viewport = await resolveInitialViewport({
          userId: user?.id ?? null,
          urlLat: searchParams.get("lat"),
          urlLng: searchParams.get("lng"),
          placeId: searchParams.get("placeId"),
          places: deepLink
            ? [
                {
                  id: deepLink.id,
                  latitude: deepLink.latitude,
                  longitude: deepLink.longitude,
                },
              ]
            : [],
          fetchApproximateGeo: fetchApproximateGeoFromApi,
        });

        setViewState(viewport);
        viewportResolvedRef.current = true;

        const permission = await getGeolocationPermission();
        if (permission === "granted") {
          try {
            const position = await getCurrentUserPosition();
            setUserLocation(position);
          } catch {
            setUserLocation({
              latitude: viewport.latitude,
              longitude: viewport.longitude,
            });
          }
        }
      } catch (err) {
        console.error("Error resolving initial map viewport:", err);
        setViewState({ ...FALLBACK_VIEWPORT });
        viewportResolvedRef.current = true;
      }
    }

    initViewport();
  }, [isSessionLoading, user, searchParams]);

  useEffect(() => {
    if (isSessionLoading || !user || !mapReadyRef.current) return;
    void fetchViewportPins();
  }, [isSessionLoading, user, mapFilterParams, fetchViewportPins]);

  const handleMapLoad = useCallback(() => {
    mapReadyRef.current = true;
    const map = mapRef.current?.getMap?.();
    applyMapLabelLanguage(map);
    if (!isSessionLoading && user) {
      void fetchViewportPins();
    }
  }, [isSessionLoading, user, fetchViewportPins]);

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    applyMapLabelLanguage(map);
  }, [currentStyle]);

  const handleMoveEnd = useCallback(() => {
    void fetchViewportPins();

    if (!user?.id) return;
    void getGeolocationPermission().then((permission) => {
      if (permission === "granted") return;
      persistViewportDebounced(user.id, {
        latitude: viewStateRef.current.latitude,
        longitude: viewStateRef.current.longitude,
        zoom: viewStateRef.current.zoom,
      });
    });
  }, [user, persistViewportDebounced, fetchViewportPins]);

  // Handle zoom and select from URL search params reactively
  useEffect(() => {
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
          zoom: ZOOM_DETAIL,
        }));
      }
    } else if (placeIdParam && deepLinkPlaceRef.current?.id === placeIdParam) {
      const matched = deepLinkPlaceRef.current;
      setViewState((prev) => ({
        ...prev,
        latitude: matched.latitude,
        longitude: matched.longitude,
        zoom: ZOOM_DETAIL,
      }));
      setSelectedPlace(matched);
    }
  }, [searchParams]);

  const clusteredPlaceGroups = useMemo<ClusteredPlaceGroup[]>(
    () => clusterPlacesByScreenOverlap(placePins, viewState.zoom),
    [placePins, viewState.zoom]
  );

  useEffect(() => {
    if (!selectedPlace) return;

    if (selectedUserId && selectedPlace.userId !== selectedUserId) {
      setSelectedPlace(null);
      return;
    }

    if (recommendationFilter === "must-see" && !selectedPlace.isMustSee) {
      setSelectedPlace(null);
      return;
    }

    if (selectedCategories.length > 0) {
      const overviewPin = overviewPins.find((pin) => pin.id === selectedPlace.id);
      if (
        overviewPin &&
        !overviewPin.categories.some((category) => selectedCategories.includes(category))
      ) {
        setSelectedPlace(null);
      }
    }
  }, [
    selectedUserId,
    recommendationFilter,
    selectedCategories,
    selectedPlace,
    overviewPins,
  ]);

  // Search effect: recommendations via API + global geocoding
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const delayDebounce = setTimeout(async () => {
      let localMatches: SearchSuggestion[] = [];

      try {
        const recommendationParams = new URLSearchParams(mapFilterParams);
        recommendationParams.set("q", searchQuery.trim());
        const recommendationRes = await authenticatedFetch(
          `/api/map/search?${recommendationParams.toString()}`
        );

        if (recommendationRes.ok) {
          const recommendationData = (await recommendationRes.json()) as {
            results: Array<{ pin: MapPlacePin; address: string }>;
          };
          localMatches = (recommendationData.results || []).map((entry) => ({
            id: `local-${entry.pin.id}`,
            name: entry.pin.name,
            address: entry.address,
            latitude: entry.pin.latitude,
            longitude: entry.pin.longitude,
            isRecommendation: true,
            isMustSee: entry.pin.isMustSee,
            userName: entry.pin.userName,
            placeData: entry.pin,
            type: "poi",
          }));
        }
      } catch (err) {
        console.error("Error fetching recommendation search:", err);
      }

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

          setSuggestions([...localMatches, ...globalResults]);
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
  }, [searchQuery, user, mapFilterParams, viewState.latitude, viewState.longitude]);

  // Click outside search bar to close suggestions and filter menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFilterMenuOpen(false);
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
        void handlePlaceSelect(suggestion.placeData);
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
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationToast(GEOLOCATION_NOT_SUPPORTED_MESSAGE);
      return;
    }

    setIsLocating(true);
    void locateUserPosition()
      .then(({ latitude, longitude }) => {
        setUserLocation({ latitude, longitude });

        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: ZOOM_DETAIL,
          duration: 1500,
        });

        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
          zoom: ZOOM_DETAIL,
        }));
      })
      .catch((error) => {
        console.error("Error getting location:", error);
        setLocationToast(getGeolocationErrorMessage(error));
      })
      .finally(() => {
        setIsLocating(false);
      });
  };

  const handlePlaceSelect = useCallback(
    (pin: MapPlacePin) => {
      const cached = placeDetailsCacheRef.current.get(pin.id);
      setSelectedPlace(mergeMapPlace(pin, cached));
      void loadPlaceDetails(pin);

      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      if (!map) return;

      const targetZoom = Math.min(
        CLUSTER_EXPAND_MAX_ZOOM,
        Math.max(viewState.zoom, ZOOM_DETAIL)
      );
      const bounds = getClusterBounds([pin]);
      const centerLng = pin.longitude;
      const centerLat = pin.latitude;

      map.fitBounds(bounds, {
        padding: SINGLE_PIN_SELECT_MAP_PADDING,
        maxZoom: targetZoom,
        duration: 550,
        essential: true,
      });

      setViewState((prev) => ({
        ...prev,
        latitude: centerLat,
        longitude: centerLng,
        zoom: Math.max(prev.zoom, targetZoom),
      }));
    },
    [viewState.zoom, loadPlaceDetails]
  );

  const handleClusterExpand = useCallback(
    (group: ClusteredPlaceGroup) => {
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      if (!map) return;

      const clusterPlaces = group.places;
      const container = map.getContainer?.() as HTMLElement | undefined;
      const mapWidth = container?.clientWidth ?? window.innerWidth;
      const mapHeight = container?.clientHeight ?? window.innerHeight;
      const targetZoom = findOptimalClusterExpandZoom(
        clusterPlaces,
        viewState.zoom,
        mapWidth,
        mapHeight
      );
      const bounds = getClusterBounds(clusterPlaces);
      const centerLng = (bounds[0][0] + bounds[1][0]) / 2;
      const centerLat = (bounds[0][1] + bounds[1][1]) / 2;

      map.fitBounds(bounds, {
        padding: CLUSTER_EXPAND_MAP_PADDING,
        maxZoom: targetZoom,
        duration: 550,
        essential: true,
      });

      setViewState((prev) => ({
        ...prev,
        latitude: centerLat,
        longitude: centerLng,
        zoom: Math.min(prev.zoom, targetZoom),
      }));
    },
    [viewState.zoom]
  );

  const fitMapToUnclusteredPlaces = useCallback((placesToFit: MapPlacePin[]) => {
    if (placesToFit.length === 0) return;

    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (!map) return;

    const container = map.getContainer?.() as HTMLElement | undefined;
    const mapWidth = container?.clientWidth ?? window.innerWidth;
    const mapHeight = container?.clientHeight ?? window.innerHeight;
    const bounds = getClusterBounds(placesToFit);
    const centerLng = (bounds[0][0] + bounds[1][0]) / 2;
    const centerLat = (bounds[0][1] + bounds[1][1]) / 2;

    const targetZoom =
      placesToFit.length === 1
        ? Math.min(
            CLUSTER_EXPAND_MAX_ZOOM,
            Math.max(viewStateRef.current.zoom, ZOOM_DETAIL)
          )
        : findOptimalClusterExpandZoom(
            placesToFit,
            viewStateRef.current.zoom,
            mapWidth,
            mapHeight
          );

    map.fitBounds(bounds, {
      padding: CLUSTER_EXPAND_MAP_PADDING,
      maxZoom: targetZoom,
      duration: 550,
      essential: true,
    });

    setViewState((prev) => ({
      ...prev,
      latitude: centerLat,
      longitude: centerLng,
      zoom:
        placesToFit.length === 1
          ? Math.max(prev.zoom, targetZoom)
          : Math.min(prev.zoom, targetZoom),
    }));
  }, []);

  const fitMapToAllOverview = useCallback(async () => {
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (!map) return;

    const anchor = await resolveOverviewAnchor({
      userLocation,
      fallbackViewport: viewStateRef.current,
    });

    const placesToFit = selectPlacesForOverview(filteredOverviewPins, anchor);
    const container = map.getContainer?.() as HTMLElement | undefined;
    const mapWidth = container?.clientWidth ?? window.innerWidth;
    const mapHeight = container?.clientHeight ?? window.innerHeight;

    if (placesToFit.length === 0) {
      map.flyTo({
        center: [anchor.longitude, anchor.latitude],
        zoom: ZOOM_OVERVIEW_DEFAULT,
        duration: 550,
        essential: true,
      });
      setViewState((prev) => ({
        ...prev,
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        zoom: ZOOM_OVERVIEW_DEFAULT,
      }));
      return;
    }

    const bounds = getGeoBounds([
      { latitude: anchor.latitude, longitude: anchor.longitude },
      ...placesToFit,
    ]);
    const centerLng = (bounds[0][0] + bounds[1][0]) / 2;
    const centerLat = (bounds[0][1] + bounds[1][1]) / 2;

    const targetZoom = Math.min(
      placesToFit.length === 1
        ? 11
        : findOptimalClusterExpandZoom(
            placesToFit,
            viewStateRef.current.zoom,
            mapWidth,
            mapHeight
          ),
      12
    );

    map.fitBounds(bounds, {
      padding: CLUSTER_EXPAND_MAP_PADDING,
      minZoom: ZOOM_GERMANY_MIN,
      maxZoom: targetZoom,
      duration: 550,
      essential: true,
    });

    setViewState((prev) => ({
      ...prev,
      latitude: centerLat,
      longitude: centerLng,
      zoom: targetZoom,
    }));
  }, [filteredOverviewPins, userLocation]);

  const scheduleFitAllOverview = useCallback(() => {
    requestAnimationFrame(() => {
      void fitMapToAllOverview();
    });
  }, [fitMapToAllOverview]);

  const toggleWishlist = async (activityId: string) => {
    if (!user) return;
    const isSaved = wishlistIds.includes(activityId);
    if (isSaved) {
      setWishlistIds((prev) => prev.filter((id) => id !== activityId));
      setSelectedPlaceSaveCount((prev) => Math.max(0, prev - 1));
      try {
        const response = await authenticatedFetch(`/api/wishlist?activityId=${activityId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error();
      } catch (err) {
        setWishlistIds((prev) => [...prev, activityId]);
        setSelectedPlaceSaveCount((prev) => prev + 1);
      }
    } else {
      setWishlistIds((prev) => [...prev, activityId]);
      setSelectedPlaceSaveCount((prev) => prev + 1);
      try {
        const response = await authenticatedFetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId }),
        });
        if (!response.ok) throw new Error();
      } catch (err) {
        setWishlistIds((prev) => prev.filter((id) => id !== activityId));
        setSelectedPlaceSaveCount((prev) => Math.max(0, prev - 1));
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
    if (!selectedPlace) {
      setSelectedPlaceSaveCount(0);
      return;
    }

    let isActive = true;

    supabase
      .from("wishlist")
      .select("*", { count: "exact", head: true })
      .eq("activity_id", selectedPlace.id)
      .then(({ count }) => {
        if (isActive) {
          setSelectedPlaceSaveCount(count ?? 0);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedPlace?.id, supabase]);

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

  const handleSelectUser = (userId: string) => {
    const isDeselectingFriend = selectedUserId === userId;
    setSelectedUserId((prev) => {
      const next = prev === userId ? null : userId;
      if (next) {
        const friendHasPlaces = (friendPlaceCounts[next] ?? 0) > 0;
        const friend = friends.find((f) => f.id === next);
        if (!friendHasPlaces && friend) {
          setNoPlacesToast(`${friend.name} hat noch keine Orte empfohlen.`);
        } else {
          setNoPlacesToast(null);
        }
      } else {
        setNoPlacesToast(null);
      }
      return next;
    });
    setSelectedPlace(null);
    if (isDeselectingFriend) {
      scheduleFitAllOverview();
    }
  };

  useEffect(() => {
    if (!selectedUserId || filteredOverviewPins.length === 0) return;

    const frame = requestAnimationFrame(() => {
      fitMapToUnclusteredPlaces(
        filteredOverviewPins.map((pin) => ({
          id: pin.id,
          userId: pin.userId,
          userName: "",
          userInitials: "",
          userColor: "",
          userAvatarUrl: null,
          name: "",
          latitude: pin.latitude,
          longitude: pin.longitude,
          isMustSee: pin.isMustSee,
        }))
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [
    selectedUserId,
    filteredOverviewPins,
    fitMapToUnclusteredPlaces,
    recommendationFilter,
    selectedCategories,
  ]);

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
      {isSessionLoading && (
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-30 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 px-4 py-2.5 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 pointer-events-auto">
            <Loader2 className="h-4 w-4 animate-spin text-brand-green-700" />
            <span className="text-xs font-semibold text-slate-700">Karte wird geladen...</span>
          </div>
        </div>
      )}

      {isPinsRefreshing && !isSessionLoading && user && (
        <div className="pointer-events-none absolute top-[7.5rem] left-4 z-[18]">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-100 bg-white/95 px-2.5 py-1 shadow-md backdrop-blur-md">
            <Loader2 className="h-3 w-3 animate-spin text-brand-green-700" />
            <span className="text-[10px] font-semibold text-slate-600">Pins werden geladen</span>
          </div>
        </div>
      )}

      {locationToast && (
        <div className="pointer-events-none absolute top-4 left-4 right-4 z-[25]">
          <Toast message={locationToast} onDismiss={() => setLocationToast(null)} />
        </div>
      )}

      {/* Floating Search Bar */}
      {!isSessionLoading && (
        <div
          ref={searchContainerRef}
          className={`absolute left-4 right-4 z-20 ${locationToast ? "top-[4.5rem]" : "top-4"}`}
        >
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
      {!isSessionLoading && (
        user && friends.length > 0 ? (
          <div className="absolute left-0 right-0 z-10 top-[72px] flex flex-nowrap gap-2 overflow-x-auto no-scrollbar px-4 py-1">
            <button
              onClick={() => {
                setSelectedUserId(null);
                setSelectedPlace(null);
                setNoPlacesToast(null);
                scheduleFitAllOverview();
              }}
              className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95 ${
                selectedUserId === null
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
                className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95 ${
                  selectedUserId === friend.id
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

      {noPlacesToast && !isSessionLoading && user && friends.length > 0 && (
        <div className="pointer-events-none absolute top-[112px] left-4 right-4 z-[15]">
          <Toast
            message={noPlacesToast}
            variant="info"
            autoHideMs={4000}
            onDismiss={() => setNoPlacesToast(null)}
          />
        </div>
      )}

      {/* Mapbox Map */}
      <div className="w-full h-full flex-1">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onMoveEnd={handleMoveEnd}
          onLoad={handleMapLoad}
          style={{ width: "100%", height: "100%" }}
          mapStyle={currentStyle}
          mapboxAccessToken={mapboxToken}
          language={MAP_LABEL_LANGUAGE}
        >
          {clusteredPlaceGroups.map((group) => {
            if (group.places.length > 1) {
              const count = group.places.length;
              const countLabel = count > 9 ? "9+" : String(count);
              const uniqueUserIds = new Set(group.places.map((entry) => entry.userId));
              const singleUserStack = uniqueUserIds.size === 1;
              const representativePlace = group.places[0];
              return (
                <Marker
                  key={`cluster-${group.id}`}
                  latitude={group.latitude}
                  longitude={group.longitude}
                  anchor="center"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClusterExpand(group);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-brand-green-800 text-xs font-bold text-white shadow-lg shadow-brand-green-900/30 transition-transform duration-200 hover:scale-110 active:scale-95"
                    aria-label={`${count} Pins gestapelt`}
                    title={`${count} Orte`}
                  >
                    {singleUserStack ? (
                      <div className="relative flex h-full w-full items-center justify-center">
                        <div
                          className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white ${
                            representativePlace.userAvatarUrl ? "bg-slate-200" : representativePlace.userColor
                          }`}
                        >
                          {representativePlace.userAvatarUrl ? (
                            <img
                              src={representativePlace.userAvatarUrl}
                              alt={`Profilbild von ${representativePlace.userName}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            representativePlace.userInitials
                          )}
                        </div>
                        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-white bg-slate-900 px-1 text-[9px] font-bold leading-none text-white">
                          {countLabel}
                        </span>
                      </div>
                    ) : (
                      countLabel
                    )}
                  </button>
                </Marker>
              );
            }

            const place = group.places[0];
            return (
              <Marker
                key={place.id}
                latitude={place.latitude}
                longitude={place.longitude}
                anchor="center"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaceSelect(place as MapPlacePin);
                  }}
                  className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 text-[10px] font-bold text-white shadow-lg ${
                      place.isMustSee ? "border-amber-400 shadow-amber-400/30" : "border-white"
                    } ${place.userAvatarUrl ? "bg-slate-200" : place.userColor}`}
                  >
                    {place.userAvatarUrl ? (
                      <img
                        src={place.userAvatarUrl}
                        alt={`Profilbild von ${place.userName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      place.userInitials
                    )}
                  </div>
                  {!selectedPlace && (
                    <div className="absolute -top-8 bg-slate-900/90 text-white text-[10px] px-2 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none font-medium backdrop-blur-sm">
                      {place.name}
                    </div>
                  )}
                </button>
              </Marker>
            );
          })}

          {userLocation && (
            <Marker
              latitude={userLocation.latitude}
              longitude={userLocation.longitude}
              anchor="center"
            >
              <div className="flex h-5 w-5 items-center justify-center pointer-events-none">
                <span className="inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white shadow-[0_0_0_3px_rgba(16,185,129,0.16),0_2px_6px_rgba(15,23,42,0.16)]"></span>
              </div>
            </Marker>
          )}

          {selectedPlace && (
            <Popup
              latitude={selectedPlace.latitude}
              longitude={selectedPlace.longitude}
              anchor="bottom"
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

                {isPlaceDetailLoading ? (
                  <div className="mt-2.5 space-y-2" aria-hidden="true">
                    <div className="h-3 w-full animate-pulse rounded-md bg-slate-100" />
                    <div className="h-3 w-4/5 animate-pulse rounded-md bg-slate-100" />
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      <div className="aspect-square animate-pulse rounded-lg bg-slate-100" />
                      <div className="aspect-square animate-pulse rounded-lg bg-slate-100" />
                      <div className="aspect-square animate-pulse rounded-lg bg-slate-100" />
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedPlace.review.trim().length > 0 && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                        {truncatePopupText(selectedPlace.review)}
                      </p>
                    )}

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
                  </>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {user && selectedPlace.userId !== user.id && (
                    <button
                      onClick={() => toggleWishlist(selectedPlace.id)}
                      className={`flex items-center gap-1.5 justify-center active:scale-90 transition-all cursor-pointer p-0.5 ${
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
                      {selectedPlaceSaveCount > 0 && (
                        <span className="text-[11px] font-semibold select-none">
                          {selectedPlaceSaveCount}
                        </span>
                      )}
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
      {!isSessionLoading && !user && (
        <div className="absolute bottom-[calc(64px+8px+env(safe-area-inset-bottom))] left-4 right-4 z-20 bg-white/95 p-5 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-3">
          <div>

          {isCommentsOpen && selectedPlace && (
            <div 
              onClick={closeComments}
              className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 px-4 pb-6 backdrop-blur-sm"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-slate-100 bg-white shadow-2xl"
              >
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
                                            setCommentDeleteConfirmId(comment.id);
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

      <ConfirmDialog
        open={commentDeleteConfirmId !== null}
        title="Kommentar löschen?"
        message="Möchtest du diesen Kommentar wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden."
        isLoading={commentDeleteConfirmId !== null && commentDeletingId === commentDeleteConfirmId}
        onCancel={() => setCommentDeleteConfirmId(null)}
        onConfirm={() => {
          if (!commentDeleteConfirmId) return;
          const id = commentDeleteConfirmId;
          setCommentDeleteConfirmId(null);
          void handleDeleteComment(id);
        }}
      />

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
