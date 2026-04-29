import { useState } from "react";
import clsx from "clsx";

interface ArchivalImage {
  url: string;
  survey: string;
  wavelength: string;
}

interface MultiWavelengthViewerProps {
  images: ArchivalImage[];
}

const WAVELENGTH_COLORS: Record<string, string> = {
  optical: "text-nebula-300 bg-nebula-600/15 border-nebula-500/20",
  infrared: "text-red-300 bg-red-600/15 border-red-500/20",
  ultraviolet: "text-violet-300 bg-violet-600/15 border-violet-500/20",
  radio: "text-amber-300 bg-amber-600/15 border-amber-500/20",
};

export function MultiWavelengthViewer({ images }: MultiWavelengthViewerProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!images || images.length === 0) return null;

  // Group by wavelength
  const wavelengths = [...new Set(images.map((i) => i.wavelength))];

  return (
    <div className="glass p-4 animate-slide-up">
      <h3 className="text-xs font-display font-semibold text-white/80 mb-3">
        Multi-Wavelength View
      </h3>

      {/* Wavelength filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(i)}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all",
              selectedIdx === i
                ? WAVELENGTH_COLORS[img.wavelength] || "text-white/60 bg-white/10 border-white/20"
                : "text-white/30 bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05]"
            )}
          >
            {img.survey}
          </button>
        ))}
      </div>

      {/* Image display */}
      <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-black">
        <img
          src={images[selectedIdx].url}
          alt={`${images[selectedIdx].survey} view`}
          className="w-full h-auto object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23111' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23444' font-size='14'%3ESurvey data unavailable%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>

      <p className="text-[10px] text-white/20 mt-2 text-center font-mono">
        {images[selectedIdx].wavelength} · {images[selectedIdx].survey} · via SkyView
      </p>
    </div>
  );
}
