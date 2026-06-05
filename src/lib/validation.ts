const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: unknown): id is string {
  if (typeof id !== "string") return false;
  return UUID_REGEX.test(id);
}

export function isValidInviteToken(token: unknown): token is string {
  if (typeof token !== "string") return false;
  return /^[a-zA-Z0-9_-]{10,50}$/.test(token);
}
