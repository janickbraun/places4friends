const COLORS = [
  "bg-emerald-600",
  "bg-rose-500",
  "bg-amber-600",
  "bg-blue-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-fuchsia-600",
  "bg-cyan-600",
];

export function getUserColorClass(userId: string): string {
  let sum = 0;
  for (let i = 0; i < userId.length; i++) {
    sum += userId.charCodeAt(i);
  }
  return COLORS[sum % COLORS.length];
}

export function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `vor ${Math.max(1, diffMins)} Min.`;
  }
  if (diffHours < 24) {
    return `vor ${diffHours} Std.`;
  }
  if (diffDays === 1) {
    return "gestern";
  }
  if (diffDays < 7) {
    return `vor ${diffDays} Tagen`;
  }
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
