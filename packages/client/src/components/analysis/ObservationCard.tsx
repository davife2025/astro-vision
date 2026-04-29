import clsx from "clsx";
import {
  Crosshair,
  Star,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import type { ObservationSummary } from "@/services/api";

interface ObservationCardProps {
  observation: ObservationSummary;
  onClick: () => void;
}

const TIER_CONFIG: Record<string, { label: string; class: string }> = {
  candidate_discovery: { label: "Candidate Discovery", class: "score-discovery" },
  significant: { label: "Significant", class: "score-significant" },
  notable: { label: "Notable", class: "score-notable" },
  interesting: { label: "Interesting", class: "score-interesting" },
  routine: { label: "Routine", class: "score-routine" },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ObservationCard({ observation, onClick }: ObservationCardProps) {
  const o = observation;
  const morphLabel = o.morphology?.classification || "Unknown";
  const subType = o.morphology?.subType || "";
  const tierCfg = TIER_CONFIG[o.discovery_tier] || TIER_CONFIG.routine;
  const summary = o.synthesis?.summary || o.user_question || "No description";

  return (
    <button
      onClick={onClick}
      className="glass-interactive w-full text-left p-4 flex gap-4 group"
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-20 h-20 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden">
        {o.image_url ? (
          <img src={o.image_url} alt="Observation" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Star className="w-6 h-6 text-white/10" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: classification + score */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-display font-medium text-white/80 truncate">
              {morphLabel}
              {subType && subType !== morphLabel && (
                <span className="text-white/30 font-normal"> · {subType}</span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={clsx("px-2 py-0.5 rounded-lg text-[10px] font-medium", tierCfg.class)}>
              {o.discovery_score}/100
            </span>
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs text-white/35 line-clamp-2 mb-2 leading-relaxed">
          {summary}
        </p>

        {/* Bottom row: metadata */}
        <div className="flex items-center gap-3 text-[10px] text-white/25">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(o.created_at)}
          </span>

          {o.ra != null && (
            <span className="flex items-center gap-1 font-mono">
              <Crosshair className="w-3 h-3" />
              {o.ra.toFixed(2)}° {o.dec_coord != null ? `${o.dec_coord > 0 ? "+" : ""}${o.dec_coord.toFixed(2)}°` : ""}
            </span>
          )}

          {o.is_uncatalogued && (
            <span className="flex items-center gap-1 text-stellar-400/60">
              <AlertCircle className="w-3 h-3" />
              Uncatalogued
            </span>
          )}

          <span className="text-white/15">Tier {o.tier}</span>
        </div>
      </div>

      {/* Arrow */}
      <div className="shrink-0 flex items-center">
        <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors" />
      </div>
    </button>
  );
}
