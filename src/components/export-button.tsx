"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Image as ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
}

export default function ExportButton({ targetRef, filename = "heatmap" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!targetRef.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(targetRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#0f172a",
      });

      const link = document.createElement("a");
      link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ImageIcon className="mr-2 h-4 w-4" />
      )}
      Export Image
    </Button>
  );
}
