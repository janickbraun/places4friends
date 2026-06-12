import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: "E-Mail und Benutzer-ID sind erforderlich." },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin-Client konnte nicht initialisiert werden." },
        { status: 500 }
      );
    }

    // Fetch their profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email_verified")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil nicht gefunden." },
        { status: 404 }
      );
    }

    if (profile.email_verified) {
      return NextResponse.json({ success: true, message: "Bereits verifiziert." });
    }

    // Check for recent tokens (throttle: 1 per minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentTokens } = await adminClient
      .from("email_verifications")
      .select("created_at")
      .eq("user_id", userId)
      .gt("created_at", oneMinuteAgo);

    if (recentTokens && recentTokens.length > 0) {
      return NextResponse.json({ success: true, message: "Bereits gesendet." });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Delete old tokens
    await adminClient
      .from("email_verifications")
      .delete()
      .eq("user_id", userId);

    // Insert new token
    const { error: insertError } = await adminClient
      .from("email_verifications")
      .insert({ user_id: userId, token, expires_at: expiresAt });

    if (insertError) {
      console.error("Error inserting verification token:", insertError);
      return NextResponse.json(
        { error: "Token konnte nicht erstellt werden." },
        { status: 500 }
      );
    }

    // Send email
    await sendVerificationEmail(email, token, profile.full_name || "");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Verification email route error:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler." },
      { status: 500 }
    );
  }
}
