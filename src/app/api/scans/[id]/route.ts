import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanResults } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = getScan(id);

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const results = getScanResults(id);

  return NextResponse.json({
    scan,
    results,
  });
}
