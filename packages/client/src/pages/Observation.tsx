import { useRef, useEffect, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { EmptyState } from "@/components/chat/EmptyState";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";

type Mode = "chat" | "analysis";

export default function ObservationPage() {
  const { messages, isLoading, sendMessage, clearMessages, retryLastMessage } = useChat();
  const analysis = useAnalysis();
  const [mode, setMode] = useState<Mode>("chat");
  const [loadingGalaxy, setLoadingGalaxy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (mode === "chat" && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, mode]);

  // ── Pick up a galaxy sent from the Explore tab ───────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("investigate_galaxy");
    if (!stored) return;

    sessionStorage.removeItem("investigate_galaxy"); // consume it once

    const galaxy = JSON.parse(stored);
    if (!galaxy?.imageUrl) return;

    setLoadingGalaxy(true);
    setMode("analysis");

    // Fetch the galaxy image URL into a File object so the pipeline can use it
    fetch(galaxy.imageUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `${galaxy.id || "galaxy"}.jpg`, { type: blob.type || "image/jpeg" });
        analysis.setImageFile(file);
        setLoadingGalaxy(false);
        setTimeout(() => analysis.runAnalysis(), 150);
      })
      .catch(() => {
        setLoadingGalaxy(false);
        setMode("chat");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageSelect = (file: File) => {
    analysis.setImageFile(file);
    setMode("analysis");
    setTimeout(() => analysis.runAnalysis(), 100);
  };

  const handleCloseAnalysis = () => {
    analysis.clearImage();
    setMode("chat");
  };

  const hasMessages = messages.length > 0;

  // ── Loading galaxy from Explore ──────────────────────────────────────
  if (mode === "analysis" && loadingGalaxy) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-6 h-6 text-nebula-400 animate-spin" />
        <p className="text-sm text-white/40">Loading galaxy for investigation...</p>
      </div>
    );
  }

  // ── Analysis mode ────────────────────────────────────────────────────
  if (mode === "analysis" && analysis.state.imagePreview) {
    return (
      <div className="flex flex-col h-full">
        <AnalysisPanel
          state={analysis.state}
          onClose={handleCloseAnalysis}
          onRetry={() => analysis.runAnalysis()}
        />
      </div>
    );
  }

  // ── Chat mode ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {hasMessages ? (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <div className="flex justify-center">
              <button
                onClick={clearMessages}
                className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/40 transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.03]"
              >
                <Trash2 className="w-3 h-3" />
                Clear conversation
              </button>
            </div>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRetry={msg.error ? retryLastMessage : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="h-full py-8">
            <EmptyState
              onSuggestionClick={sendMessage}
              onUploadClick={() => fileInputRef.current?.click()}
            />
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelect(file);
          e.target.value = "";
        }}
      />

      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        onImageSelect={handleImageSelect}
      />
    </div>
  );
}
