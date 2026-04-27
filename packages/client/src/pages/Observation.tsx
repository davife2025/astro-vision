import { useState, useRef } from "react";
import { Upload, Send, Sparkles, ImagePlus } from "lucide-react";
import clsx from "clsx";

export default function ObservationPage() {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Empty state */}
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nebula-600/20 to-cosmic-600/20 border border-nebula-500/20 flex items-center justify-center mb-6">
            <Sparkles className="w-7 h-7 text-nebula-400" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-white mb-2">
            Begin Your Observation
          </h2>
          <p className="text-white/40 text-sm max-w-md leading-relaxed mb-8">
            Upload a celestial image for AI-powered analysis or ask any astrophysics question.
            The platform will classify, solve coordinates, compare with archives, and score discovery potential.
          </p>

          {/* Quick action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="glass-interactive p-4 text-left group"
            >
              <Upload className="w-5 h-5 text-nebula-400 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-medium text-white/80 mb-1">Upload Image</h3>
              <p className="text-xs text-white/35 leading-relaxed">
                Analyze a telescope capture through the full discovery pipeline
              </p>
            </button>

            <button
              onClick={() => setMessage("What types of galaxies exist and how are they classified?")}
              className="glass-interactive p-4 text-left group"
            >
              <Sparkles className="w-5 h-5 text-cosmic-400 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-medium text-white/80 mb-1">Ask AstroSage</h3>
              <p className="text-xs text-white/35 leading-relaxed">
                Chat about astrophysics with a domain-specialized AI
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.06] bg-void-950/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Image preview */}
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="h-20 rounded-lg border border-white/10 object-cover"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          )}

          {/* Drop zone + input */}
          <div
            className={clsx(
              "flex items-end gap-3 p-3 rounded-2xl border transition-all duration-200",
              isDragging
                ? "border-nebula-500/50 bg-nebula-600/10"
                : "border-white/[0.08] bg-white/[0.02]"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-nebula-400 hover:border-nebula-500/30 hover:bg-nebula-600/10 transition-all"
            >
              <ImagePlus className="w-4 h-4" />
            </button>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you see, ask a question, or paste an image..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none resize-none min-h-[36px] max-h-32 py-2 font-body"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  // TODO: Session 1 — handle submit
                }
              }}
            />

            <button
              className={clsx(
                "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                message.trim() || imagePreview
                  ? "bg-nebula-600 text-white hover:bg-nebula-500 shadow-lg shadow-nebula-600/25"
                  : "bg-white/[0.04] text-white/20 cursor-not-allowed"
              )}
              disabled={!message.trim() && !imagePreview}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-white/20 mt-2 text-center font-mono">
            Kimi K2 · AstroSage · Astrometry.net · SkyView · SIMBAD
          </p>
        </div>
      </div>
    </div>
  );
}
