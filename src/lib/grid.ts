export interface GridPoint {
  row: number;
  col: number;
  lat: number;
  lng: number;
}

export interface GridConfig {
  centerLat: number;
  centerLng: number;
  gridSize: number; // 5, 7, 9, 13
  spacingMeters: number; // e.g., 1000
}

export function generateGrid(config: GridConfig): GridPoint[] {
  const { centerLat, centerLng, gridSize, spacingMeters } = config;
  const points: GridPoint[] = [];
  const half = Math.floor(gridSize / 2);

  const latDegPerMeter = 1 / 111320;
  const lngDegPerMeter =
    1 / (111320 * Math.cos((centerLat * Math.PI) / 180));

  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      points.push({
        row: row + half,
        col: col + half,
        lat: centerLat + row * spacingMeters * latDegPerMeter,
        lng: centerLng + col * spacingMeters * lngDegPerMeter,
      });
    }
  }

  return points;
}

export function getRankColor(rank: number | null): string {
  if (rank === null) return "#6b7280"; // gray - not found
  if (rank <= 3) return "#22c55e"; // green - top 3
  if (rank <= 10) return "#eab308"; // yellow - page 1
  if (rank <= 20) return "#ef4444"; // red - page 2
  return "#6b7280"; // gray - 21+
}

export function getRankBgClass(rank: number | null): string {
  if (rank === null) return "bg-gray-500";
  if (rank <= 3) return "bg-green-500";
  if (rank <= 10) return "bg-yellow-500";
  if (rank <= 20) return "bg-red-500";
  return "bg-gray-500";
}

export function getRankLabel(rank: number | null): string {
  if (rank === null) return "N/F";
  return rank.toString();
}

export function calculateAverageRank(
  results: { rank: number | null }[]
): number | null {
  const ranked = results.filter((r) => r.rank !== null);
  if (ranked.length === 0) return null;
  const sum = ranked.reduce((acc, r) => acc + (r.rank ?? 0), 0);
  return Math.round((sum / ranked.length) * 10) / 10;
}
