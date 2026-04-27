import { useState } from "react";
import clsx from "clsx";

interface Annotation {
  label: string;
  description: string;
  x_percent: number;
  y_percent: number;
  radius_percent: number;
  type: string;
}

interface ImageViewerProps {
  src: string;
  annotations?: Annotation[];
  alt?: string;
}

const TYPE_COLORS: Record<string, string> = {
  core: "border-stellar-400/60 bg-stellar-400/10",
  arm: "border-cosmic-400/60 bg-cosmic-400/10",
  bulge: "border-amber-400/60 bg-amber-400/10",
  companion: "border-aurora-400/60 bg-aurora-400/10",
  star: "border-white/30 bg-white/5",
  artifact: "border-red-400/40 bg-red-400/5",
  tidal: "border-nebula-400/60 bg-nebula-400/10",
  hii_region: "border-pink-400/60 bg-pink-400/10",
  dust_lane: "border-orange-400/60 bg-orange-400/10",
  other: "border-white/20 bg-white/5",
};

export function ImageViewer({ src, annotations = [], alt = "Celestial image" }: ImageViewerProps) {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<number | null>(null);

  return (
    <div className="relative group">
      {/* Image */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08]">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-contain bg-black"
        />

        {/* Annotation overlays */}
        {showAnnotations &&
          annotations.map((ann, i) => (
            <div
              key={i}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${ann.x_percent}%`,
                top: `${ann.y_percent}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseEnter={() => setHoveredAnnotation(i)}
              onMouseLeave={() => setHoveredAnnotation(null)}
            >
              {/* Ring */}
              <div
                className={clsx(
                  "rounded-full border-2 transition-all duration-300",
                  TYPE_COLORS[ann.type] || TYPE_COLORS.other,
                  hoveredAnnotation === i ? "scale-110 opacity-100" : "opacity-60"
                )}
                style={{
                  width: `${Math.max(ann.radius_percent * 3, 16)}px`,
                  height: `${Math.max(ann.radius_percent * 3, 16)}px`,
                }}
              />

              {/* Label */}
              <div
                className={clsx(
                  "absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap transition-all duration-200",
                  hoveredAnnotation === i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}
              >
                <div className="bg-void-900/95 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl">
                  <p className="text-[11px] font-medium text-white/80">{ann.label}</p>
                  <p className="text-[10px] text-white/40">{ann.description}</p>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Toggle annotations */}
      {annotations.length > 0 && (
        <button
          onClick={() => setShowAnnotations(!showAnnotations)}
          className={clsx(
            "absolute top-2 right-2 text-[10px] px-2 py-1 rounded-lg backdrop-blur-sm transition-all",
            showAnnotations
              ? "bg-nebula-600/30 text-nebula-300 border border-nebula-500/30"
              : "bg-black/40 text-white/40 border border-white/10"
          )}
        >
          {showAnnotations ? "Hide labels" : "Show labels"}
        </button>
      )}
    </div>
  );
}
