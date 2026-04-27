import { useState, useCallback, useRef } from "react";
import { sendChatMessage, type ChatMessage } from "@/services/api";

export interface DisplayMessage extends ChatMessage {
  id: string;
  timestamp: number;
  isLoading?: boolean;
  error?: string;
  tokens?: number | null;
}

export function useChat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Add user message
      const userMsg: DisplayMessage = {
        id: `msg_${Date.now()}_u`,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      // Add placeholder assistant message
      const assistantId = `msg_${Date.now()}_a`;
      const placeholderMsg: DisplayMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, placeholderMsg]);
      setIsLoading(true);

      try {
        // Build history from existing messages (exclude loading placeholders)
        const history: ChatMessage[] = messages
          .filter((m) => !m.isLoading && !m.error)
          .map((m) => ({ role: m.role, content: m.content }));

        // Add current user message to history
        history.push({ role: "user", content: content.trim() });

        const result = await sendChatMessage(content.trim(), history);

        // Replace placeholder with real response
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: result.response,
                  isLoading: false,
                  tokens: result.tokens,
                }
              : m
          )
        );
      } catch (err) {
        // Replace placeholder with error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "",
                  isLoading: false,
                  error: (err as Error).message,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const retryLastMessage = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // Remove the failed assistant message and retry
      setMessages((prev) => prev.slice(0, -2));
      setTimeout(() => sendMessage(lastUserMsg.content), 100);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    retryLastMessage,
  };
}
