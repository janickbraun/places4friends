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
  let query = searchParams.get("query")?.trim() ?? "";
  if (query.length > 200) {
    query = query.substring(0, 200);
  }
  const lat = parseNumber(searchParams.get("lat"));
  const lng = parseNumber(searchParams.get("lng"));

  if (lat !== null && (lat < -90 || lat > 90 || Number.isNaN(lat))) {
    return NextResponse.json({ error: "Ungültige geographische Breite." }, { status: 400 });
  }
  if (lng !== null && (lng < -180 || lng > 180 || Number.isNaN(lng))) {
    return NextResponse.json({ error: "Ungültige geographische Länge." }, { status: 400 });
  }

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

  const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
  url.searchParams.set("q", query);
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

  const mapMapboxType = (featureType: string): string => {
    if (!featureType) return "poi";
    if (featureType === "country") return "country";
    if (featureType === "region" || featureType === "district") return "region";
    if (featureType === "place" || featureType === "locality" || featureType === "city") return "city";
    if (featureType === "neighborhood") return "neighborhood";
    if (featureType === "address" || featureType === "postcode" || featureType === "street") return "address";
    return "poi";
  };

  const results: PlaceResult[] = (data.features ?? []).map((feature: any) => ({
    id: feature.properties?.mapbox_id ?? feature.id ?? Math.random().toString(),
    name: feature.properties?.name ?? feature.properties?.place_name ?? "Unbekannter Ort",
    address: feature.properties?.full_address ?? feature.properties?.address ?? feature.properties?.place_formatted ?? null,
    latitude: feature.geometry?.coordinates?.[1] ?? null,
    longitude: feature.geometry?.coordinates?.[0] ?? null,
    source: "mapbox",
    type: mapMapboxType(feature.properties?.feature_type),
  }));

  return NextResponse.json({ results });
}
