import { useState } from "react";
import { Crosshair, Sparkles, ExternalLink } from "lucide-react";
import clsx from "clsx";
import type { GalaxyFeedItem } from "@/services/api";

interface GalaxyCardProps {
  galaxy: GalaxyFeedItem;
  onInvestigate: (galaxy: GalaxyFeedItem) => void;
}

const TYPE_COLORS: Record<string, string> = {
  Spiral: "bg-nebula-600/20 text-nebula-300 border-nebula-500/20",
  Elliptical: "bg-cosmic-600/20 text-cosmic-300 border-cosmic-500/20",
  Irregular: "bg-stellar-500/20 text-stellar-300 border-stellar-500/20",
  Lenticular: "bg-amber-500/20 text-amber-300 border-amber-500/20",
  Peculiar: "bg-aurora-500/20 text-aurora-300 border-aurora-500/20",
};

export function GalaxyCard({ galaxy, onInvestigate }: GalaxyCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const typeClass = galaxy.classification
    ? TYPE_COLORS[galaxy.classification] || "bg-white/10 text-white/50 border-white/10"
    : null;

  return (
    <div className="group glass-interactive overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-square bg-black/60 overflow-hidden">
        {!imgError ? (
          <img
            src={galaxy.imageUrl}
            alt={galaxy.classification || "Galaxy"}
            className={clsx(
              "w-full h-full object-cover transition-all duration-500",
              imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            )}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white/10" />
          </div>
        )}

        {/* Classification badge */}
        {galaxy.classification && typeClass && (
          <div className={clsx(
            "absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-medium border backdrop-blur-sm",
            typeClass
          )}>
            {galaxy.classification}
          </div>
        )}

        {/* Source indicator */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/30 bg-black/40 backdrop-blur-sm">
          {galaxy.source === "ledger" ? "YOUR" : "SDSS"}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void-950/90 via-void-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3">
          <button
            onClick={() => onInvestigate(galaxy)}
            className="w-full py-2 rounded-xl bg-nebula-600/80 hover:bg-nebula-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 backdrop-blur-sm transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Investigate
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-white/25 font-mono">
          <Crosshair className="w-3 h-3" />
          <span>{galaxy.ra.toFixed(3)}°</span>
          <span>{galaxy.dec >= 0 ? "+" : ""}{galaxy.dec.toFixed(3)}°</span>
        </div>

        {galaxy.redshift != null && (
          <p className="text-[10px] text-white/20 mt-1">z = {galaxy.redshift.toFixed(4)}</p>
        )}
      </div>
    </div>
  );
}
