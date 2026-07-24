import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {
  buildFriendInviteUrl,
  FRIEND_INVITE_MAX_USES,
  FRIEND_INVITE_VALIDITY_DAYS,
} from "@/lib/friendInvite";
import { getApiUser } from "@/lib/supabase/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function createInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function POST(request: Request) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Einladungslinks sind derzeit nicht verfügbar." },
      { status: 503 }
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + FRIEND_INVITE_VALIDITY_DAYS);

  const token = createInviteToken();

  const { error: insertError } = await supabaseAdmin.from("friend_invite_links").insert({
    creator_id: user.id,
    token,
    max_uses: FRIEND_INVITE_MAX_USES,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    console.error("Error creating friend invite link:", insertError);
    return NextResponse.json(
      { error: "Einladungslink konnte nicht erstellt werden." },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const url = buildFriendInviteUrl(origin, token);

  return NextResponse.json({
    token,
    url,
    expiresAt: expiresAt.toISOString(),
    maxUses: FRIEND_INVITE_MAX_USES,
  });
}
