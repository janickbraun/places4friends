import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
    : "http://localhost:3000";

  const redirectTo = new URL("/", baseUrl);

  if (!token) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "verification_missing");
    redirectTo.searchParams.set("error_description", "Verifizierungstoken fehlt.");
    return NextResponse.redirect(redirectTo.toString());
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "admin_client_error");
    redirectTo.searchParams.set("error_description", "Datenbank-Admin-Client konnte nicht geladen werden.");
    return NextResponse.redirect(redirectTo.toString());
  }

  // Look up token
  const { data: verification, error: lookupError } = await adminClient
    .from("email_verifications")
    .select("user_id, expires_at")
    .eq("token", token)
    .single();

  if (lookupError || !verification) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "verification_invalid");
    redirectTo.searchParams.set("error_description", "Ungültiger oder abgelaufener Verifizierungslink.");
    return NextResponse.redirect(redirectTo.toString());
  }

  // Check expiration
  const isExpired = new Date(verification.expires_at) < new Date();
  if (isExpired) {
    // Clean up expired token
    await adminClient
      .from("email_verifications")
      .delete()
      .eq("token", token);

    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "verification_expired");
    redirectTo.searchParams.set("error_description", "Dieser Verifizierungslink ist abgelaufen. Bitte fordere einen neuen an.");
    return NextResponse.redirect(redirectTo.toString());
  }

  // Update profile email_verified to true
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ email_verified: true })
    .eq("id", verification.user_id);

  if (updateError) {
    console.error("Error updating profile verification status:", updateError);
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "update_failed");
    redirectTo.searchParams.set("error_description", "Fehler beim Aktualisieren des Verifizierungsstatus.");
    return NextResponse.redirect(redirectTo.toString());
  }

  // Delete used token
  await adminClient
    .from("email_verifications")
    .delete()
    .eq("token", token);

  // Successfully verified! Redirect to profile with a success indicator
  redirectTo.pathname = "/profile";
  redirectTo.searchParams.set("verified", "true");
  return NextResponse.redirect(redirectTo.toString());
}
