import { NextResponse, type NextRequest } from "next/server";

interface PlaceResult {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "google" | "mapbox";
  type: string;
}

const GOOGLE_PLACES_ENDPOINT = "https://maps.googleapis.com/maps/api/place";
const MAPBOX_GEOCODING_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places";

const parseNumber = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query")?.trim() ?? "";
  const lat = parseNumber(searchParams.get("lat"));
  const lng = parseNumber(searchParams.get("lng"));
  const mode = searchParams.get("mode") ?? "anywhere";
  const radius = Math.min(
    Math.max(Number.parseInt(searchParams.get("radius") ?? "3000", 10), 500),
    50000
  );

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (googleKey) {
    const url = new URL(
      query || mode === "nearby"
        ? `${GOOGLE_PLACES_ENDPOINT}/${query ? "textsearch" : "nearbysearch"}/json`
        : `${GOOGLE_PLACES_ENDPOINT}/textsearch/json`
    );
    url.searchParams.set("key", googleKey);

    if (query) {
      url.searchParams.set("query", query);
    }

    if (lat !== null && lng !== null) {
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("radius", String(radius));
    }

    if (!query && (lat === null || lng === null)) {
      return NextResponse.json({ results: [] });
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    const data = await response.json();

    if (!response.ok || data.status === "REQUEST_DENIED") {
      return NextResponse.json(
        { error: data.error_message ?? "Places API Fehler." },
        { status: 502 }
      );
    }

    const mapGoogleType = (types: string[]): string => {
      if (!types || types.length === 0) return "poi";
      if (types.includes("country")) return "country";
      if (types.includes("administrative_area_level_1") || types.includes("administrative_area_level_2")) return "region";
      if (types.includes("locality")) return "city";
      if (types.includes("sublocality") || types.includes("neighborhood")) return "neighborhood";
      if (types.includes("route") || types.includes("street_address") || types.includes("postal_code")) return "address";
      return "poi";
    };

    const results: PlaceResult[] = (data.results ?? []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address ?? null,
      latitude: place.geometry?.location?.lat ?? null,
      longitude: place.geometry?.location?.lng ?? null,
      source: "google",
      type: mapGoogleType(place.types ?? []),
    }));

    return NextResponse.json({ results });
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    return NextResponse.json(
      { error: "Kein Places API Token konfiguriert." },
      { status: 500 }
    );
  }

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL(`${MAPBOX_GEOCODING_ENDPOINT}/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", mapboxToken);
  url.searchParams.set("limit", "8");
  url.searchParams.set("language", "de");
  if (lat !== null && lng !== null) {
    url.searchParams.set("proximity", `${lng},${lat}`);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: "Mapbox Suche fehlgeschlagen." },
      { status: 502 }
    );
  }

  const mapMapboxType = (placeTypes: string[]): string => {
    if (!placeTypes || placeTypes.length === 0) return "poi";
    const primary = placeTypes[0];
    if (primary === "country") return "country";
    if (primary === "region") return "region";
    if (primary === "place" || primary === "locality") return "city";
    if (primary === "district") return "region";
    if (primary === "neighborhood") return "neighborhood";
    if (primary === "address" || primary === "postcode") return "address";
    return "poi";
  };

  const results: PlaceResult[] = (data.features ?? []).map((feature: any) => ({
    id: feature.id,
    name: feature.text,
    address: feature.place_name ?? null,
    latitude: feature.center?.[1] ?? null,
    longitude: feature.center?.[0] ?? null,
    source: "mapbox",
    type: mapMapboxType(feature.place_type ?? []),
  }));

  return NextResponse.json({ results });
}
