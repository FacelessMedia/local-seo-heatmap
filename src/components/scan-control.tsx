"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Crosshair, Info, AlertCircle } from "lucide-react";
import { GRID_SIZES, GRID_SPACINGS, ScanFormData } from "@/lib/types";

interface ScanControlProps {
  onStartScan: (data: ScanFormData) => Promise<void>;
  isScanning: boolean;
  projectName?: string;
  error?: string | null;
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex ml-1 cursor-help">
      <Info className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 rounded-md bg-foreground px-2.5 py-1.5 text-[11px] leading-snug text-background opacity-0 transition-opacity group-hover:opacity-100 z-50 shadow-lg">
        {text}
      </span>
    </span>
  );
}

export default function ScanControl({
  onStartScan,
  isScanning,
  projectName,
  error,
}: ScanControlProps) {
  const [keyword, setKeyword] = useState("");
  const [gridSize, setGridSize] = useState<number>(7);
  const [gridSpacing, setGridSpacing] = useState<number>(1609);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    await onStartScan({ keyword: keyword.trim(), gridSize, gridSpacing });
  };

  const selectedGridInfo = GRID_SIZES.find((g) => g.value === gridSize);
  const estimatedCost = selectedGridInfo
    ? (selectedGridInfo.points * 0.002).toFixed(3)
    : "0.000";

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crosshair className="h-4 w-4" />
          Scan Control
        </CardTitle>
        {projectName && (
          <p className="text-sm text-muted-foreground">{projectName}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyword">Target Keyword</Label>
            <Input
              id="keyword"
              placeholder="e.g., plumber, dentist near me"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={isScanning}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center">
                Grid Size
                <Tooltip text="How many check points on the map. More points = more detailed view but higher cost. 7×7 is the standard." />
              </Label>
              <Select
                value={gridSize.toString()}
                onValueChange={(v) => setGridSize(parseInt(v))}
                disabled={isScanning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRID_SIZES.map((g) => (
                    <SelectItem key={g.value} value={g.value.toString()}>
                      {g.label} ({g.points} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                Spacing
                <Tooltip text="Distance between each check point. Smaller = zoomed-in view of a neighborhood. Larger = covers a wider metro area." />
              </Label>
              <Select
                value={gridSpacing.toString()}
                onValueChange={(v) => setGridSpacing(parseInt(v))}
                disabled={isScanning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRID_SPACINGS.map((s) => (
                    <SelectItem key={s.value} value={s.value.toString()}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Grid points:</span>
              <span className="font-medium text-foreground">{selectedGridInfo?.points || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Est. API cost:</span>
              <span className="font-medium text-foreground">${estimatedCost}</span>
            </div>
            <div className="flex justify-between">
              <span>Coverage area:</span>
              <span className="font-medium text-foreground">
                {((gridSize - 1) * gridSpacing / 1609).toFixed(1)} mi ×{" "}
                {((gridSize - 1) * gridSpacing / 1609).toFixed(1)} mi
              </span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isScanning || !keyword.trim()}
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Start Scan
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
