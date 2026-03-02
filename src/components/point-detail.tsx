"use client";

import { ScanResult } from "@/lib/types";
import { getRankColor, getRankLabel } from "@/lib/grid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Building2 } from "lucide-react";

interface PointDetailProps {
  result: ScanResult | null;
  open: boolean;
  onClose: () => void;
}

export default function PointDetail({ result, open, onClose }: PointDetailProps) {
  if (!result) return null;

  const color = getRankColor(result.rank);
  const label = getRankLabel(result.rank);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Grid Point ({result.gridRow + 1}, {result.gridCol + 1})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rank Display */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-full text-white font-bold text-lg"
              style={{
                backgroundColor: color,
                width: 48,
                height: 48,
              }}
            >
              {label}
            </div>
            <div>
              <p className="font-semibold">
                {result.rank ? `Rank #${result.rank}` : "Not Found"}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Top Results at this point */}
          {result.topResults && result.topResults.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Top Results at This Location
              </h4>
              <div className="space-y-2">
                {result.topResults.map((tr, index) => (
                  <div
                    key={`${tr.place_id}-${index}`}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                  >
                    <Badge
                      variant="outline"
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs"
                      style={{
                        borderColor: getRankColor(tr.rank),
                        color: getRankColor(tr.rank),
                      }}
                    >
                      {tr.rank}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{tr.title}</p>
                      {tr.category && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {tr.category}
                        </p>
                      )}
                      {tr.rating && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {tr.rating}
                          {tr.reviews && ` (${tr.reviews} reviews)`}
                        </p>
                      )}
                      {tr.address && (
                        <p className="text-xs text-muted-foreground truncate">
                          {tr.address}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
