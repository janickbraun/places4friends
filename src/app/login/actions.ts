"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const { getLoginErrorMessage } = await import("@/lib/authErrors");
    return { error: getLoginErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  revalidatePath("/activities", "page");
  revalidatePath("/profile", "page");
  revalidatePath("/profile/friends", "page");
  revalidatePath("/profile/settings", "page");
  revalidatePath("/create", "page");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const username = formData.get("username") as string;

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || undefined,
        username: username || undefined,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, the session will be null
  if (!data.session) {
    return {
      success:
        "Konto erstellt! Bitte prüfe dein E-Mail-Postfach und bestätige deine Adresse.",
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/activities", "page");
  revalidatePath("/profile", "page");
  revalidatePath("/profile/friends", "page");
  revalidatePath("/profile/settings", "page");
  revalidatePath("/create", "page");
  redirect("/");
}

export async function sendVerificationEmailAction(userEmail?: string, userId?: string) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { error: "Datenbank-Admin-Client konnte nicht initialisiert werden." };
  }

  let emailToUse = userEmail;
  let userIdToUse: string | null = userId || null;
  let fullNameToUse = "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    userIdToUse = user.id;
    emailToUse = user.email || emailToUse;
  }

  if (!emailToUse) {
    return { error: "Keine E-Mail-Adresse angegeben oder Benutzer nicht angemeldet." };
  }

  if (!userIdToUse) {
    // Look up in auth.users by email using admin API
    const { data: listUsers, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError || !listUsers?.users) {
      return { error: "Benutzer konnte nicht gefunden werden." };
    }
    const foundUser = listUsers.users.find(u => u.email?.toLowerCase() === emailToUse?.toLowerCase());
    if (!foundUser) {
      return { error: "Benutzer mit dieser E-Mail existiert nicht." };
    }
    userIdToUse = foundUser.id;
  }

  // Fetch their profile
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("full_name, email_verified")
    .eq("id", userIdToUse)
    .single();

  if (profileError || !profile) {
    return { error: "Profil konnte nicht geladen werden." };
  }

  if (profile.email_verified) {
    return { success: true, message: "E-Mail ist bereits verifiziert." };
  }

  fullNameToUse = profile.full_name || "";

  // Check for recent verification tokens (within last 60 seconds)
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { data: recentTokens, error: recentError } = await adminClient
    .from("email_verifications")
    .select("created_at")
    .eq("user_id", userIdToUse)
    .gt("created_at", oneMinuteAgo);

  if (recentTokens && recentTokens.length > 0) {
    return { error: "Bitte warte eine Minute, bevor du eine neue E-Mail anforderst." };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

  // Delete any old tokens first
  await adminClient
    .from("email_verifications")
    .delete()
    .eq("user_id", userIdToUse);

  // Insert the new token
  const { error: insertError } = await adminClient
    .from("email_verifications")
    .insert({
      user_id: userIdToUse,
      token,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error("Error inserting verification token:", insertError);
    return { error: "Fehler beim Erstellen des Verifizierungscodes." };
  }

  // Send the email
  try {
    await sendVerificationEmail(emailToUse, token, fullNameToUse);
    return { success: true, message: "Bestätigungs-E-Mail wurde gesendet." };
  } catch (emailError: any) {
    console.error("Failed to send verification email:", emailError);
    return { error: emailError.message || "Fehler beim Senden der Bestätigungs-E-Mail." };
  }
}

