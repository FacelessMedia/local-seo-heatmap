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
import { Loader2, Search, Crosshair } from "lucide-react";
import { GRID_SIZES, GRID_SPACINGS, ScanFormData } from "@/lib/types";

interface ScanControlProps {
  onStartScan: (data: ScanFormData) => Promise<void>;
  isScanning: boolean;
  projectName?: string;
}

export default function ScanControl({
  onStartScan,
  isScanning,
  projectName,
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
              <Label>Grid Size</Label>
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
                      {g.label} ({g.points} points)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Spacing</Label>
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
