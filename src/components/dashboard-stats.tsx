"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, MapPin, BarChart3, Target, Hash } from "lucide-react";
import { Scan, ScanResult } from "@/lib/types";

interface DashboardStatsProps {
  scan: Scan | null;
  results: ScanResult[];
}

export default function DashboardStats({ scan, results }: DashboardStatsProps) {
  if (!scan || results.length === 0) {
    return null;
  }

  const totalPoints = results.length;
  const rankedPoints = results.filter((r) => r.rank !== null).length;
  const top3Points = results.filter((r) => r.rank !== null && r.rank <= 3).length;
  const page1Points = results.filter((r) => r.rank !== null && r.rank <= 10).length;
  const notFoundPoints = results.filter((r) => r.rank === null).length;
  const visibilityPercent = Math.round((rankedPoints / totalPoints) * 100);

  const stats = [
    {
      label: "Average Rank",
      value: scan.averageRank?.toFixed(1) ?? "N/A",
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Top 3 (Map Pack)",
      value: `${top3Points}/${totalPoints}`,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      subtext: `${Math.round((top3Points / totalPoints) * 100)}%`,
    },
    {
      label: "Page 1 (Top 10)",
      value: `${page1Points}/${totalPoints}`,
      icon: TrendingUp,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
      subtext: `${Math.round((page1Points / totalPoints) * 100)}%`,
    },
    {
      label: "Visibility",
      value: `${visibilityPercent}%`,
      icon: MapPin,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      subtext: `${rankedPoints} of ${totalPoints} points`,
    },
    {
      label: "Not Found",
      value: notFoundPoints.toString(),
      icon: Hash,
      color: "text-gray-600",
      bgColor: "bg-gray-50 dark:bg-gray-950",
      subtext: `${Math.round((notFoundPoints / totalPoints) * 100)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            {stat.subtext && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {stat.subtext}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
