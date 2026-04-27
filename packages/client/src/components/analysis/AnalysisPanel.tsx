import { X, RotateCcw, Loader2 } from "lucide-react";
import type { AnalysisState } from "@/hooks/useAnalysis";
import { ImageViewer } from "./ImageViewer";
import { ImageQualityCard } from "./ImageQualityCard";
import { MorphologyCard } from "./MorphologyCard";
import { PipelineProgress, type PipelineStage } from "./PipelineProgress";

interface AnalysisPanelProps {
  state: AnalysisState;
  onClose: () => void;
  onRetry: () => void;
}

function buildStages(state: AnalysisState): PipelineStage[] {
  const stageOrder = [
    { key: "triage", label: "Image quality assessment" },
    { key: "morphology", label: "Morphological analysis" },
    { key: "plate_solving", label: "Coordinate solving" },
    { key: "catalog_query", label: "Catalog cross-reference" },
    { key: "archival_fetch", label: "Archival image retrieval" },
    { key: "change_detection", label: "Change detection" },
    { key: "synthesis", label: "AI synthesis" },
    { key: "scoring", label: "Discovery scoring" },
  ];

  return stageOrder.map((s) => {
    let status: PipelineStage["status"] = "pending";

    // Determine status based on current stage and available results
    const currentIdx = stageOrder.findIndex((x) => x.key === state.currentStage);
    const thisIdx = stageOrder.findIndex((x) => x.key === s.key);

    if (state.status === "error" && state.currentStage === s.key) {
      status = "error";
    } else if (thisIdx < currentIdx || state.status === "done") {
      status = "done";
    } else if (thisIdx === currentIdx && state.status === "running") {
      status = "active";
    }

    return {
      key: s.key,
      label: s.label,
      status,
      message: state.currentStage === s.key ? state.stageMessage : undefined,
    };
  });
}

export function AnalysisPanel({ state, onClose, onRetry }: AnalysisPanelProps) {
  const stages = buildStages(state);
  const isRunning = state.status === "running";

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 sm:p-6 overflow-y-auto">
      {/* Left: Image + annotations */}
      <div className="lg:w-1/2 shrink-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && <Loader2 className="w-4 h-4 text-nebula-400 animate-spin" />}
            <h2 className="font-display text-lg font-semibold text-white/90">
              {isRunning ? "Analyzing..." : "Analysis Results"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {state.status === "error" && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs text-nebula-400 hover:text-nebula-300 transition-colors px-3 py-1.5 rounded-lg bg-nebula-600/10 border border-nebula-500/20"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image viewer */}
        {state.imagePreview && (
          <ImageViewer
            src={state.imagePreview}
            annotations={state.annotations}
          />
        )}

        {/* Pipeline progress */}
        {isRunning && <PipelineProgress stages={stages} progress={state.progress} />}

        {/* Error message */}
        {state.error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400/80">{state.error}</p>
          </div>
        )}
      </div>

      {/* Right: Results cards */}
      <div className="lg:w-1/2 space-y-4 min-w-0">
        {/* Image quality */}
        {state.imageQuality && <ImageQualityCard data={state.imageQuality} />}

        {/* Morphology */}
        {state.morphology && <MorphologyCard data={state.morphology} />}

        {/* Placeholder for future cards */}
        {state.status === "done" && !state.coordinates && (
          <div className="glass-subtle p-4 text-center">
            <p className="text-xs text-white/25">
              Coordinate solving, archival comparison, and catalog matching will be available in Session 3–5
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
