import { NextRequest } from "next/server";
import { Scan, ScanResult } from "@/lib/types";
import { generateGrid, GridPoint } from "@/lib/grid";
import { scanGridPoint, findBusinessRank, DataForSEOConfig } from "@/lib/dataforseo";

// Streaming scan API — sends progress updates as Server-Sent Events.
// This avoids Vercel's 10s function timeout by keeping the stream alive.

export const maxDuration = 60; // Allow up to 60s on Vercel Pro, 25s on hobby with streaming

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

  // Use streaming response to avoid timeout
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send("log", { message: `Starting scan: "${keyword}" for ${businessName}` });
        send("log", { message: `Grid: ${gridSize}×${gridSize} (${gridPoints.length} points), spacing: ${gridSpacing}m` });

        let results: ScanResult[];

        if (!login || !password) {
          // Demo mode
          send("log", { message: "⚠️ No DataForSEO credentials — running in DEMO mode with simulated data" });

          results = gridPoints.map((point) => {
            const distFromCenter = Math.sqrt(
              Math.pow(point.row - Math.floor(gridSize / 2), 2) +
              Math.pow(point.col - Math.floor(gridSize / 2), 2)
            );
            const baseRank = Math.max(1, Math.round(distFromCenter * 1.5 + Math.random() * 3));
            const rank = baseRank <= 20 ? baseRank : null;
            return {
              id: crypto.randomUUID(),
              scanId,
              gridRow: point.row,
              gridCol: point.col,
              latitude: point.lat,
              longitude: point.lng,
              rank,
              topResults: [
                { place_id: placeId || "demo_1", title: businessName, rank: rank || 21, category: "Business" },
                { place_id: "comp_1", title: "Competitor A", rank: 2, category: "Business" },
                { place_id: "comp_2", title: "Competitor B", rank: 3, category: "Business" },
              ],
            };
          });
          send("log", { message: `Demo scan complete: ${results.length} points generated` });
        } else {
          // Real mode — scan in small batches, streaming progress
          send("log", { message: `DataForSEO credentials found ✓ — starting real scan` });
          const config: DataForSEOConfig = { login, password };
          results = [];
          const batchSize = 5;
          let completed = 0;
          let errors = 0;
          let found = 0;

          for (let i = 0; i < gridPoints.length; i += batchSize) {
            const batch = gridPoints.slice(i, i + batchSize);

            const batchResults = await Promise.allSettled(
              batch.map(async (point) => {
                try {
                  const searchResults = await scanGridPoint(config, keyword, point);
                  const rank = findBusinessRank(searchResults, placeId, businessName);
                  return {
                    point,
                    rank,
                    topResults: searchResults.slice(0, 5),
                    error: undefined as string | undefined,
                  };
                } catch (err) {
                  return {
                    point,
                    rank: null as number | null,
                    topResults: [] as { place_id: string; title: string; rating?: { value?: number; votes_count?: number }; address?: string; category?: string }[],
                    error: err instanceof Error ? err.message : "Unknown error",
                  };
                }
              })
            );

            for (const result of batchResults) {
              const gr = result.status === "fulfilled"
                ? result.value
                : { point: batch[0], rank: null, topResults: [], error: "Promise rejected" };

              completed++;
              if (gr.error) errors++;
              if (gr.rank !== null) found++;

              results.push({
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
              });
            }

            send("progress", { completed, total: gridPoints.length, found, errors });
            send("log", { message: `Batch ${Math.floor(i / batchSize) + 1}: ${completed}/${gridPoints.length} done (${found} found, ${errors} errors)` });

            // Small delay between batches
            if (i + batchSize < gridPoints.length) {
              await new Promise((r) => setTimeout(r, 150));
            }
          }

          send("log", { message: `Scan complete: ${found} ranked, ${errors} errors, ${completed - found - errors} not found` });
        }

        // Calculate final stats
        const ranked = results.filter((r) => r.rank !== null);
        const avgRank = ranked.length > 0
          ? Math.round((ranked.reduce((a, r) => a + (r.rank || 0), 0) / ranked.length) * 10) / 10
          : null;

        const scan: Scan = {
          id: scanId,
          keywordId: "",
          projectId: "",
          keyword,
          status: "completed",
          gridSize,
          gridSpacing,
          averageRank: avgRank,
          totalPoints: gridPoints.length,
          pointsRanked: ranked.length,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        send("complete", { scan, results });
        send("log", { message: `✅ Done! Average rank: ${avgRank ?? "N/A"}` });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
        send("log", { message: `❌ Fatal error: ${err instanceof Error ? err.message : "Unknown"}` });
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
