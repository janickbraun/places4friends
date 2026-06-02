import { authenticatedFetch } from "@/lib/auth/authenticatedFetch";

export const FRIEND_INVITE_MAX_USES = 10;
export const FRIEND_INVITE_VALIDITY_DAYS = 30;

export type FriendInviteValidationError = "not_found" | "expired" | "max_uses";

export function buildFriendInviteUrl(
  origin: string,
  creatorId: string,
  token: string
): string {
  const params = new URLSearchParams({ invite: token });
  return `${origin}/profile/${creatorId}?${params.toString()}`;
}

export async function createFriendInviteLink(): Promise<{
  token: string;
  url: string;
  expiresAt: string;
}> {
  const response = await authenticatedFetch("/api/friendships/invite-link", {
    method: "POST",
  });

  const payload = (await response.json()) as {
    error?: string;
    token?: string;
    url?: string;
    expiresAt?: string;
  };

  if (!response.ok || !payload.token || !payload.url || !payload.expiresAt) {
    throw new Error(payload.error ?? "Einladungslink konnte nicht erstellt werden.");
  }

  return {
    token: payload.token,
    url: payload.url,
    expiresAt: payload.expiresAt,
  };
}

export async function shareFriendInviteLink(): Promise<"shared" | "copied"> {
  const { url } = await createFriendInviteLink();
  const shareData = {
    title: "places4friends",
    text: "Lass uns auf places4friends befreundet sein, um unsere Lieblingsorte auf einer gemeinsamen Karte zu sehen!",
    url,
  };

  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return "shared";
  }

  await navigator.clipboard.writeText(url);
  return "copied";
}
