export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

export const ZOOM_100KM = 8;
export const ZOOM_DETAIL = 15;

/** Neutral Germany overview (not Regensburg-specific). */
export const FALLBACK_VIEWPORT: MapViewport = {
  latitude: 51.1657,
  longitude: 10.4515,
  zoom: 6,
};

const VIEWPORT_STORAGE_PREFIX = "p4f_map_viewport_";
const LAST_GEO_STORAGE_KEY = "p4f_last_geo";

export type GeolocationPermissionState = "granted" | "denied" | "prompt" | "unknown";

export interface ResolveInitialViewportOptions {
  userId: string | null;
  urlLat: string | null;
  urlLng: string | null;
  placeId: string | null;
  places: Array<{ id: string; latitude: number; longitude: number }>;
  fetchApproximateGeo: () => Promise<{ latitude: number; longitude: number } | null>;
}

function viewportStorageKey(userId: string): string {
  return `${VIEWPORT_STORAGE_PREFIX}${userId}`;
}

export function loadSavedViewport(userId: string): MapViewport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(viewportStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MapViewport;
    if (
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number" &&
      typeof parsed.zoom === "number" &&
      !Number.isNaN(parsed.latitude) &&
      !Number.isNaN(parsed.longitude) &&
      !Number.isNaN(parsed.zoom)
    ) {
      return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

export function saveViewport(userId: string, viewport: MapViewport): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(viewportStorageKey(userId), JSON.stringify(viewport));
  } catch {
    // ignore quota errors
  }
}

export function saveLastKnownGeo(latitude: number, longitude: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      LAST_GEO_STORAGE_KEY,
      JSON.stringify({ latitude, longitude, savedAt: Date.now() })
    );
  } catch {
    // ignore
  }
}

function loadLastKnownGeo(): { latitude: number; longitude: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_GEO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      latitude: number;
      longitude: number;
      savedAt: number;
    };
    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number" ||
      Number.isNaN(parsed.latitude) ||
      Number.isNaN(parsed.longitude)
    ) {
      return null;
    }
    return { latitude: parsed.latitude, longitude: parsed.longitude };
  } catch {
    return null;
  }
}

export async function getGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "unknown";
  }

  try {
    const permissions = navigator.permissions;
    if (permissions?.query) {
      const status = await permissions.query({ name: "geolocation" });
      return status.state as GeolocationPermissionState;
    }
  } catch {
    // Safari / older browsers may not support permissions query for geolocation
  }

  const lastGeo = loadLastKnownGeo();
  if (lastGeo) return "granted";

  return "unknown";
}

export const GEOLOCATION_NOT_SUPPORTED_MESSAGE =
  "Geolokalisierung wird von deinem Browser nicht unterstützt.";

function isGeolocationPositionError(error: unknown): error is GeolocationPositionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as GeolocationPositionError).code === "number"
  );
}

export function getGeolocationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "Geolocation not supported") {
    return GEOLOCATION_NOT_SUPPORTED_MESSAGE;
  }

  if (isGeolocationPositionError(error)) {
    if (error.code === error.PERMISSION_DENIED) {
      return "Standortzugriff wurde verweigert. Bitte erlaube den Standortzugriff in deinem Browser.";
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return "Standortinformationen sind derzeit nicht verfügbar.";
    }
    if (error.code === error.TIMEOUT) {
      return "Dein Standort konnte nicht rechtzeitig ermittelt werden. Bitte versuche es erneut oder prüfe die Standortfreigabe.";
    }
  }

  return "Dein Standort konnte nicht ermittelt werden.";
}

export function getCurrentUserPosition(options?: {
  maximumAge?: number;
  timeout?: number;
  enableHighAccuracy?: boolean;
}): Promise<{ latitude: number; longitude: number }> {
  const {
    maximumAge = 300_000,
    timeout = 10_000,
    enableHighAccuracy = false,
  } = options ?? {};

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        saveLastKnownGeo(latitude, longitude);
        resolve({ latitude, longitude });
      },
      (error) => reject(error),
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  });
}

/**
 * Resolves the user's position for explicit "locate me" actions.
 * Prefers a fast network-based fix; falls back to last known position or high accuracy GPS.
 */
export async function locateUserPosition(): Promise<{ latitude: number; longitude: number }> {
  try {
    return await getCurrentUserPosition({
      enableHighAccuracy: false,
      timeout: 15_000,
      maximumAge: 120_000,
    });
  } catch (error) {
    const lastGeo = loadLastKnownGeo();
    const recoverable =
      isGeolocationPositionError(error) &&
      (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE);

    if (lastGeo && recoverable) {
      return lastGeo;
    }

    if (!recoverable) {
      throw error;
    }

    return getCurrentUserPosition({
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    });
  }
}

function viewportAround(latitude: number, longitude: number, zoom: number): MapViewport {
  return { latitude, longitude, zoom };
}

function resolveUrlViewport(
  urlLat: string | null,
  urlLng: string | null,
  placeId: string | null,
  places: ResolveInitialViewportOptions["places"]
): MapViewport | null {
  if (urlLat && urlLng) {
    const lat = parseFloat(urlLat);
    const lng = parseFloat(urlLng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return viewportAround(lat, lng, ZOOM_DETAIL);
    }
  }

  if (placeId) {
    const matched = places.find((p) => p.id === placeId);
    if (matched) {
      return viewportAround(matched.latitude, matched.longitude, ZOOM_DETAIL);
    }
  }

  return null;
}

/**
 * Resolves the initial map viewport following the priority chain:
 * URL params > GPS (if granted) > saved viewport (logged in) > IP geo (guests) > DE fallback.
 */
export async function resolveInitialViewport(
  options: ResolveInitialViewportOptions
): Promise<MapViewport> {
  const urlViewport = resolveUrlViewport(
    options.urlLat,
    options.urlLng,
    options.placeId,
    options.places
  );
  if (urlViewport) return urlViewport;

  const permission = await getGeolocationPermission();
  if (permission === "granted") {
    try {
      const position = await getCurrentUserPosition();
      return viewportAround(position.latitude, position.longitude, ZOOM_100KM);
    } catch {
      const lastGeo = loadLastKnownGeo();
      if (lastGeo) {
        return viewportAround(lastGeo.latitude, lastGeo.longitude, ZOOM_100KM);
      }
    }
  }

  if (options.userId) {
    const saved = loadSavedViewport(options.userId);
    if (saved) return saved;
    return { ...FALLBACK_VIEWPORT };
  }

  try {
    const approx = await options.fetchApproximateGeo();
    if (approx) {
      return viewportAround(approx.latitude, approx.longitude, ZOOM_100KM);
    }
  } catch {
    // fall through to default
  }

  return { ...FALLBACK_VIEWPORT };
}

export async function fetchApproximateGeoFromApi(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const res = await fetch("/api/geo/approximate");
  if (!res.ok) return null;
  const data = (await res.json()) as {
    latitude?: number;
    longitude?: number;
  };
  if (
    typeof data.latitude !== "number" ||
    typeof data.longitude !== "number" ||
    Number.isNaN(data.latitude) ||
    Number.isNaN(data.longitude)
  ) {
    return null;
  }
  return { latitude: data.latitude, longitude: data.longitude };
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
