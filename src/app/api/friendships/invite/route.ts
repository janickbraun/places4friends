import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let payload: { inviteeId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { inviteeId } = payload;
  if (!inviteeId) {
    return NextResponse.json({ error: "Einladungs-ID fehlt." }, { status: 400 });
  }

  if (inviteeId === user.id) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst einladen." },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Fallback indicator so client can run client-side RLS insert (pending request)
    console.warn("SUPABASE_SERVICE_ROLE_KEY missing, using client fallback");
    return NextResponse.json({ fallback: true });
  }

  // Create admin client to bypass RLS for auto-approval
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // Check if a relationship already exists between the two users
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("friendships")
    .select("*")
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${inviteeId}),and(sender_id.eq.${inviteeId},receiver_id.eq.${user.id})`);

  if (fetchError) {
    console.error("Error checking existing friendship:", fetchError);
    return NextResponse.json(
      { error: "Datenbankfehler beim Überprüfen der Verbindung." },
      { status: 500 }
    );
  }

  if (existing && existing.length > 0) {
    const relation = existing[0];
    if (relation.status === "accepted") {
      return NextResponse.json({ success: true, friendship: relation });
    }

    // If there is an incoming request from the inviter, accept it automatically
    if (relation.status === "pending" && relation.receiver_id === user.id) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", relation.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating friendship status:", updateError);
        return NextResponse.json(
          { error: "Einladung konnte nicht angenommen werden." },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, friendship: updated });
    }

    // If there is an outgoing request from the current user, keep it as is
    return NextResponse.json({ success: true, friendship: relation });
  }

  // If no relationship exists, auto-establish an accepted friendship
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("friendships")
    .insert({
      sender_id: inviteeId, // The person who shared the link
      receiver_id: user.id, // The current user accepting the link
      status: "accepted",   // Instantly accepted!
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting friendship:", insertError);
    return NextResponse.json(
      { error: "Verbindung konnte nicht hergestellt werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, friendship: inserted });
}
