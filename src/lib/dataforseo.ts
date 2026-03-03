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

function parseTaskItems(task: Record<string, unknown>): MapSearchResult[] {
  const result = (task.result as Record<string, unknown>[])?.[0];
  const items = (result?.items as Record<string, unknown>[]) || [];

  return items
    .filter((item) => item.type === "maps_search")
    .map((item) => ({
      place_id: item.place_id as string,
      title: item.title as string,
      rank_group: item.rank_group as number,
      rank_absolute: item.rank_absolute as number,
      domain: (item.domain as string) || "",
      url: (item.url as string) || "",
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

  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

// Send ALL grid points in a SINGLE API call (DataForSEO supports up to 100 tasks per POST).
// This takes ~3-5 seconds instead of 49 separate calls that take 2+ minutes.
export async function scanAllPointsBulk(
  config: DataForSEOConfig,
  keyword: string,
  gridPoints: GridPoint[],
  targetPlaceId?: string,
  targetName?: string,
  languageCode: string = "en",
  depth: number = 20
): Promise<{ results: GridScanResult[]; rawLog: string }> {
  const logLines: string[] = [];
  const log = (msg: string) => {
    logLines.push(`[${new Date().toISOString()}] ${msg}`);
  };

  log(`Bulk scan: ${gridPoints.length} points, keyword="${keyword}", target="${targetName}", placeId="${targetPlaceId}"`);

  // Build all tasks in one array (DataForSEO accepts up to 100 per POST)
  const tasks = gridPoints.map((point, i) => ({
    language_code: languageCode,
    location_coordinate: `${point.lat.toFixed(7)},${point.lng.toFixed(7)},15z`,
    keyword: keyword,
    depth: depth,
    tag: `${point.row}-${point.col}`, // Tag to match results back to grid points
  }));

  log(`Sending ${tasks.length} tasks in single POST to DataForSEO...`);

  const response = await fetch(
    "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(config),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tasks),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    log(`API HTTP error: ${response.status} ${response.statusText} — ${text}`);
    throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  log(`API response: status_code=${data.status_code}, tasks_count=${data.tasks_count}, tasks_error=${data.tasks_error}`);

  if (data.status_code !== 20000) {
    log(`API-level error: ${data.status_message}`);
    throw new Error(`DataForSEO error: ${data.status_message}`);
  }

  const taskResults = data.tasks || [];
  log(`Received ${taskResults.length} task results`);

  const results: GridScanResult[] = [];

  for (let i = 0; i < gridPoints.length; i++) {
    const point = gridPoints[i];
    const task = taskResults[i];

    if (!task) {
      log(`Point ${i} (${point.row},${point.col}): No task result returned`);
      results.push({ point, rank: null, topResults: [], error: "No result" });
      continue;
    }

    if (task.status_code !== 20000) {
      log(`Point ${i} (${point.row},${point.col}): Task error ${task.status_code} — ${task.status_message}`);
      results.push({ point, rank: null, topResults: [], error: task.status_message });
      continue;
    }

    const searchResults = parseTaskItems(task);
    const rank = findBusinessRank(searchResults, targetPlaceId, targetName);

    if (rank) {
      log(`Point ${i} (${point.row},${point.col}): RANK #${rank} — top result: "${searchResults[0]?.title}"`);
    } else {
      log(`Point ${i} (${point.row},${point.col}): NOT FOUND — top 3: ${searchResults.slice(0, 3).map(r => `"${r.title}"`).join(", ")}`);
    }

    results.push({
      point,
      rank,
      topResults: searchResults.slice(0, 5),
    });
  }

  const found = results.filter((r) => r.rank !== null).length;
  const errors = results.filter((r) => r.error).length;
  log(`Scan complete: ${found} found, ${errors} errors, ${results.length - found - errors} not ranked`);

  return { results, rawLog: logLines.join("\n") };
}

// Keep single-point scan for backward compatibility
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

  return parseTaskItems(task);
}
