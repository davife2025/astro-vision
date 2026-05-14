import { X, RotateCcw, Loader2, Sparkles, Crosshair, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import clsx from "clsx";
import type { AnalysisState } from "@/hooks/useAnalysis";

interface AnalysisPanelProps {
  state: AnalysisState;
  onClose: () => void;
  onRetry: () => void;
}

function formatRA(ra: number): string {
  const hours = ra / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${h}h ${m}m ${s.toFixed(2)}s`;
}
function formatDec(dec: number): string {
  const sign = dec >= 0 ? "+" : "-";
  const a = Math.abs(dec);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = ((a - d) * 60 - m) * 60;
  return `${sign}${d}° ${m}' ${s.toFixed(1)}"`;
}

export function AnalysisPanel({ state, onClose, onRetry }: AnalysisPanelProps) {
  const isRunning = state.status === "running";

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 sm:p-6 overflow-y-auto">
      {/* LEFT: Image + Historical Comparison */}
      <div className="lg:w-1/2 shrink-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && <Loader2 className="w-4 h-4 text-nebula-400 animate-spin" />}
            <h2 className="font-display text-lg font-semibold text-white/90">
              {isRunning ? "Analyzing..." : "Discovery Analysis"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {state.status === "error" && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs text-nebula-400 hover:text-nebula-300 px-3 py-1.5 rounded-lg bg-nebula-600/10 border border-nebula-500/20"
              >
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User's image */}
        {state.imagePreview && (
          <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-1.5">Your Observation</p>
            <img
              src={state.imagePreview}
              alt="Your observation"
              className="w-full rounded-xl border border-white/[0.08] object-contain bg-black"
            />
          </div>
        )}

        {/* Historical comparison */}
        {state.historicalImage && (
          <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-1.5">Historical Archive (SkyView)</p>
            <img
              src={state.historicalImage}
              alt="Historical archive"
              className="w-full rounded-xl border border-white/[0.08] object-contain bg-black"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}

        {/* Pipeline progress */}
        {isRunning && (
          <div className="glass p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-nebula-600 to-cosmic-500 transition-all duration-500"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-white/30">{state.progress}%</span>
            </div>
            <p className="text-xs text-white/50">{state.stageMessage}</p>
          </div>
        )}

        {state.error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400/80">{state.error}</p>
          </div>
        )}
      </div>

      {/* RIGHT: Results */}
      <div className="lg:w-1/2 space-y-4 min-w-0">
        {/* Identification */}
        {state.classification && (
          <div className="glass p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cosmic-400" />
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Identification</span>
            </div>
            <h3 className="font-display text-xl font-semibold text-white mb-2">{state.classification}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{state.description}</p>
          </div>
        )}

        {/* Coordinates */}
        {state.coordinates && (
          <div className="glass p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-aurora-400" />
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Sky Coordinates</span>
              </div>
              <a
                href={`https://aladin.cds.unistra.fr/AladinLite/?target=${state.coordinates.ra}+${state.coordinates.dec}&fov=0.15`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-nebula-400 hover:text-nebula-300"
              >
                Aladin <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-subtle p-2.5 rounded-lg">
                <p className="text-[10px] text-white/30 mb-1">Right Ascension</p>
                <p className="text-xs text-white/80 font-mono">{formatRA(state.coordinates.ra)}</p>
                <p className="text-[10px] text-white/30 font-mono">{state.coordinates.ra.toFixed(4)}°</p>
              </div>
              <div className="glass-subtle p-2.5 rounded-lg">
                <p className="text-[10px] text-white/30 mb-1">Declination</p>
                <p className="text-xs text-white/80 font-mono">{formatDec(state.coordinates.dec)}</p>
                <p className="text-[10px] text-white/30 font-mono">{state.coordinates.dec.toFixed(4)}°</p>
              </div>
            </div>
          </div>
        )}

        {state.astrometryError && (
          <div className="rounded-xl bg-stellar-500/10 border border-stellar-500/20 p-3">
            <p className="text-xs text-stellar-300/80">
              <strong>Coordinate solving unavailable:</strong> {state.astrometryError}
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              This usually means the image does not contain enough background stars for Astrometry.net to plate-solve.
              The identification above is still valid.
            </p>
          </div>
        )}

        {/* Discovery / anomaly result */}
        {state.discovery && state.coordinates && (
          <div className={clsx(
            "rounded-xl p-4 border animate-slide-up",
            state.isAnomaly
              ? "bg-aurora-500/10 border-aurora-500/30"
              : "bg-white/[0.03] border-white/[0.08]"
          )}>
            <div className="flex items-start gap-3">
              {state.isAnomaly ? (
                <AlertTriangle className="w-5 h-5 text-aurora-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className={clsx(
                  "font-display text-sm font-semibold mb-1",
                  state.isAnomaly ? "text-aurora-300" : "text-white/60"
                )}>
                  {state.isAnomaly ? "Possible Discovery" : "Region Stable"}
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">{state.discovery}</p>
                {state.diffCount !== null && (
                  <p className="text-[11px] text-white/30 font-mono mt-2">
                    Pixel variance count: {state.diffCount}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VLM Visual comparison */}
        {state.visualComparison && (
          <div className="glass p-4 animate-slide-up">
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-2">
              Visual Comparison Analysis
            </p>
            <p className="text-xs text-white/60 leading-relaxed">{state.visualComparison}</p>
          </div>
        )}
      </div>
    </div>
  );
}
