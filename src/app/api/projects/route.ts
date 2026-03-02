import { NextRequest, NextResponse } from "next/server";
import { getProjects, addProject } from "@/lib/store";
import { Project } from "@/lib/types";

export async function GET() {
  const projects = getProjects();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const project: Project = {
    id: crypto.randomUUID(),
    businessName: body.businessName,
    placeId: body.placeId || undefined,
    address: body.address || undefined,
    latitude: body.latitude,
    longitude: body.longitude,
    phone: body.phone || undefined,
    website: body.website || undefined,
    createdAt: new Date().toISOString(),
  };

  addProject(project);
  return NextResponse.json(project, { status: 201 });
}
