import { GridPoint } from "./grid";

export interface DataForSEOConfig {
  login: string;
  password: string;
}

export interface MapSearchResult {
  place_id: string;
  title: string;
  rank_group: number;
  rank_absolute: number;
  domain: string;
  url: string;
  rating?: {
    value: number;
    votes_count: number;
  };
  address?: string;
  phone?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}

export interface GridScanResult {
  point: GridPoint;
  rank: number | null;
  topResults: MapSearchResult[];
  error?: string;
}

function getAuthHeader(config: DataForSEOConfig): string {
  return "Basic " + Buffer.from(`${config.login}:${config.password}`).toString("base64");
}

export async function scanGridPoint(
  config: DataForSEOConfig,
  keyword: string,
  point: GridPoint,
  languageCode: string = "en",
  depth: number = 20
): Promise<MapSearchResult[]> {
  const response = await fetch(
    "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(config),
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          language_code: languageCode,
          location_coordinate: `${point.lat.toFixed(7)},${point.lng.toFixed(7)},15z`,
          keyword: keyword,
          depth: depth,
        },
      ]),
    }
  );

  if (!response.ok) {
    throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO error: ${data.status_message}`);
  }

  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(`DataForSEO task error: ${task?.status_message || "Unknown error"}`);
  }

  const items = task.result?.[0]?.items || [];

  return items
    .filter((item: Record<string, unknown>) => item.type === "maps_search")
    .map((item: Record<string, unknown>, index: number) => ({
      place_id: item.place_id as string,
      title: item.title as string,
      rank_group: item.rank_group as number,
      rank_absolute: item.rank_absolute as number,
      domain: item.domain as string || "",
      url: item.url as string || "",
      rating: item.rating as MapSearchResult["rating"],
      address: item.address as string,
      phone: item.phone as string,
      category: item.category as string,
      latitude: (item.gps_coordinates as Record<string, number>)?.latitude,
      longitude: (item.gps_coordinates as Record<string, number>)?.longitude,
    }));
}

export function findBusinessRank(
  results: MapSearchResult[],
  targetPlaceId?: string,
  targetName?: string
): number | null {
  for (let i = 0; i < results.length; i++) {
    if (targetPlaceId && results[i].place_id === targetPlaceId) {
      return i + 1;
    }
    if (targetName && fuzzyMatch(results[i].title, targetName) > 0.8) {
      return i + 1;
    }
  }
  return null;
}

function fuzzyMatch(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // Simple Jaccard similarity on words
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

export async function runFullGridScan(
  config: DataForSEOConfig,
  keyword: string,
  gridPoints: GridPoint[],
  targetPlaceId?: string,
  targetName?: string,
  onProgress?: (completed: number, total: number) => void
): Promise<GridScanResult[]> {
  const results: GridScanResult[] = [];
  const batchSize = 10; // Process 10 concurrent requests

  for (let i = 0; i < gridPoints.length; i += batchSize) {
    const batch = gridPoints.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async (point) => {
        try {
          const searchResults = await scanGridPoint(config, keyword, point);
          const rank = findBusinessRank(searchResults, targetPlaceId, targetName);
          return {
            point,
            rank,
            topResults: searchResults.slice(0, 5),
          } as GridScanResult;
        } catch (error) {
          return {
            point,
            rank: null,
            topResults: [],
            error: error instanceof Error ? error.message : "Unknown error",
          } as GridScanResult;
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          point: batch[batchResults.indexOf(result)],
          rank: null,
          topResults: [],
          error: result.reason?.message || "Failed",
        });
      }
    }

    onProgress?.(Math.min(i + batchSize, gridPoints.length), gridPoints.length);

    // Small delay between batches to respect rate limits
    if (i + batchSize < gridPoints.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
