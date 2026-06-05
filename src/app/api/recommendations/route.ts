import { NextResponse } from "next/server";
import { createApiClient, getApiUser } from "@/lib/supabase/apiAuth";

interface RecommendationPayload {
  placeId: string | null;
  placeName: string;
  placeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  isMustSee?: boolean;
  categories?: string[] | null;
  description: string | null;
  imageUrls?: string[] | null;
}

const ALLOWED_CATEGORIES = new Set([
  "Cafe",
  "Restaurant",
  "Freizeitpark",
  "Bar",
  "Museum",
  "Kino",
  "Park",
  "Natur",
  "Sehenswürdigkeit",
  "Date",
  "Freizeit",
  "Piss-Spot",
  "Bildung",
  "Einkaufen",
  "Sport",
  "Event",
]);

function normalizeCategories(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const normalized = input
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && ALLOWED_CATEGORIES.has(value));
  return Array.from(new Set(normalized));
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  const supabase = await createApiClient(request);

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let payload: RecommendationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!payload.placeName || typeof payload.placeName !== "string" || !payload.placeName.trim()) {
    return NextResponse.json({ error: "Ort fehlt." }, { status: 400 });
  }

  const placeName = payload.placeName.trim();
  if (placeName.length > 100) {
    return NextResponse.json({ error: "Der Name des Ortes darf maximal 100 Zeichen lang sein." }, { status: 400 });
  }

  const placeAddress = typeof payload.placeAddress === "string" ? payload.placeAddress.trim() : null;
  if (placeAddress && placeAddress.length > 250) {
    return NextResponse.json({ error: "Die Adresse darf maximal 250 Zeichen lang sein." }, { status: 400 });
  }

  const description = typeof payload.description === "string" ? payload.description.trim() : null;
  if (description && description.length > 2000) {
    return NextResponse.json({ error: "Die Beschreibung darf maximal 2000 Zeichen lang sein." }, { status: 400 });
  }

  const placeId = typeof payload.placeId === "string" ? payload.placeId.trim() : null;
  if (placeId && placeId.length > 100) {
    return NextResponse.json({ error: "Die Ort-ID ist ungültig." }, { status: 400 });
  }

  const latitude = payload.latitude;
  if (latitude !== null && latitude !== undefined) {
    if (typeof latitude !== "number" || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: "Ungültige geographische Breite." }, { status: 400 });
    }
  }

  const longitude = payload.longitude;
  if (longitude !== null && longitude !== undefined) {
    if (typeof longitude !== "number" || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Ungültige geographische Länge." }, { status: 400 });
    }
  }

  const categories = normalizeCategories(payload.categories);
  const rawImageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter((url): url is string => typeof url === "string")
    : [];

  const imageUrls = rawImageUrls
    .map((url) => url.trim())
    .filter((url) => url.length > 0 && url.length <= 1000 && url.startsWith("http"));

  if (imageUrls.length > 3) {
    return NextResponse.json({ error: "Es dürfen maximal 3 Bilder hochgeladen werden." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      place_id: placeId,
      place_name: placeName,
      place_address: placeAddress,
      latitude,
      longitude,
      is_superlike: Boolean(payload.isMustSee),
      categories,
      description,
      image_urls: imageUrls,
    })
    .select("id")
    .single();

  if (error) {
    console.error("activities insert failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return NextResponse.json(
      {
        error: "Empfehlung konnte nicht gespeichert werden.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data?.id ?? null });
}
