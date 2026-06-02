export function buildActivityCountMap(
  rows: { activity_id: string }[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.activity_id] = (map[row.activity_id] || 0) + 1;
  }
  return map;
}
