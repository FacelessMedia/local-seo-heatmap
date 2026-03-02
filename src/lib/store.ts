import { Project, Scan, ScanResult } from "./types";

// In-memory store for demo mode (before DB is connected)
// Will be replaced by Vercel Postgres in production

let projects: Project[] = [];
let scans: Scan[] = [];
let scanResults: Map<string, ScanResult[]> = new Map();

export function getProjects(): Project[] {
  return projects;
}

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function addProject(project: Project): Project {
  projects.push(project);
  return project;
}

export function deleteProject(id: string): void {
  projects = projects.filter((p) => p.id !== id);
}

export function getScans(projectId?: string): Scan[] {
  if (projectId) {
    return scans.filter((s) => s.projectId === projectId);
  }
  return scans;
}

export function getScan(id: string): Scan | undefined {
  return scans.find((s) => s.id === id);
}

export function addScan(scan: Scan): Scan {
  scans.push(scan);
  return scan;
}

export function updateScan(id: string, updates: Partial<Scan>): Scan | undefined {
  const index = scans.findIndex((s) => s.id === id);
  if (index === -1) return undefined;
  scans[index] = { ...scans[index], ...updates };
  return scans[index];
}

export function getScanResults(scanId: string): ScanResult[] {
  return scanResults.get(scanId) || [];
}

export function setScanResults(scanId: string, results: ScanResult[]): void {
  scanResults.set(scanId, results);
}
