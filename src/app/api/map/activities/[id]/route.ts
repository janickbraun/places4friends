import { NextResponse } from "next/server";
import { createApiClient, getApiUser } from "@/lib/supabase/apiAuth";
import {
  activityRowToDetails,
  activityRowToPin,
  mergeMapPlace,
} from "@/lib/mapPlaces";
import { getNetworkUserIds, loadProfileMap, profileInfoForUser } from "@/lib/mapNetwork";
import { isValidUuid } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: "Ungültiges Aktivitäts-ID-Format." }, { status: 400 });
  }

  try {
    const supabase = await createApiClient(request);
    const allowedUserIds = await getNetworkUserIds(supabase, user.id);

    const { data: activity, error } = await supabase
      .from("activities")
      .select(
        "id, user_id, place_name, latitude, longitude, is_superlike, description, categories, image_urls, created_at"
      )
      .eq("id", id)
      .in("user_id", allowedUserIds)
      .maybeSingle();

    if (error) {
      console.error("map activity detail fetch failed", error);
      return NextResponse.json(
        { error: "Empfehlung konnte nicht geladen werden." },
        { status: 500 }
      );
    }

    if (!activity || activity.latitude === null || activity.longitude === null) {
      return NextResponse.json({ error: "Empfehlung nicht gefunden." }, { status: 404 });
    }

    const profileMap = await loadProfileMap(supabase, [activity.user_id]);
    const profile = profileInfoForUser(profileMap, activity.user_id);
    const pin = activityRowToPin(
      {
        id: activity.id,
        user_id: activity.user_id,
        place_name: activity.place_name,
        latitude: activity.latitude,
        longitude: activity.longitude,
        is_superlike: activity.is_superlike,
      },
      profile
    );

    return NextResponse.json(mergeMapPlace(pin, activityRowToDetails(activity)));
  } catch (error) {
    console.error("map activity detail request failed", error);
    return NextResponse.json(
      { error: "Empfehlung konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
