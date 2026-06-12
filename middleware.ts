import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check for Upstash Redis credentials
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let searchRateLimiter: Ratelimit | null = null;
let writeRateLimiter: Ratelimit | null = null;

if (redisUrl && redisToken) {
  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // limit searches & IP geocoding to 20 requests per 1 minute per IP
    searchRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      analytics: true,
      prefix: "ratelimit:search",
    });

    // limit all data mutations (POST, PATCH, DELETE) to 30 requests per 5 minutes per IP
    writeRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "300 s"),
      analytics: true,
      prefix: "ratelimit:write",
    });
  } catch (error) {
    console.error("Failed to initialize Upstash Redis client:", error);
  }
}

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  
  const netlifyIp = request.headers.get("x-nf-client-connection-ip");
  if (netlifyIp) return netlifyIp.trim();
  
  const reqIp = (request as any).ip;
  if (reqIp) return reqIp;

  return "127.0.0.1";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Rate limit API endpoints only
  if (pathname.startsWith("/api/") && searchRateLimiter && writeRateLimiter) {
    try {
      const ip = getIp(request);

      // Rule 1: Search & Geolocation Endpoints (GET requests only)
      const isSearchRoute =
        pathname === "/api/places/search" ||
        pathname === "/api/map/search" ||
        pathname === "/api/geo/approximate";

      if (isSearchRoute && method === "GET") {
        const { success, limit, remaining, reset } = await searchRateLimiter.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: "Zu viele Anfragen. Bitte warte kurz." }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            }
          );
        }
      }

      // Rule 2: Write / Mutation Endpoints (POST/PATCH/DELETE)
      const isMutation = ["POST", "PATCH", "DELETE"].includes(method);
      if (isMutation) {
        const { success, limit, remaining, reset } = await writeRateLimiter.limit(`${method}:${ip}`);
        if (!success) {
          return new NextResponse(
            JSON.stringify({
              error: "Zu viele Schreibaktionen. Bitte versuche es später noch einmal.",
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            }
          );
        }
      }
    } catch (error) {
      // Fail-open: prevent external service failures from breaking the app
      console.error("Rate limiting proxy error (failing open):", error);
    }
  }

  // Continue with Supabase session update
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
