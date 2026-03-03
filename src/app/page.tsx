"use client";

import { useState, useRef, useCallback } from "react";
import { Project, Scan, ScanResult, ScanFormData } from "@/lib/types";
import ProjectSetup from "@/components/project-setup";
import ScanControl from "@/components/scan-control";
import ScanHistory from "@/components/scan-history";
import HeatmapGrid from "@/components/heatmap-grid";
import PointDetail from "@/components/point-detail";
import DashboardStats from "@/components/dashboard-stats";
import ExportButton from "@/components/export-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  ChevronLeft,
  Grid3X3,
  BarChart3,
  Settings,
  Menu,
} from "lucide-react";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<ScanResult | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const heatmapRef = useRef<HTMLDivElement>(null);

  const handleCreateProject = async (data: {
    businessName: string;
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string;
    phone?: string;
    website?: string;
  }) => {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const project = await response.json();
      setProjects((prev) => [...prev, project]);
      setActiveProject(project);
      setShowSetup(false);
      setScans([]);
      setActiveScan(null);
      setScanResults([]);
    }
  };

  const [scanError, setScanError] = useState<string | null>(null);

  const handleStartScan = async (data: ScanFormData) => {
    if (!activeProject) return;

    setIsScanning(true);
    setScanError(null);
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: data.keyword,
          gridSize: data.gridSize,
          gridSpacing: data.gridSpacing,
          businessName: activeProject.businessName,
          placeId: activeProject.placeId || undefined,
          latitude: activeProject.latitude,
          longitude: activeProject.longitude,
        }),
      });

      if (response.ok) {
        const { scan, results } = await response.json();
        setScans((prev) => [...prev, scan]);
        setActiveScan(scan);
        setScanResults(results);
      } else {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        setScanError(err.error || `Scan failed (${response.status})`);
        console.error("Scan error:", err);
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Network error — check your connection");
      console.error("Scan network error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleViewScan = async (scanId: string) => {
    const scan = scans.find((s) => s.id === scanId);
    if (!scan) return;

    setActiveScan(scan);

    const response = await fetch(`/api/scans/${scanId}`);
    if (response.ok) {
      const { results } = await response.json();
      setScanResults(results);
    }
  };

  // No project selected - show project list or setup
  if (!activeProject) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">LocalGrid</h1>
              <Badge variant="secondary" className="text-[10px]">
                Beta
              </Badge>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {projects.length === 0 || showSetup ? (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <Grid3X3 className="h-16 w-16 mx-auto text-primary mb-4" />
                <h2 className="text-3xl font-bold mb-2">
                  Local SEO Geo-Grid Heatmap
                </h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                  Track your Google Maps rankings across your entire service
                  area with precision geo-grid heatmaps.
                </p>
              </div>

              <ProjectSetup onCreateProject={handleCreateProject} />

              {projects.length > 0 && (
                <div className="text-center mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowSetup(false)}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to projects
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Your Projects</h2>
                <Button onClick={() => setShowSetup(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Business
                </Button>
              </div>

              <div className="space-y-3">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setActiveProject(project);
                      setScans([]);
                      setActiveScan(null);
                      setScanResults([]);
                    }}
                    className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{project.businessName}</p>
                        {project.address && (
                          <p className="text-sm text-muted-foreground">
                            {project.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Active project - show dashboard with heatmap
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } border-r bg-card transition-all duration-200 overflow-hidden flex-shrink-0`}
      >
        <div className="w-80 h-screen flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Grid3X3 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">LocalGrid</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setActiveProject(null);
                setActiveScan(null);
                setScanResults([]);
              }}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              All Projects
            </Button>
          </div>

          {/* Project Info */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {activeProject.businessName}
                </p>
                {activeProject.address && (
                  <p className="text-xs text-muted-foreground truncate">
                    {activeProject.address}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Scan Control */}
          <div className="p-4 border-b overflow-y-auto">
            <ScanControl
              onStartScan={handleStartScan}
              isScanning={isScanning}
              projectName={activeProject.businessName}
              error={scanError}
            />
          </div>

          {/* Scan History */}
          <div className="flex-1 overflow-y-auto p-4">
            <ScanHistory
              scans={scans}
              onViewScan={handleViewScan}
              activeScanId={activeScan?.id}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="border-b px-4 py-3 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            {activeScan && (
              <div>
                <h2 className="font-semibold text-sm">
                  {activeScan.keyword}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeScan.gridSize}×{activeScan.gridSize} grid •{" "}
                  {activeScan.totalPoints} points
                  {activeScan.averageRank !== null &&
                    ` • Avg Rank: ${activeScan.averageRank.toFixed(1)}`}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {scanResults.length > 0 && (
              <ExportButton
                targetRef={heatmapRef}
                filename={`${activeProject.businessName}-${activeScan?.keyword || "scan"}`}
              />
            )}
          </div>
        </header>

        {/* Stats */}
        {activeScan && scanResults.length > 0 && (
          <div className="px-4 pt-4">
            <DashboardStats scan={activeScan} results={scanResults} />
          </div>
        )}

        {/* Heatmap Area */}
        <div className="flex-1 p-4 overflow-auto">
          {scanResults.length > 0 ? (
            <div ref={heatmapRef}>
              <HeatmapGrid
                results={scanResults}
                centerLat={activeProject.latitude}
                centerLng={activeProject.longitude}
                gridSize={activeScan?.gridSize || 7}
                businessName={activeProject.businessName}
                keyword={activeScan?.keyword || ""}
                averageRank={activeScan?.averageRank || null}
                onPointClick={setSelectedPoint}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Grid3X3 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">
                  Ready to Scan
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Enter a keyword in the scan control panel and click
                  &quot;Start Scan&quot; to generate your first geo-grid
                  heatmap.
                </p>
                {!sidebarOpen && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSidebarOpen(true)}
                  >
                    Open Scan Panel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Point Detail Dialog */}
      <PointDetail
        result={selectedPoint}
        open={!!selectedPoint}
        onClose={() => setSelectedPoint(null)}
      />
    </div>
  );
}
