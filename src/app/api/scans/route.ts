import { NextRequest, NextResponse } from "next/server";
import { getScans, addScan, updateScan, getScan, setScanResults, getProject } from "@/lib/store";
import { Scan, ScanResult } from "@/lib/types";
import { generateGrid } from "@/lib/grid";
import { runFullGridScan } from "@/lib/dataforseo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || undefined;
  const scans = getScans(projectId);
  return NextResponse.json(scans);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, keyword, gridSize, gridSpacing } = body;

  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const scan: Scan = {
    id: crypto.randomUUID(),
    keywordId: "",
    projectId,
    keyword,
    status: "pending",
    gridSize: gridSize || 7,
    gridSpacing: gridSpacing || 1000,
    averageRank: null,
    totalPoints: (gridSize || 7) * (gridSize || 7),
    pointsRanked: 0,
    createdAt: new Date().toISOString(),
  };

  addScan(scan);

  // Check if DataForSEO credentials are configured
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    // Demo mode: generate mock results
    const gridPoints = generateGrid({
      centerLat: project.latitude,
      centerLng: project.longitude,
      gridSize: scan.gridSize,
      spacingMeters: scan.gridSpacing,
    });

    updateScan(scan.id, { status: "running", startedAt: new Date().toISOString() });

    const mockResults: ScanResult[] = gridPoints.map((point) => {
      const distFromCenter = Math.sqrt(
        Math.pow(point.row - Math.floor(scan.gridSize / 2), 2) +
        Math.pow(point.col - Math.floor(scan.gridSize / 2), 2)
      );
      // Simulate: closer to center = better rank, with some randomness
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
          { place_id: project.placeId || "demo_place_1", title: project.businessName, rank: rank || 21, category: "Business" },
          { place_id: "comp_1", title: "Competitor A", rank: 2, category: "Business" },
          { place_id: "comp_2", title: "Competitor B", rank: 3, category: "Business" },
        ],
      };
    });

    setScanResults(scan.id, mockResults);

    const ranked = mockResults.filter((r) => r.rank !== null);
    const avgRank = ranked.length > 0
      ? Math.round((ranked.reduce((a, r) => a + (r.rank || 0), 0) / ranked.length) * 10) / 10
      : null;

    updateScan(scan.id, {
      status: "completed",
      averageRank: avgRank,
      pointsRanked: ranked.length,
      completedAt: new Date().toISOString(),
    });

    return NextResponse.json(getScan(scan.id), { status: 201 });
  }

  // Real mode with DataForSEO
  updateScan(scan.id, { status: "running", startedAt: new Date().toISOString() });

  try {
    const gridPoints = generateGrid({
      centerLat: project.latitude,
      centerLng: project.longitude,
      gridSize: scan.gridSize,
      spacingMeters: scan.gridSpacing,
    });

    const gridResults = await runFullGridScan(
      { login, password },
      keyword,
      gridPoints,
      project.placeId,
      project.businessName
    );

    const results: ScanResult[] = gridResults.map((gr) => ({
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

    setScanResults(scan.id, results);

    const ranked = results.filter((r) => r.rank !== null);
    const avgRank = ranked.length > 0
      ? Math.round((ranked.reduce((a, r) => a + (r.rank || 0), 0) / ranked.length) * 10) / 10
      : null;

    updateScan(scan.id, {
      status: "completed",
      averageRank: avgRank,
      pointsRanked: ranked.length,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    updateScan(scan.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
    });
    console.error("Scan failed:", error);
  }

  return NextResponse.json(getScan(scan.id), { status: 201 });
}
