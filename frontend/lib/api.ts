import { createClient } from "@/lib/supabase/client";
import type {
  GenerateTextRequest,
  GenerateTextResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  GenerationList,
  Generation,
  ImproveRequest,
  ImproveResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message ?? res.statusText ?? "Request failed";
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }

  return data as T;
}

// ── Generation endpoints ──────────────────────────────────────────────────────

export async function generateText(req: GenerateTextRequest): Promise<GenerateTextResponse> {
  return apiFetch("/api/generate/text", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function generateImage(req: GenerateImageRequest): Promise<GenerateImageResponse> {
  return apiFetch("/api/generate/image", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function listGenerations(page = 1, pageSize = 10): Promise<GenerationList> {
  return apiFetch(`/api/generations?page=${page}&page_size=${pageSize}`);
}

export async function getGeneration(id: string): Promise<Generation> {
  return apiFetch(`/api/generations/${id}`);
}

export async function deleteGeneration(id: string): Promise<void> {
  return apiFetch(`/api/generations/${id}`, { method: "DELETE" });
}

export async function improveContent(req: ImproveRequest): Promise<ImproveResponse> {
  return apiFetch("/api/improve", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ── Export — streams a file download ─────────────────────────────────────────

export async function exportGeneration(id: string, format: "pdf" | "docx"): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/generations/${id}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ format }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message ?? "Export failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `generation-${id}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
