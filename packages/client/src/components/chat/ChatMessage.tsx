import { Telescope, User, RefreshCw, AlertCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import type { DisplayMessage } from "@/hooks/useChat";

interface ChatMessageProps {
  message: DisplayMessage;
  onRetry?: () => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={clsx(
        "flex gap-3 animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar — assistant only */}
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-nebula-600/30 to-cosmic-600/30 border border-nebula-500/20 flex items-center justify-center mt-1">
          <Telescope className="w-4 h-4 text-nebula-400" />
        </div>
      )}

      {/* Message body */}
      <div
        className={clsx(
          "max-w-[75%] min-w-0",
          isUser && "order-first"
        )}
      >
        {/* Name + timestamp */}
        <div
          className={clsx(
            "flex items-center gap-2 mb-1.5",
            isUser && "justify-end"
          )}
        >
          <span className="text-[11px] font-medium text-white/40">
            {isUser ? "You" : "AstroSage"}
          </span>
          <span className="text-[10px] text-white/20 font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={clsx(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-nebula-600/20 border border-nebula-500/15 text-white/90 rounded-tr-md"
              : "glass text-white/80 rounded-tl-md"
          )}
        >
          {/* Loading state */}
          {message.isLoading && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-nebula-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-nebula-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-nebula-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs text-white/30">Analyzing...</span>
            </div>
          )}

          {/* Error state */}
          {message.error && (
            <div className="flex items-center gap-2 text-red-400/80">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs">{message.error}</span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="ml-auto flex items-center gap-1 text-xs text-nebula-400 hover:text-nebula-300 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {message.content && !message.isLoading && (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:text-white/90 prose-strong:text-white/90 prose-code:text-nebula-300 prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-white/[0.04] prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-xl prose-ul:my-1.5 prose-li:my-0.5">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions — assistant only */}
        {!isUser && message.content && !message.isLoading && (
          <div className="flex items-center gap-2 mt-1.5 ml-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-aurora-400" />
                  <span className="text-aurora-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
            {message.tokens && (
              <span className="text-[10px] text-white/15 font-mono">
                {message.tokens} tokens
              </span>
            )}
          </div>
        )}
      </div>

      {/* Avatar — user only */}
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mt-1">
          <User className="w-4 h-4 text-white/40" />
        </div>
      )}
    </div>
  );
}
