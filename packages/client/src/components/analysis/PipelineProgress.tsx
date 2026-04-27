import clsx from "clsx";
import {
  Eye,
  Crosshair,
  Search,
  GitCompare,
  Brain,
  Gauge,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export interface PipelineStage {
  key: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  message?: string;
}

const STAGE_ICONS: Record<string, React.ComponentType<any>> = {
  triage: Eye,
  morphology: Eye,
  plate_solving: Crosshair,
  catalog_query: Search,
  archival_fetch: Search,
  change_detection: GitCompare,
  visual_comparison: GitCompare,
  synthesis: Brain,
  scoring: Gauge,
  complete: CheckCircle2,
  error: AlertCircle,
};

interface PipelineProgressProps {
  stages: PipelineStage[];
  progress: number;
}

export function PipelineProgress({ stages, progress }: PipelineProgressProps) {
  if (stages.length === 0) return null;

  return (
    <div className="glass p-4 animate-slide-up">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-nebula-600 to-cosmic-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-mono text-white/30 w-8 text-right">
          {progress}%
        </span>
      </div>

      {/* Stage list */}
      <div className="space-y-1.5">
        {stages.map((stage) => {
          const Icon = STAGE_ICONS[stage.key] || Eye;
          return (
            <div
              key={stage.key}
              className={clsx(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-300",
                stage.status === "active" && "bg-nebula-600/10",
                stage.status === "done" && "opacity-50",
                stage.status === "error" && "bg-red-500/10"
              )}
            >
              {stage.status === "active" ? (
                <Loader2 className="w-3.5 h-3.5 text-nebula-400 animate-spin" />
              ) : stage.status === "done" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-aurora-400/70" />
              ) : stage.status === "error" ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Icon className="w-3.5 h-3.5 text-white/15" />
              )}

              <span
                className={clsx(
                  "text-xs",
                  stage.status === "active" && "text-white/70",
                  stage.status === "done" && "text-white/35",
                  stage.status === "pending" && "text-white/20",
                  stage.status === "error" && "text-red-400/80"
                )}
              >
                {stage.message || stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
