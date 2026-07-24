import { authenticatedFetch } from "@/lib/auth/authenticatedFetch";

export const FRIEND_INVITE_MAX_USES = 10;
export const FRIEND_INVITE_VALIDITY_DAYS = 30;

export type FriendInviteValidationError = "not_found" | "expired" | "max_uses";

/**
 * Invite links point at `/invite/<token>`, the one path claimed as an iOS
 * universal link / Android app link, so opening one on a phone with the app
 * installed goes straight into the app. `/invite` resolves the token to the
 * creator's profile. Links previously issued in the `/profile/<id>?invite=`
 * shape still work — that page keeps handling the query param.
 */
export function buildFriendInviteUrl(origin: string, token: string): string {
  return `${origin}/invite/${encodeURIComponent(token)}`;
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
