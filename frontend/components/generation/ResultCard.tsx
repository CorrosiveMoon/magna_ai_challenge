"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Check, ImagePlus, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ImageStylePicker from "@/components/generation/ImageStylePicker";
import { cn, copyToClipboard, CONTENT_TYPE_COLORS } from "@/lib/utils";
import { CONTENT_TYPE_LABELS } from "@/lib/types";
import type { Generation, ImageStyle } from "@/lib/types";
import { generateImage } from "@/lib/api";
import { toast } from "sonner";

interface ResultCardProps {
  generation: Generation;
  onUpdate: (updated: Partial<Generation>) => void;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^([^<\n].*)$/gm, (line) =>
      line.trim().startsWith('<') ? line : `<p>${line}</p>`
    );
}

export default function ResultCard({ generation, onUpdate }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [imageStyle, setImageStyle] = useState<ImageStyle>(generation.image_style ?? "photoreal");
  const [generatingImage, setGeneratingImage] = useState(false);

  async function handleCopy() {
    await copyToClipboard(generation.body);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleGenerateImage() {
    setGeneratingImage(true);
    try {
      const result = await generateImage({
        generation_id: generation.id,
        style: imageStyle,
      });
      onUpdate({ image_url: result.image_url, image_style: result.image_style });
      toast.success("Image generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  }

  const colorClass =
    CONTENT_TYPE_COLORS[generation.content_type] ??
    "bg-muted text-muted-foreground border-border";

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Badge className={cn("border text-xs", colorClass)}>
            {CONTENT_TYPE_LABELS[generation.content_type]}
          </Badge>
          {generation.title && (
            <h2 className="text-xl font-semibold leading-snug">{generation.title}</h2>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0 gap-1.5"
        >
          {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      {/* Body */}
      <div
        className="prose-ai rounded-xl border border-border bg-card/50 p-5 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(generation.body) }}
      />

      {/* Image section */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Visual Asset</h3>
          {generation.image_url && (
            <span className="text-xs text-muted-foreground">
              Style: {generation.image_style}
            </span>
          )}
        </div>

        <ImageStylePicker value={imageStyle} onChange={setImageStyle} />

        <Button
          onClick={handleGenerateImage}
          disabled={generatingImage}
          variant={generation.image_url ? "outline" : "gradient"}
          className="w-full gap-2"
        >
          {generatingImage ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating image…
            </>
          ) : generation.image_url ? (
            <>
              <RefreshCw className="size-4" />
              Regenerate image
            </>
          ) : (
            <>
              <ImagePlus className="size-4" />
              Generate image
            </>
          )}
        </Button>

        {generation.image_url && (
          <div className="animate-fade-in-scale overflow-hidden rounded-lg border border-border">
            <Image
              src={generation.image_url}
              alt={`Generated image for: ${generation.topic}`}
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
