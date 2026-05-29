import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_CATEGORIES = new Set([
  "Cafe",
  "Restaurant",
  "Freizeitpark",
  "Bar",
  "Museum",
  "Kino",
  "Park",
  "Natur",
  "Sehenswuerdigkeit",
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
  if (!id) {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let payload: {
    placeName?: unknown;
    description?: unknown;
    isSuperLike?: unknown;
    categories?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }

  const placeName = typeof payload.placeName === "string" ? payload.placeName.trim() : "";
  if (!placeName) {
    return NextResponse.json({ error: "Name fehlt." }, { status: 400 });
  }

  if (typeof payload.isSuperLike !== "boolean") {
    return NextResponse.json({ error: "Ungueltige Markierung." }, { status: 400 });
  }

  const description = typeof payload.description === "string" ? payload.description.trim() : null;
  const categories = normalizeCategories(payload.categories);

  const { data, error } = await supabase
    .from("activities")
    .update({
      place_name: placeName,
      description: description || null,
      is_superlike: payload.isSuperLike,
      categories,
    })
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
