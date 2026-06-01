import ActivityDetailPageClient from "@/app/activities/[id]/ActivityDetailPageClient";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: act } = await supabase
    .from("activities")
    .select("place_name, description")
    .eq("id", id)
    .single();

  if (!act) {
    return {
      title: "Ort Details | places4friends",
      description: "Empfehlung von deinen Freunden ansehen.",
    };
  }

  return {
    title: `${act.place_name} | places4friends`,
    description:
      act.description ||
      `Details und Highlights für ${act.place_name} auf der interaktiven Karte ansehen.`,
  };
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ActivityDetailPageClient activityId={id} />;
}
