/**
 * Sanitize a `?next=` destination before navigating to it after login or
 * registration. Only same-origin absolute paths are allowed, so a crafted link
 * can't bounce a freshly authenticated user off to another site.
 *
 * Used by the friend-invite flow: opening `/invite/<token>` while signed out
 * sends the user to `/login?next=/profile/<id>?invite=<token>` so the invite
 * survives signing in.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  // Must be a root-relative path; `//host` and `/\host` are protocol-relative.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}
