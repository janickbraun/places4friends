import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/supabase/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let payload: { inviteeId?: string; inviteToken?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { inviteeId, inviteToken } = payload;
  if (!inviteeId || !inviteToken) {
    return NextResponse.json(
      { error: "Einladungstoken oder Einladungs-ID fehlt." },
      { status: 400 }
    );
  }

  if (inviteeId === user.id) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst einladen." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Einladung konnte nicht verarbeitet werden." },
      { status: 503 }
    );
  }

  const { data: validationResult, error: validationError } = await supabaseAdmin.rpc(
    "validate_friend_invite_link",
    { p_token: inviteToken }
  );

  if (validationError) {
    console.error("Error validating friend invite link:", validationError);
    return NextResponse.json(
      { error: "Einladung konnte nicht verarbeitet werden." },
      { status: 500 }
    );
  }

  const validated = validationResult as {
    valid?: boolean;
    error?: string;
    creator_id?: string;
  };

  if (!validated?.valid) {
    const inviteError = validated?.error ?? "not_found";
    const messages: Record<string, string> = {
      not_found: "Dieser Einladungslink ist ungültig.",
      expired: "Dieser Einladungslink ist abgelaufen.",
      max_uses: "Dieser Einladungslink wurde bereits zu oft verwendet.",
    };

    return NextResponse.json(
      { error: messages[inviteError] ?? messages.not_found, inviteError },
      { status: 410 }
    );
  }

  if (validated.creator_id !== inviteeId) {
    return NextResponse.json(
      { error: "Dieser Einladungslink passt nicht zu diesem Profil.", inviteError: "not_found" },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("friendships")
    .select("*")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${inviteeId}),and(sender_id.eq.${inviteeId},receiver_id.eq.${user.id})`
    );

  if (fetchError) {
    console.error("Error checking existing friendship:", fetchError);
    return NextResponse.json(
      { error: "Datenbankfehler beim Überprüfen der Verbindung." },
      { status: 500 }
    );
  }

  let friendshipResult;

  if (existing && existing.length > 0) {
    const relation = existing[0];
    if (relation.status === "accepted") {
      return NextResponse.json({ success: true, friendship: relation });
    }

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
    friendshipResult = updated;
  } else {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("friendships")
      .insert({
        sender_id: inviteeId,
        receiver_id: user.id,
        status: "accepted",
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
    friendshipResult = inserted;
  }

  const { data: redeemResult, error: redeemError } = await supabaseAdmin.rpc(
    "redeem_friend_invite_link",
    { p_token: inviteToken }
  );

  if (redeemError || !(redeemResult as { ok?: boolean })?.ok) {
    console.error("Error redeeming friend invite link after friendship:", redeemError, redeemResult);
    return NextResponse.json(
      { error: "Einladung konnte nicht vollständig verarbeitet werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, friendship: friendshipResult });
}
