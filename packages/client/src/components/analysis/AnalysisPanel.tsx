import { X, RotateCcw, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { AnalysisState } from "@/hooks/useAnalysis";
import { ImageViewer } from "./ImageViewer";
import { TripletViewer } from "./TripletViewer";
import { ImageQualityCard } from "./ImageQualityCard";
import { MorphologyCard } from "./MorphologyCard";
import { CoordinatesCard } from "./CoordinatesCard";
import { ChangeDetectionCard } from "./ChangeDetectionCard";
import { CatalogCard } from "./CatalogCard";
import { SynthesisCard } from "./SynthesisCard";
import { DiscoveryScoreCard } from "./DiscoveryScoreCard";
import { MultiWavelengthViewer } from "./MultiWavelengthViewer";
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
    { key: "archival_fetch", label: "Archival image retrieval" },
    { key: "change_detection", label: "Change detection" },
    { key: "catalog_query", label: "Catalog cross-reference" },
    { key: "synthesis", label: "AstroSage synthesis" },
    { key: "scoring", label: "Discovery scoring" },
  ];

  const currentIdx = stageOrder.findIndex((x) => x.key === state.currentStage);

  return stageOrder.map((s, thisIdx) => {
    let status: PipelineStage["status"] = "pending";
    if (state.status === "error" && state.currentStage === s.key) {
      status = "error";
    } else if (state.status === "done" || thisIdx < currentIdx) {
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

const TIER_LABELS: Record<number, { label: string; class: string }> = {
  1: { label: "Full Analysis", class: "text-aurora-400 bg-aurora-500/10 border-aurora-500/20" },
  2: { label: "Partial Analysis", class: "text-stellar-400 bg-stellar-500/10 border-stellar-500/20" },
  3: { label: "VLM Only", class: "text-white/40 bg-white/[0.04] border-white/[0.06]" },
};

export function AnalysisPanel({ state, onClose, onRetry }: AnalysisPanelProps) {
  const stages = buildStages(state);
  const isRunning = state.status === "running";
  const hasReference = !!state.referenceImage;
  const hasDiff = !!state.diffImage;
  const tierInfo = TIER_LABELS[state.tier] || TIER_LABELS[3];

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 sm:p-6 overflow-y-auto">
      {/* ── Left column: Images + progress ───────────────────────── */}
      <div className="lg:w-1/2 shrink-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && <Loader2 className="w-4 h-4 text-nebula-400 animate-spin" />}
            <h2 className="font-display text-lg font-semibold text-white/90">
              {isRunning ? "Analyzing..." : "Analysis Results"}
            </h2>
            {state.status === "done" && (
              <span className={clsx("px-2 py-0.5 rounded-lg text-[10px] font-medium border", tierInfo.class)}>
                {tierInfo.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {state.status === "error" && (
              <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-nebula-400 hover:text-nebula-300 transition-colors px-3 py-1.5 rounded-lg bg-nebula-600/10 border border-nebula-500/20">
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Triplet or single image viewer */}
        {state.imagePreview && (hasReference || hasDiff) ? (
          <TripletViewer
            newImageSrc={state.imagePreview}
            referenceImageBase64={state.referenceImage?.base64 || null}
            diffImageBase64={state.diffImage?.base64 || null}
            referenceSurvey={state.referenceImage?.survey}
          />
        ) : state.imagePreview ? (
          <ImageViewer src={state.imagePreview} annotations={state.annotations} />
        ) : null}

        {/* Pipeline progress */}
        {isRunning && <PipelineProgress stages={stages} progress={state.progress} />}

        {/* Error */}
        {state.error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400/80">{state.error}</p>
          </div>
        )}

        {/* Multi-wavelength viewer */}
        {state.archivalImages.length > 0 && (
          <MultiWavelengthViewer images={state.archivalImages} />
        )}
      </div>

      {/* ── Right column: Result cards ───────────────────────────── */}
      <div className="lg:w-1/2 space-y-4 min-w-0">
        {/* Discovery score — most prominent, shown first when available */}
        {state.discoveryScore && <DiscoveryScoreCard data={state.discoveryScore} />}

        {/* Image quality */}
        {state.imageQuality && <ImageQualityCard data={state.imageQuality} />}

        {/* Morphology */}
        {state.morphology && <MorphologyCard data={state.morphology} />}

        {/* Coordinates */}
        {state.coordinates && <CoordinatesCard data={state.coordinates} />}

        {/* Change detection */}
        {state.changeDetection && <ChangeDetectionCard data={state.changeDetection} />}

        {/* Catalog cross-reference */}
        {(state.catalogMatches.length > 0 || (state.coordinates && state.status === "done")) && (
          <CatalogCard matches={state.catalogMatches} />
        )}

        {/* AstroSage synthesis */}
        {state.synthesis && <SynthesisCard data={state.synthesis} />}
      </div>
    </div>
  );
}
