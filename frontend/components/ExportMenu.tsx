"use client";

import { useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { exportGeneration } from "@/lib/api";
import { toast } from "sonner";

interface ExportMenuProps {
  generationId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function ExportMenu({
  generationId,
  variant = "outline",
  size = "sm",
}: ExportMenuProps) {
  const [loading, setLoading] = useState<"pdf" | "docx" | null>(null);

  async function handleExport(format: "pdf" | "docx") {
    setLoading(format);
    try {
      await exportGeneration(generationId, format);
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-1.5" disabled={loading !== null}>
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FileDown className="size-3.5" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Download as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2">
          <FileDown className="size-3.5 text-red-400" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("docx")} className="gap-2">
          <FileText className="size-3.5 text-blue-400" />
          Word (DOCX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
