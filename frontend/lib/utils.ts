import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ContentType } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  blog_post: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  linkedin_post: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  ad_copy: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  email: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
};
