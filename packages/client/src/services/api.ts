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
  usage: any;
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
