import { useState, useRef, useEffect } from "react";
import { Send, ImagePlus, X } from "lucide-react";
import clsx from "clsx";

interface ChatInputProps {
  onSend: (message: string) => void;
  onImageSelect?: (file: File) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onImageSelect,
  isLoading,
  placeholder = "Ask about astrophysics, or upload an image for analysis...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    if ((!value.trim() && !imagePreview) || isLoading) return;
    onSend(value.trim());
    setValue("");
    setImagePreview(null);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) {
      setImagePreview(URL.createObjectURL(file));
      onImageSelect?.(file);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      setImagePreview(URL.createObjectURL(file));
      onImageSelect?.(file);
    }
  };

  const canSend = (value.trim().length > 0 || imagePreview) && !isLoading;

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-void-950/80 backdrop-blur-xl px-4 sm:px-6 py-3">
      <div className="max-w-3xl mx-auto">
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2.5 flex items-start gap-2">
            <div className="relative group">
              <img
                src={imagePreview}
                alt="Upload"
                className="h-16 w-16 rounded-xl border border-white/10 object-cover"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-void-800 border border-white/10 text-white/60 text-xs flex items-center justify-center hover:bg-red-500/60 hover:text-white hover:border-red-400/30 transition-all opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] text-white/30 mt-1">
              Image ready for analysis
            </span>
          </div>
        )}

        {/* Input row */}
        <div
          className={clsx(
            "flex items-end gap-2 p-2.5 rounded-2xl border transition-all duration-200",
            isDragging
              ? "border-nebula-500/40 bg-nebula-600/10"
              : "border-white/[0.08] bg-white/[0.02] focus-within:border-white/[0.14] focus-within:bg-white/[0.03]"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-nebula-400 hover:border-nebula-500/25 hover:bg-nebula-600/10 transition-all"
            title="Upload image"
          >
            <ImagePlus className="w-3.5 h-3.5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/20 outline-none resize-none min-h-[32px] max-h-40 py-1.5 font-body leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={clsx(
              "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
              canSend
                ? "bg-nebula-600 text-white hover:bg-nebula-500 shadow-lg shadow-nebula-600/20"
                : "bg-white/[0.03] text-white/15"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-white/15 mt-1.5 text-center font-mono tracking-wide">
          AstroSage · Kimi K2 · Astrometry.net · SkyView · SIMBAD
        </p>
      </div>
    </div>
  );
}
