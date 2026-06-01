import { NextResponse } from "next/server";
import { createApiClient, getApiUser } from "@/lib/supabase/apiAuth";

export async function DELETE(request: Request) {
  const user = await getApiUser(request);
  const supabase = await createApiClient(request);

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
