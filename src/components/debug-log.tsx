"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Terminal, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface LogEntry {
  time: string;
  message: string;
  type: "info" | "error" | "success" | "progress";
}

interface DebugLogProps {
  logs: LogEntry[];
  progress?: { completed: number; total: number; found: number; errors: number } | null;
  onClear?: () => void;
}

export default function DebugLog({ logs, progress, onClear }: DebugLogProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="border rounded-lg bg-slate-950 text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs font-mono font-medium">Scan Log</span>
          {progress && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-700 text-slate-300">
              {progress.completed}/{progress.total}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-slate-400 hover:text-white"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-slate-400 hover:text-white"
              onClick={onClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress && progress.total > 0 && (
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Log entries */}
      {!collapsed && (
        <div ref={scrollRef} className="max-h-48 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed space-y-0.5">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-slate-600 shrink-0">{log.time}</span>
              <span
                className={
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "success"
                    ? "text-green-400"
                    : log.type === "progress"
                    ? "text-blue-400"
                    : "text-slate-300"
                }
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
