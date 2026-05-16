"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Copy, Check, Trash2, ExternalLink, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ExportMenu from "@/components/ExportMenu";
import { cn, copyToClipboard, formatDateShort, truncate, CONTENT_TYPE_COLORS } from "@/lib/utils";
import { CONTENT_TYPE_LABELS } from "@/lib/types";
import type { Generation } from "@/lib/types";
import { toast } from "sonner";

interface DashboardCardProps {
  generation: Generation;
  onDelete: (id: string) => void;
}

export default function DashboardCard({ generation, onDelete }: DashboardCardProps) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleCopy() {
    await copyToClipboard(generation.body);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(generation.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  const colorClass =
    CONTENT_TYPE_COLORS[generation.content_type] ??
    "bg-muted text-muted-foreground border-border";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card card-glow transition-all duration-200">
      {/* Image thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-secondary/50">
        {generation.image_url ? (
          <Image
            src={generation.image_url}
            alt={generation.title ?? generation.topic}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="size-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Badge + date */}
        <div className="flex items-center justify-between gap-2">
          <Badge className={cn("border text-xs shrink-0", colorClass)}>
            {CONTENT_TYPE_LABELS[generation.content_type]}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDateShort(generation.created_at)}</span>
        </div>

        {/* Title / topic */}
        <div>
          <p className="font-semibold text-sm leading-snug line-clamp-1">
            {generation.title ?? generation.topic}
          </p>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {truncate(generation.body.replace(/<[^>]*>/g, ""), 120)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-1.5 pt-1 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1 px-2 text-xs">
            {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>

          <ExportMenu generationId={generation.id} variant="ghost" size="sm" />

          <Link href={`/generations/${generation.id}`} className="ml-auto">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              <ExternalLink className="size-3" />
              View
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className={cn(
              "h-7 gap-1 px-2 text-xs transition-colors",
              confirmDelete
                ? "text-destructive hover:bg-destructive/10"
                : "text-muted-foreground hover:text-destructive"
            )}
          >
            <Trash2 className="size-3" />
            {confirmDelete ? "Confirm" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
