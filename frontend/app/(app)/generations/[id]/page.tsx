"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  ImagePlus,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ExportMenu from "@/components/ExportMenu";
import ImageStylePicker from "@/components/generation/ImageStylePicker";
import { cn, copyToClipboard, formatDate, CONTENT_TYPE_COLORS } from "@/lib/utils";
import { CONTENT_TYPE_LABELS } from "@/lib/types";
import type { ImageStyle } from "@/lib/types";
import { getGeneration, generateImage, deleteGeneration } from "@/lib/api";
import { toast } from "sonner";

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^([^<\n].*)$/gm, (line) =>
      line.trim().startsWith("<") ? line : `<p>${line}</p>`
    );
}

export default function GenerationDetailPage({
  params,
}: PageProps<"/generations/[id]">) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [imageStyle, setImageStyle] = useState<ImageStyle>("photoreal");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { id } = use(params);

  const { data: generation, isLoading, isError } = useQuery({
    queryKey: ["generation", id],
    queryFn: () => getGeneration(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGeneration(id),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      router.push("/dashboard");
    },
    onError: () => toast.error("Delete failed"),
  });

  async function handleCopy() {
    if (!generation) return;
    await copyToClipboard(generation.body);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleGenerateImage() {
    if (!generation) return;
    setGeneratingImage(true);
    try {
      const result = await generateImage({ generation_id: generation.id, style: imageStyle });
      queryClient.setQueryData(["generation", id], {
        ...generation,
        image_url: result.image_url,
        image_style: result.image_style,
      });
      toast.success("Image generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !generation) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 flex flex-col items-center gap-4">
        <p className="text-muted-foreground">Generation not found.</p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const colorClass =
    CONTENT_TYPE_COLORS[generation.content_type] ??
    "bg-muted text-muted-foreground border-border";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Back */}
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge className={cn("border text-xs", colorClass)}>
            {CONTENT_TYPE_LABELS[generation.content_type]}
          </Badge>
          {generation.title && (
            <h1 className="text-2xl font-bold leading-snug">{generation.title}</h1>
          )}
          <p className="text-sm text-muted-foreground">{formatDate(generation.created_at)}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <ExportMenu generationId={generation.id} />
          <Button
            variant={confirmDelete ? "destructive" : "outline"}
            size="sm"
            onClick={() => {
              if (confirmDelete) deleteMutation.mutate();
              else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
            disabled={deleteMutation.isPending}
            className="gap-1.5"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            {confirmDelete ? "Confirm delete" : "Delete"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="rounded-2xl border border-border bg-card p-6 card-glow mb-6">
        <div
          className="prose-ai text-sm"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(generation.body) }}
        />
      </div>

      {/* Image section */}
      <div className="rounded-2xl border border-border bg-card p-6 card-glow">
        <h2 className="mb-4 text-sm font-semibold">Visual Asset</h2>

        <ImageStylePicker
          value={generation.image_style ?? imageStyle}
          onChange={setImageStyle}
        />

        <Button
          onClick={handleGenerateImage}
          disabled={generatingImage}
          variant={generation.image_url ? "outline" : "gradient"}
          className="mt-4 w-full gap-2"
        >
          {generatingImage ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating image…
            </>
          ) : generation.image_url ? (
            <>
              <RefreshCw className="size-4" />
              Regenerate with selected style
            </>
          ) : (
            <>
              <ImagePlus className="size-4" />
              Generate image
            </>
          )}
        </Button>

        {generation.image_url && (
          <div className="mt-5 animate-fade-in-scale overflow-hidden rounded-xl border border-border">
            <Image
              src={generation.image_url}
              alt={generation.title ?? generation.topic}
              width={1024}
              height={1024}
              className="w-full object-cover"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Unwrap the params Promise per Next.js 16 convention
import { use } from "react";
