const API_BASE = import.meta.env.VITE_API_URL || "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Chat ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  response: string;
  model: string;
  tokens: number | null;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

// ─── Analysis ────────────────────────────────────────────────────────────────
export interface AnalysisCallbacks {
  onProgress?: (stage: string, data: any) => void;
  onStageResult?: (type: string, data: any) => void;
  onResult?: (data: any) => void;
  onError?: (error: string) => void;
}

export async function runFullAnalysis(
  imageFile: File,
  question: string,
  callbacks: AnalysisCallbacks
) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("question", question);

  const res = await fetch(`${API_BASE}/api/analysis/full`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Analysis failed");

  // Parse SSE stream
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No response stream");

  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let eventType = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7);
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (eventType === "progress") callbacks.onProgress?.(data.stage, data);
          else if (eventType === "stage_result") callbacks.onStageResult?.(data.type, data.data);
          else if (eventType === "result") callbacks.onResult?.(data);
          else if (eventType === "error") callbacks.onError?.(data.message);
        } catch {
          // skip malformed data
        }
      }
    }
  }
}

// ─── Community ───────────────────────────────────────────────────────────────
export async function getCommunityPosts() {
  return request<{ success: boolean; posts: any[] }>("/api/community/posts");
}

export async function createCommunityPost(data: {
  text: string;
  userId: string;
  author: string;
  observationId?: string;
}) {
  return request("/api/community/posts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Observations ────────────────────────────────────────────────────────────
export interface ObservationSummary {
  id: string;
  created_at: string;
  pipeline_version: string;
  tier: number;
  ra: number | null;
  dec_coord: number | null;
  morphology: any | null;
  discovery_score: number;
  discovery_tier: string;
  image_url: string | null;
  user_question: string | null;
  is_uncatalogued: boolean;
  synthesis: any | null;
}

export interface ObservationDetail extends ObservationSummary {
  user_id: string;
  field_width: number | null;
  field_height: number | null;
  orientation: number | null;
  pixscale: number | null;
  image_quality: any | null;
  catalog_matches: any[];
  change_detection: any | null;
  visual_comparison: any | null;
  archival_images: any[];
  discovery_score_breakdown: any | null;
  model_versions: any;
}

export interface ObservationStats {
  totalObservations: number;
  significantDiscoveries: number;
  uncataloguedObjects: number;
}

export async function getObservations(params?: {
  userId?: string;
  limit?: number;
  offset?: number;
  minScore?: number;
}): Promise<{ success: boolean; observations: ObservationSummary[] }> {
  const searchParams = new URLSearchParams();
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.minScore) searchParams.set("minScore", String(params.minScore));

  const qs = searchParams.toString();
  return request(`/api/observations${qs ? `?${qs}` : ""}`);
}

export async function getObservation(id: string): Promise<{ success: boolean; observation: ObservationDetail }> {
  return request(`/api/observations/${id}`);
}

export async function getObservationStats(): Promise<{ success: boolean; stats: ObservationStats }> {
  return request("/api/observations/stats/summary");
}

export async function deleteObservation(id: string): Promise<{ success: boolean }> {
  return request(`/api/observations/${id}`, { method: "DELETE" });
}
