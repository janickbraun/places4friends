"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
