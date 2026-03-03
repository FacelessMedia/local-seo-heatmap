import { NextRequest } from "next/server";
import { Scan, ScanResult } from "@/lib/types";
import { generateGrid } from "@/lib/grid";
import { scanAllPointsBulk } from "@/lib/dataforseo";

// Bulk scan API — sends ALL grid points in a SINGLE DataForSEO API call.
// Returns streaming SSE for real-time progress + auto-saves log.

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    keyword,
    gridSize: rawGridSize,
    gridSpacing: rawGridSpacing,
    businessName,
    placeId,
    latitude,
    longitude,
  } = body;

  if (!keyword || !businessName || latitude === undefined || longitude === undefined) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: keyword, businessName, latitude, longitude" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const gridSize = rawGridSize || 7;
  const gridSpacing = rawGridSpacing || 1609;
  const scanId = crypto.randomUUID();

  const gridPoints = generateGrid({
    centerLat: latitude,
    centerLng: longitude,
    gridSize,
    spacingMeters: gridSpacing,
  });

  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send("log", { message: `Starting scan: "${keyword}" for ${businessName}` });
        send("log", { message: `Grid: ${gridSize}×${gridSize} (${gridPoints.length} points), spacing: ${gridSpacing}m` });

        let scanResults: ScanResult[];
        let rawLog = "";

        if (!login || !password) {
          send("log", { message: "⚠️ No DataForSEO credentials — running in DEMO mode" });

          scanResults = gridPoints.map((point) => {
            const distFromCenter = Math.sqrt(
              Math.pow(point.row - Math.floor(gridSize / 2), 2) +
              Math.pow(point.col - Math.floor(gridSize / 2), 2)
            );
            const baseRank = Math.max(1, Math.round(distFromCenter * 1.5 + Math.random() * 3));
            const rank = baseRank <= 20 ? baseRank : null;
            return {
              id: crypto.randomUUID(), scanId,
              gridRow: point.row, gridCol: point.col,
              latitude: point.lat, longitude: point.lng, rank,
              topResults: [
                { place_id: placeId || "demo_1", title: businessName, rank: rank || 21, category: "Business" },
                { place_id: "comp_1", title: "Competitor A", rank: 2, category: "Business" },
                { place_id: "comp_2", title: "Competitor B", rank: 3, category: "Business" },
              ],
            };
          });
          rawLog = "Demo mode — no DataForSEO credentials configured";
          send("log", { message: `Demo complete: ${scanResults.length} points` });
        } else {
          // BULK SCAN — all points in ONE API call (~3-5 seconds)
          send("log", { message: `DataForSEO credentials ✓ — sending all ${gridPoints.length} points in single bulk request...` });
          send("progress", { completed: 0, total: gridPoints.length, found: 0, errors: 0 });

          const bulkResult = await scanAllPointsBulk(
            { login, password },
            keyword,
            gridPoints,
            placeId,
            businessName
          );

          rawLog = bulkResult.rawLog;

          const found = bulkResult.results.filter(r => r.rank !== null).length;
          const errors = bulkResult.results.filter(r => r.error).length;
          send("progress", { completed: gridPoints.length, total: gridPoints.length, found, errors });
          send("log", { message: `API returned: ${found} ranked, ${errors} errors, ${gridPoints.length - found - errors} not found` });

          scanResults = bulkResult.results.map((gr) => ({
            id: crypto.randomUUID(),
            scanId,
            gridRow: gr.point.row,
            gridCol: gr.point.col,
            latitude: gr.point.lat,
            longitude: gr.point.lng,
            rank: gr.rank,
            topResults: gr.topResults.map((tr, idx) => ({
              place_id: tr.place_id || "",
              title: tr.title || "",
              rank: idx + 1,
              rating: tr.rating?.value,
              reviews: tr.rating?.votes_count,
              address: tr.address,
              category: tr.category,
            })),
          }));
        }

        // Calculate stats
        const ranked = scanResults.filter((r) => r.rank !== null);
        const avgRank = ranked.length > 0
          ? Math.round((ranked.reduce((a, r) => a + (r.rank || 0), 0) / ranked.length) * 10) / 10
          : null;

        const scan: Scan = {
          id: scanId, keywordId: "", projectId: "", keyword,
          status: "completed", gridSize, gridSpacing,
          averageRank: avgRank, totalPoints: gridPoints.length,
          pointsRanked: ranked.length,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        send("complete", { scan, results: scanResults, rawLog });
        send("log", { message: `✅ Done! Average rank: ${avgRank ?? "N/A"}, ${ranked.length}/${gridPoints.length} points ranked` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        send("error", { message: msg });
        send("log", { message: `❌ Fatal error: ${msg}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
