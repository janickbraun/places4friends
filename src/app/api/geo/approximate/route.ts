import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

type GeoAccuracy = "city" | "country";

interface GeoCacheEntry {
  latitude: number;
  longitude: number;
  accuracy: GeoAccuracy;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const geoCache = new Map<string, GeoCacheEntry>();

const DEV_FALLBACK = {
  latitude: 48.1374,
  longitude: 11.5755,
  accuracy: "city" as const,
};

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1] ?? "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function cacheKeyForIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

function geoFromVercelHeaders(request: NextRequest): {
  latitude: number;
  longitude: number;
  accuracy: GeoAccuracy;
} | null {
  const vercelLat = request.headers.get("x-vercel-ip-latitude");
  const vercelLng = request.headers.get("x-vercel-ip-longitude");
  const vercelCity = request.headers.get("x-vercel-ip-city");

  if (!vercelLat || !vercelLng) return null;

  const lat = parseFloat(vercelLat);
  const lng = parseFloat(vercelLng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    latitude: lat,
    longitude: lng,
    accuracy: vercelCity ? "city" : "country",
  };
}

async function lookupGeoFromIp(ip: string): Promise<{
  latitude: number;
  longitude: number;
  accuracy: GeoAccuracy;
} | null> {
  try {
    const url = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "places4friends/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      latitude?: number;
      longitude?: number;
      error?: boolean;
    };

    if (data.error || data.latitude == null || data.longitude == null) {
      return null;
    }

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: "city",
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const debugLat = request.nextUrl.searchParams.get("debugLat");
  const debugLng = request.nextUrl.searchParams.get("debugLng");

  if (process.env.NODE_ENV === "development" && debugLat && debugLng) {
    const lat = parseFloat(debugLat);
    const lng = parseFloat(debugLng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return NextResponse.json({
        latitude: lat,
        longitude: lng,
        accuracy: "city" satisfies GeoAccuracy,
      });
    }
  }

  const ip = getClientIp(request);

  if (!ip || isPrivateOrLocalIp(ip)) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(DEV_FALLBACK);
    }
    return NextResponse.json({ error: "location_unavailable" }, { status: 404 });
  }

  const cacheKey = cacheKeyForIp(ip);
  const cached = geoCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      latitude: cached.latitude,
      longitude: cached.longitude,
      accuracy: cached.accuracy,
    });
  }

  let result = geoFromVercelHeaders(request);

  if (!result) {
    result = await lookupGeoFromIp(ip);
  }

  if (!result) {
    return NextResponse.json({ error: "location_unavailable" }, { status: 404 });
  }

  geoCache.set(cacheKey, {
    ...result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  if (geoCache.size > 500) {
    const now = Date.now();
    for (const [key, entry] of geoCache) {
      if (entry.expiresAt < now) geoCache.delete(key);
    }
  }

  return NextResponse.json({
    latitude: result.latitude,
    longitude: result.longitude,
    accuracy: result.accuracy,
  });
}
