"use client";

import { useState } from "react";
import { Wand2, Loader2, Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ImproveGoal, ImproveResponse } from "@/lib/types";
import { IMPROVE_GOAL_LABELS } from "@/lib/types";
import { improveContent } from "@/lib/api";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

const GOALS: ImproveGoal[] = [
  "shorter",
  "more_persuasive",
  "more_formal",
  "seo_optimized",
  "rewrite_for_audience",
];

export default function ImprovePage() {
  const [text, setText] = useState("");
  const [goal, setGoal] = useState<ImproveGoal>("more_persuasive");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImproveResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Please enter some text to improve");
      return;
    }
    if (goal === "rewrite_for_audience" && !targetAudience.trim()) {
      toast.error("Please specify a target audience");
      return;
    }

    setLoading(true);
    try {
      const response = await improveContent({
        text,
        goal,
        target_audience: goal === "rewrite_for_audience" ? targetAudience : undefined,
      });
      setResult(response);
      toast.success("Content improved!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Improvement failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await copyToClipboard(result.improved_text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wand2 className="size-6 text-primary" />
          Content Improver
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste your existing content and let AI enhance it for your specific goal.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Input panel */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6 card-glow">
              <h2 className="mb-4 text-sm font-semibold flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-md bg-primary/15 text-xs text-primary font-bold">1</span>
                Your Content
              </h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="text">Paste your text</Label>
                  <Textarea
                    id="text"
                    placeholder="Paste the content you want to improve…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[220px] text-sm leading-relaxed"
                    required
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {text.length} characters
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Improvement goal</Label>
                  <Select value={goal} onValueChange={(v) => setGoal(v as ImproveGoal)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOALS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {IMPROVE_GOAL_LABELS[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {goal === "rewrite_for_audience" && (
                  <div className="space-y-1.5 animate-fade-in">
                    <Label htmlFor="audience">Target audience</Label>
                    <Input
                      id="audience"
                      placeholder="e.g. Senior executives in tech"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="h-10"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Improving…
                    </>
                  ) : (
                    <>
                      <Wand2 className="size-4" />
                      Improve Content
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Output panel */}
          <div>
            {result ? (
              <div className="animate-fade-in space-y-4">
                {/* Improved text */}
                <div className="rounded-2xl border border-border bg-card p-6 card-glow">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-md bg-primary/15 text-xs text-primary font-bold">2</span>
                      Improved Version
                    </h2>
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                      {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <div className="prose-ai text-sm rounded-lg border border-border/50 bg-secondary/20 p-4 whitespace-pre-wrap">
                    {result.improved_text}
                  </div>
                </div>

                {/* Changes explanation */}
                <div className="rounded-2xl border border-border bg-card p-5 card-glow">
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    What changed
                  </h3>
                  <ul className="space-y-2">
                    {result.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 text-center px-8">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Wand2 className="size-6 text-primary/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Improved content will appear here
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Paste your text, choose a goal, and click &ldquo;Improve Content&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
