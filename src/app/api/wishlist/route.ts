import { NextResponse } from "next/server";
import { createApiClient, getApiUser } from "@/lib/supabase/apiAuth";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  const supabase = await createApiClient(request);

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  // Fetch all wishlist entries for the user
  const { data: wishlistEntries, error: wishlistError } = await supabase
    .from("wishlist")
    .select("id, activity_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (wishlistError) {
    console.error("wishlist fetch failed", wishlistError);
    return NextResponse.json(
      { error: "Wishlist konnte nicht geladen werden." },
      { status: 500 }
    );
  }

  if (!wishlistEntries || wishlistEntries.length === 0) {
    return NextResponse.json([]);
  }

  const activityIds = wishlistEntries.map((w) => w.activity_id);

  // Fetch corresponding activities
  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, user_id, place_name, place_address, latitude, longitude, is_superlike, description, categories, created_at")
    .in("id", activityIds);

  if (activitiesError) {
    console.error("activities fetch for wishlist failed", activitiesError);
    return NextResponse.json(
      { error: "Aktivitäten für die Wishlist konnten nicht geladen werden." },
      { status: 500 }
    );
  }

  // Fetch creators' profiles
  const creatorIds = Array.from(new Set(activities.map((a) => a.user_id)));
  let profiles: any[] = [];
  if (creatorIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .in("id", creatorIds);

    if (profilesError) {
      console.error("profiles fetch for wishlist failed", profilesError);
    } else {
      profiles = profilesData || [];
    }
  }

  // Merge everything
  const result = wishlistEntries
    .map((w) => {
      const activity = activities.find((a) => a.id === w.activity_id);
      if (!activity) return null;

      const creator = profiles.find((p) => p.id === activity.user_id);
      return {
        id: w.id,
        activityId: activity.id,
        createdAt: w.created_at,
        placeName: activity.place_name,
        placeAddress: activity.place_address || null,
        latitude: activity.latitude,
        longitude: activity.longitude,
        isMustSee: activity.is_superlike,
        description: activity.description || "",
        categories: Array.isArray(activity.categories) ? activity.categories : [],
        friend: {
          id: activity.user_id,
          name: creator?.full_name ?? creator?.username ?? "Freund",
          username: creator?.username ?? "",
        },
      };
    })
    .filter(Boolean);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  const supabase = await createApiClient(request);

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let payload: { activityId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { activityId } = payload;
  if (!activityId) {
    return NextResponse.json({ error: "Aktivitäts-ID fehlt." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("wishlist")
    .insert({
      user_id: user.id,
      activity_id: activityId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("wishlist insert failed", error);
    return NextResponse.json(
      { error: "Konnte nicht zur Wishlist hinzugefügt werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: data.id });
}

export async function DELETE(request: Request) {
  const user = await getApiUser(request);
  const supabase = await createApiClient(request);

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let activityId = searchParams.get("activityId");

  if (!activityId) {
    try {
      const payload = await request.json();
      activityId = payload.activityId;
    } catch {
      // Ignored if JSON parsing fails or isn't provided
    }
  }

  if (!activityId) {
    return NextResponse.json({ error: "Aktivitäts-ID fehlt." }, { status: 400 });
  }

  const { error } = await supabase
    .from("wishlist")
    .delete()
    .eq("user_id", user.id)
    .eq("activity_id", activityId);

  if (error) {
    console.error("wishlist delete failed", error);
    return NextResponse.json(
      { error: "Konnte nicht aus der Wishlist entfernt werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
