"use client";

import { useCallback, useRef, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { getRankColor, getRankLabel } from "@/lib/grid";
import { ScanResult } from "@/lib/types";

interface HeatmapGridProps {
  results: ScanResult[];
  centerLat: number;
  centerLng: number;
  gridSize: number;
  businessName: string;
  keyword: string;
  averageRank: number | null;
  onPointClick?: (result: ScanResult) => void;
}

function GridMarker({
  result,
  onClick,
}: {
  result: ScanResult;
  onClick?: (result: ScanResult) => void;
}) {
  const color = getRankColor(result.rank);
  const label = getRankLabel(result.rank);

  return (
    <AdvancedMarker
      position={{ lat: result.latitude, lng: result.longitude }}
      onClick={() => onClick?.(result)}
    >
      <div
        className="flex items-center justify-center rounded-full text-white font-bold text-xs cursor-pointer border-2 border-white shadow-lg transition-transform hover:scale-125"
        style={{
          backgroundColor: color,
          width: 32,
          height: 32,
          minWidth: 32,
        }}
        title={`Rank: ${label} at (${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)})`}
      >
        {label}
      </div>
    </AdvancedMarker>
  );
}

function HeatmapMapContent({
  results,
  centerLat,
  centerLng,
  onPointClick,
}: {
  results: ScanResult[];
  centerLat: number;
  centerLng: number;
  onPointClick?: (result: ScanResult) => void;
}) {
  const map = useMap();

  return (
    <>
      {/* Business center marker */}
      <AdvancedMarker position={{ lat: centerLat, lng: centerLng }}>
        <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full border-3 border-white shadow-xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="white"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" fill="blue" stroke="blue" />
          </svg>
        </div>
      </AdvancedMarker>

      {/* Grid point markers */}
      {results.map((result, index) => (
        <GridMarker
          key={`${result.gridRow}-${result.gridCol}-${index}`}
          result={result}
          onClick={onPointClick}
        />
      ))}
    </>
  );
}

export default function HeatmapGrid({
  results,
  centerLat,
  centerLng,
  gridSize,
  businessName,
  keyword,
  averageRank,
  onPointClick,
}: HeatmapGridProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mapId = "heatmap-grid-map";

  // Calculate bounds for initial zoom
  const bounds = useMemo(() => {
    if (results.length === 0) return null;
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    for (const r of results) {
      minLat = Math.min(minLat, r.latitude);
      maxLat = Math.max(maxLat, r.latitude);
      minLng = Math.min(minLng, r.longitude);
      maxLng = Math.max(maxLng, r.longitude);
    }
    return { minLat, maxLat, minLng, maxLng };
  }, [results]);

  // If no API key, render a CSS-based grid instead
  if (!apiKey) {
    return (
      <div className="relative" ref={mapRef}>
        <CSSHeatmapGrid
          results={results}
          gridSize={gridSize}
          businessName={businessName}
          keyword={keyword}
          averageRank={averageRank}
          onPointClick={onPointClick}
        />
      </div>
    );
  }

  return (
    <div ref={mapRef} className="relative w-full h-[600px] rounded-lg overflow-hidden border">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={{ lat: centerLat, lng: centerLng }}
          defaultZoom={12}
          mapId={mapId}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%" }}
        >
          <HeatmapMapContent
            results={results}
            centerLat={centerLat}
            centerLng={centerLng}
            onPointClick={onPointClick}
          />
        </Map>
      </APIProvider>
    </div>
  );
}

// Fallback CSS-based grid when no Google Maps API key is configured
function CSSHeatmapGrid({
  results,
  gridSize,
  businessName,
  keyword,
  averageRank,
  onPointClick,
}: {
  results: ScanResult[];
  gridSize: number;
  businessName: string;
  keyword: string;
  averageRank: number | null;
  onPointClick?: (result: ScanResult) => void;
}) {
  // Organize results into a grid
  const grid: (ScanResult | null)[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => null)
  );

  for (const result of results) {
    if (result.gridRow < gridSize && result.gridCol < gridSize) {
      grid[result.gridRow][result.gridCol] = result;
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{businessName}</h3>
          <p className="text-slate-400 text-sm">
            Keyword: <span className="text-white font-medium">{keyword}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Avg Rank</div>
          <div
            className="text-2xl font-bold"
            style={{
              color: averageRank
                ? getRankColor(Math.round(averageRank))
                : "#6b7280",
            }}
          >
            {averageRank?.toFixed(1) ?? "N/A"}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-1.5 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          maxWidth: gridSize * 48,
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            if (!cell) {
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="aspect-square rounded-md bg-slate-700/50 flex items-center justify-center"
                >
                  <span className="text-slate-500 text-xs">-</span>
                </div>
              );
            }

            const color = getRankColor(cell.rank);
            const label = getRankLabel(cell.rank);
            const isCenter =
              rowIndex === Math.floor(gridSize / 2) &&
              colIndex === Math.floor(gridSize / 2);

            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => onPointClick?.(cell)}
                className={`aspect-square rounded-md flex items-center justify-center text-white font-bold text-sm cursor-pointer transition-all hover:scale-110 hover:z-10 relative ${
                  isCenter ? "ring-2 ring-blue-400" : ""
                }`}
                style={{ backgroundColor: color }}
                title={`Row ${rowIndex + 1}, Col ${colIndex + 1}\nRank: ${label}\nLat: ${cell.latitude.toFixed(4)}, Lng: ${cell.longitude.toFixed(4)}`}
              >
                {label}
                {isCenter && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-300">1-3 (Top 3)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-300">4-10 (Page 1)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-300">11-20 (Page 2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span className="text-slate-300">21+ / Not Found</span>
        </div>
      </div>
    </div>
  );
}
