"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import GenerationForm from "@/components/generation/GenerationForm";
import ResultCard from "@/components/generation/ResultCard";
import type { GenerateTextResponse, Generation } from "@/lib/types";

export default function GeneratePage() {
  const [generation, setGeneration] = useState<Generation | null>(null);

  function handleResult(result: GenerateTextResponse) {
    setGeneration({
      id: result.id,
      content_type: result.content_type,
      topic: "",
      tone: "",
      audience: "",
      title: result.title,
      body: result.body,
      image_url: null,
      image_style: null,
      image_prompt: null,
      metadata: result.metadata,
      created_at: result.created_at,
    });
  }

  function handleUpdate(updated: Partial<Generation>) {
    setGeneration((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Generate Content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe your topic, choose a style, and let AI write it for you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Form panel */}
        <div>
          <div className="rounded-2xl border border-border bg-card p-6 card-glow">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
                <Sparkles className="size-3.5 text-primary" />
              </div>
              <h2 className="text-sm font-semibold">Content Settings</h2>
            </div>
            <GenerationForm onResult={handleResult} />
          </div>

          {/* Tips */}
          <div className="mt-4 rounded-xl border border-border/50 bg-card/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Tips for great results</p>
            <ul className="space-y-1 text-xs text-muted-foreground/80">
              <li>• Be specific about your topic — include product names, stats, or angles</li>
              <li>• Describe your audience precisely for targeted messaging</li>
              <li>• Try different tones to see which resonates best</li>
            </ul>
          </div>
        </div>

        {/* Result panel */}
        <div>
          {generation ? (
            <div className="rounded-2xl border border-border bg-card p-6 card-glow">
              <ResultCard generation={generation} onUpdate={handleUpdate} />
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 text-center px-8">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Sparkles className="size-6 text-primary/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Your generated content will appear here
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Fill out the form and click &ldquo;Generate Content&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
