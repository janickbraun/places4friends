import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const inviterId = searchParams.get("inviterId");

  if (!token || !inviterId) {
    return NextResponse.json({ valid: false, error: "not_found" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { valid: false, error: "not_found" },
      { status: 503 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc("validate_friend_invite_link", {
    p_token: token,
  });

  if (error) {
    console.error("Error validating friend invite link:", error);
    return NextResponse.json({ valid: false, error: "not_found" }, { status: 500 });
  }

  const result = data as {
    valid?: boolean;
    error?: string;
    creator_id?: string;
    remaining_uses?: number;
    expires_at?: string;
  };

  if (!result?.valid || result.creator_id !== inviterId) {
    return NextResponse.json({
      valid: false,
      error: result?.creator_id !== inviterId ? "not_found" : (result.error ?? "not_found"),
    });
  }

  return NextResponse.json({
    valid: true,
    remainingUses: result.remaining_uses,
    expiresAt: result.expires_at,
  });
}
