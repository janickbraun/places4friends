import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  // Call the database function to delete the user account from auth.users (cascades to all user data)
  const { error } = await supabase.rpc("delete_own_user");

  if (error) {
    console.error("Error calling delete_own_user RPC:", error);
    return NextResponse.json(
      { error: "Konto konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
