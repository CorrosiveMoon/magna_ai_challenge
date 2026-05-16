"use client";

import { cn } from "@/lib/utils";
import type { ImageStyle } from "@/lib/types";
import { IMAGE_STYLE_LABELS } from "@/lib/types";

interface ImageStylePickerProps {
  value: ImageStyle;
  onChange: (style: ImageStyle) => void;
}

const STYLE_ICONS: Record<ImageStyle, string> = {
  photoreal: "📸",
  illustration: "🎨",
  minimal: "◻️",
  "3d": "🎲",
  watercolor: "🖌️",
};

export default function ImageStylePicker({ value, onChange }: ImageStylePickerProps) {
  const styles = Object.entries(IMAGE_STYLE_LABELS) as [ImageStyle, string][];

  return (
    <div className="grid grid-cols-5 gap-2">
      {styles.map(([style, label]) => (
        <button
          key={style}
          type="button"
          onClick={() => onChange(style)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all duration-150",
            value === style
              ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/20"
              : "border-border bg-secondary/50 text-muted-foreground hover:border-border/80 hover:bg-secondary hover:text-foreground"
          )}
        >
          <span className="text-lg leading-none">{STYLE_ICONS[style]}</span>
          <span className="leading-tight text-center">{label}</span>
        </button>
      ))}
    </div>
  );
}
