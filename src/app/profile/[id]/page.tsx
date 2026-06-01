import PublicProfilePageClient from "@/app/profile/[id]/PublicProfilePageClient";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name")
    .eq("id", id)
    .single();

  if (!profile) {
    return {
      title: "Profil | places4friends",
      description: "Profil auf places4friends ansehen.",
    };
  }

  const name = profile.full_name ?? (profile.username ? `@${profile.username}` : "Freund");
  return {
    title: `${name} | places4friends`,
    description: `Sieh dir die Lieblingsorte und Empfehlungen von ${name} auf der interaktiven Karte an.`,
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { id: friendId } = await params;
  const sParams = await searchParams;

  return (
    <PublicProfilePageClient
      friendId={friendId}
      isInvite={sParams.invite === "true"}
    />
  );
}
