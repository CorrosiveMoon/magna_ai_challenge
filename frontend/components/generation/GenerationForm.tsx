"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContentType, Generation, GenerateTextResponse } from "@/lib/types";
import { CONTENT_TYPE_LABELS, TONE_OPTIONS } from "@/lib/types";
import { generateText } from "@/lib/api";
import { toast } from "sonner";

interface GenerationFormProps {
  onResult: (result: GenerateTextResponse) => void;
}

const CONTENT_TYPES: ContentType[] = ["blog_post", "linkedin_post", "ad_copy", "email"];

export default function GenerationForm({ onResult }: GenerationFormProps) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [audience, setAudience] = useState("");
  const [contentType, setContentType] = useState<ContentType>("blog_post");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    if (!audience.trim()) {
      toast.error("Please describe your target audience");
      return;
    }

    setLoading(true);
    try {
      const result = await generateText({ topic, tone, audience, content_type: contentType });
      onResult(result);
      toast.success("Content generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Topic */}
      <div className="space-y-1.5">
        <Label htmlFor="topic">Topic</Label>
        <Input
          id="topic"
          placeholder="e.g. Sustainable fashion trends in 2026"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="h-10"
          required
        />
      </div>

      {/* Audience */}
      <div className="space-y-1.5">
        <Label htmlFor="audience">Target Audience</Label>
        <Input
          id="audience"
          placeholder="e.g. Gen Z eco-conscious shoppers"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="h-10"
          required
        />
      </div>

      {/* Tone + Content type in a row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {CONTENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            Generate Content
          </>
        )}
      </Button>
    </form>
  );
}
