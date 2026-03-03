import { NextRequest, NextResponse } from "next/server";
import { Scan, ScanResult } from "@/lib/types";
import { generateGrid } from "@/lib/grid";
import { runFullGridScan } from "@/lib/dataforseo";

// Self-contained scan API — no in-memory store needed.
// All project data is passed in the request body and all results are returned directly.

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
    return NextResponse.json(
      { error: "Missing required fields: keyword, businessName, latitude, longitude" },
      { status: 400 }
    );
  }

  const gridSize = rawGridSize || 7;
  const gridSpacing = rawGridSpacing || 1609;

  const scan: Scan = {
    id: crypto.randomUUID(),
    keywordId: "",
    projectId: "",
    keyword,
    status: "running",
    gridSize,
    gridSpacing,
    averageRank: null,
    totalPoints: gridSize * gridSize,
    pointsRanked: 0,
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const gridPoints = generateGrid({
    centerLat: latitude,
    centerLng: longitude,
    gridSize,
    spacingMeters: gridSpacing,
  });

  // Check if DataForSEO credentials are configured
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();

  let results: ScanResult[];

  if (!login || !password) {
    // Demo mode: generate mock results
    console.log(`[Scan] Demo mode (no DataForSEO creds): keyword="${keyword}", business="${businessName}"`);

    results = gridPoints.map((point) => {
      const distFromCenter = Math.sqrt(
        Math.pow(point.row - Math.floor(gridSize / 2), 2) +
        Math.pow(point.col - Math.floor(gridSize / 2), 2)
      );
      const baseRank = Math.max(1, Math.round(distFromCenter * 1.5 + Math.random() * 3));
      const rank = baseRank <= 20 ? baseRank : null;

      return {
        id: crypto.randomUUID(),
        scanId: scan.id,
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
  } else {
    // Real mode with DataForSEO
    console.log(`[Scan] Real scan: keyword="${keyword}", business="${businessName}", placeId="${placeId}", grid=${gridSize}x${gridSize}, points=${gridPoints.length}`);

    try {
      const gridResults = await runFullGridScan(
        { login, password },
        keyword,
        gridPoints,
        placeId,
        businessName
      );

      const errorCount = gridResults.filter((r) => r.error).length;
      const foundCount = gridResults.filter((r) => r.rank !== null).length;
      console.log(`[Scan] Results: ${foundCount} found, ${errorCount} errors, ${gridResults.length - foundCount - errorCount} not ranked`);
      if (errorCount > 0) {
        console.error(`[Scan] Sample error:`, gridResults.find((r) => r.error)?.error);
      }

      results = gridResults.map((gr) => ({
        id: crypto.randomUUID(),
        scanId: scan.id,
        gridRow: gr.point.row,
        gridCol: gr.point.col,
        latitude: gr.point.lat,
        longitude: gr.point.lng,
        rank: gr.rank,
        topResults: gr.topResults.map((tr, i) => ({
          place_id: tr.place_id,
          title: tr.title,
          rank: i + 1,
          rating: tr.rating?.value,
          reviews: tr.rating?.votes_count,
          address: tr.address,
          category: tr.category,
        })),
      }));
    } catch (error) {
      console.error("[Scan] Failed:", error instanceof Error ? error.message : error);
      return NextResponse.json(
        { error: `Scan failed: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 500 }
      );
    }
  }

  // Calculate stats
  const ranked = results.filter((r) => r.rank !== null);
  const avgRank =
    ranked.length > 0
      ? Math.round((ranked.reduce((a, r) => a + (r.rank || 0), 0) / ranked.length) * 10) / 10
      : null;

  scan.status = "completed";
  scan.averageRank = avgRank;
  scan.pointsRanked = ranked.length;
  scan.completedAt = new Date().toISOString();

  // Return scan + results together in one response
  return NextResponse.json({ scan, results }, { status: 201 });
}
