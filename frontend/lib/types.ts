export type ContentType = "blog_post" | "linkedin_post" | "ad_copy" | "email";
export type ImageStyle = "photoreal" | "illustration" | "minimal" | "3d" | "watercolor";
export type ImproveGoal =
  | "shorter"
  | "more_persuasive"
  | "more_formal"
  | "seo_optimized"
  | "rewrite_for_audience";

export interface Generation {
  id: string;
  content_type: ContentType;
  topic: string;
  tone: string;
  audience: string;
  title: string | null;
  body: string;
  image_url: string | null;
  image_style: ImageStyle | null;
  image_prompt: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GenerationList {
  items: Generation[];
  page: number;
  page_size: number;
  total: number;
}

export interface GenerateTextRequest {
  topic: string;
  tone: string;
  audience: string;
  content_type: ContentType;
}

export interface GenerateTextResponse {
  id: string;
  title: string | null;
  body: string;
  content_type: ContentType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GenerateImageRequest {
  generation_id: string;
  style: ImageStyle;
}

export interface GenerateImageResponse {
  id: string;
  image_url: string;
  image_style: ImageStyle;
}

export interface ImproveRequest {
  text: string;
  goal: ImproveGoal;
  target_audience?: string;
}

export interface ImproveResponse {
  improved_text: string;
  changes: string[];
}

export interface ExportRequest {
  format: "pdf" | "docx";
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog_post: "Blog Post",
  linkedin_post: "LinkedIn Post",
  ad_copy: "Ad Copy",
  email: "Email",
};

export const IMAGE_STYLE_LABELS: Record<ImageStyle, string> = {
  photoreal: "Photoreal",
  illustration: "Illustration",
  minimal: "Minimal",
  "3d": "3D Render",
  watercolor: "Watercolor",
};

export const TONE_OPTIONS = [
  "Professional",
  "Casual",
  "Friendly",
  "Authoritative",
  "Humorous",
  "Inspirational",
  "Persuasive",
  "Educational",
];

export const IMPROVE_GOAL_LABELS: Record<ImproveGoal, string> = {
  shorter: "Make it shorter",
  more_persuasive: "More persuasive",
  more_formal: "More formal",
  seo_optimized: "SEO optimized",
  rewrite_for_audience: "Rewrite for audience",
};
