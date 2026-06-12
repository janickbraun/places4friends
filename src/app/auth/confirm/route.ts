import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Create a clean URL object targeting the 'next' destination
  const redirectTo = new URL(next, request.url);

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(redirectTo.toString());
    } else {
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("error", "access_denied");
      redirectTo.searchParams.set("error_code", error.code || "auth_error");
      redirectTo.searchParams.set("error_description", error.message);
      return NextResponse.redirect(redirectTo.toString());
    }
  } else if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo.toString());
    } else {
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("error", "access_denied");
      redirectTo.searchParams.set("error_code", error.code || "auth_error");
      redirectTo.searchParams.set("error_description", error.message);
      return NextResponse.redirect(redirectTo.toString());
    }
  } else {
    // If no verification params are present, it's an invalid request
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "invalid_request");
    redirectTo.searchParams.set("error_description", "Ungültige Verifizierungsanfrage.");
    return NextResponse.redirect(redirectTo.toString());
  }
}
