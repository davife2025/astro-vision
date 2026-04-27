import { useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { EmptyState } from "@/components/chat/EmptyState";

export default function ObservationPage() {
  const { messages, isLoading, sendMessage, clearMessages, retryLastMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        {hasMessages ? (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Clear button */}
            <div className="flex justify-center">
              <button
                onClick={clearMessages}
                className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/40 transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.03]"
              >
                <Trash2 className="w-3 h-3" />
                Clear conversation
              </button>
            </div>

            {/* Messages */}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRetry={
                  msg.error ? retryLastMessage : undefined
                }
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

      {/* Hidden file input for empty state upload button */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // TODO: Session 2 — trigger full pipeline analysis
            sendMessage(`Analyze this celestial image: ${file.name}`);
          }
          e.target.value = "";
        }}
      />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        onImageSelect={(file) => {
          // TODO: Session 2 — store file for pipeline
        }}
      />
    </div>
  );
}
