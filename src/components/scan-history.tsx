"use client";

import { Scan } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Eye, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ScanHistoryProps {
  scans: Scan[];
  onViewScan: (scanId: string) => void;
  activeScanId?: string;
}

const statusConfig = {
  pending: { icon: Clock, label: "Pending", variant: "secondary" as const },
  running: { icon: Loader2, label: "Running", variant: "default" as const },
  completed: { icon: CheckCircle2, label: "Completed", variant: "default" as const },
  failed: { icon: XCircle, label: "Failed", variant: "destructive" as const },
};

export default function ScanHistory({
  scans,
  onViewScan,
  activeScanId,
}: ScanHistoryProps) {
  const sortedScans = [...scans].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Scan History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedScans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No scans yet. Run your first scan!
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {sortedScans.map((scan) => {
              const config = statusConfig[scan.status];
              const StatusIcon = config.icon;
              const isActive = scan.id === activeScanId;

              return (
                <button
                  key={scan.id}
                  onClick={() => onViewScan(scan.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {scan.keyword}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
                          <StatusIcon
                            className={`h-3 w-3 mr-1 ${
                              scan.status === "running" ? "animate-spin" : ""
                            }`}
                          />
                          {config.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {scan.gridSize}×{scan.gridSize}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {scan.averageRank !== null && (
                        <p className="text-sm font-bold text-primary">
                          {scan.averageRank.toFixed(1)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(scan.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
