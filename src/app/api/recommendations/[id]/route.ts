import { NextResponse } from "next/server";
import { createApiClient, getApiUser } from "@/lib/supabase/apiAuth";
import { isValidUuid } from "@/lib/validation";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: "Ungültiges ID-Format." }, { status: 400 });
  }

  const user = await getApiUser(request);
  const supabase = await createApiClient(request);

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let payload: {
    placeName?: unknown;
    description?: unknown;
    isMustSee?: unknown;
    categories?: unknown;
    imageUrls?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const placeName = typeof payload.placeName === "string" ? payload.placeName.trim() : "";
  if (!placeName) {
    return NextResponse.json({ error: "Name fehlt." }, { status: 400 });
  }

  if (placeName.length > 100) {
    return NextResponse.json({ error: "Der Name des Ortes darf maximal 100 Zeichen lang sein." }, { status: 400 });
  }

  if (typeof payload.isMustSee !== "boolean") {
    return NextResponse.json({ error: "Ungültige Markierung." }, { status: 400 });
  }

  const description = typeof payload.description === "string" ? payload.description.trim() : null;
  if (description && description.length > 2000) {
    return NextResponse.json({ error: "Die Beschreibung darf maximal 2000 Zeichen lang sein." }, { status: 400 });
  }

  const categories = normalizeCategories(payload.categories);
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter((url) => url.length > 0 && url.length <= 1000 && url.startsWith("http"))
    : null;

  if (imageUrls !== null && imageUrls.length > 3) {
    return NextResponse.json({ error: "Es dürfen maximal 3 Bilder hochgeladen werden." }, { status: 400 });
  }

  const updateFields: any = {
    place_name: placeName,
    description: description || null,
    is_superlike: payload.isMustSee,
    categories,
  };

  if (imageUrls !== null) {
    updateFields.image_urls = imageUrls;
  }

  const { data, error } = await supabase
    .from("activities")
    .update(updateFields)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("activities update failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Empfehlung konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ id: data.id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: "Ungültiges ID-Format." }, { status: 400 });
  }

  const user = await getApiUser(request);
  const supabase = await createApiClient(request);

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  // Fetch the activity first to get the image_urls
  const { data: activity } = await supabase
    .from("activities")
    .select("image_urls")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // 1. Delete associated comments first (to avoid foreign key constraint violations)
  const { error: commentsError } = await supabase
    .from("activity_comments")
    .delete()
    .eq("activity_id", id);

  if (commentsError) {
    console.error("Failed to delete comments associated with activity:", commentsError);
  }

  // 2. Delete associated wishlist entries first (to avoid foreign key constraint violations)
  const { error: wishlistError } = await supabase
    .from("wishlist")
    .delete()
    .eq("activity_id", id);

  if (wishlistError) {
    console.error("Failed to delete wishlist entries associated with activity:", wishlistError);
  }

  const { data, error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("activities delete failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Empfehlung konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  // Clean up storage files if present
  if (activity?.image_urls && activity.image_urls.length > 0) {
    const fileNames = activity.image_urls.map((url: string) => {
      const parts = url.split("/");
      return parts[parts.length - 1];
    });
    if (fileNames.length > 0) {
      await supabase.storage.from("activity-images").remove(fileNames);
    }
  }

  return NextResponse.json({ id: data.id });
}
