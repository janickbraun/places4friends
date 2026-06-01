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

  if (!payload.placeName?.trim()) {
    return NextResponse.json({ error: "Ort fehlt." }, { status: 400 });
  }

  const categories = normalizeCategories(payload.categories);
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter((url): url is string => typeof url === "string")
    : [];

  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      place_id: payload.placeId,
      place_name: payload.placeName.trim(),
      place_address: payload.placeAddress?.trim() || null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      is_superlike: Boolean(payload.isMustSee),
      categories,
      description: payload.description?.trim() || null,
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
