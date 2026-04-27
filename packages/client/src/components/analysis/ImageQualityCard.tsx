import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
} from "lucide-react";
import clsx from "clsx";

interface ImageQualityCardProps {
  data: any;
}

export function ImageQualityCard({ data }: ImageQualityCardProps) {
  if (!data) return null;

  const qualityConfig = {
    good: {
      icon: CheckCircle2,
      color: "text-aurora-400",
      bg: "bg-aurora-500/10 border-aurora-500/20",
      label: "Good Quality",
    },
    moderate: {
      icon: AlertTriangle,
      color: "text-stellar-400",
      bg: "bg-stellar-500/10 border-stellar-500/20",
      label: "Moderate Quality",
    },
    poor: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
      label: "Poor Quality",
    },
  };

  const q = qualityConfig[data.overallQuality as keyof typeof qualityConfig] || qualityConfig.moderate;
  const Icon = q.icon;

  return (
    <div className={clsx("rounded-xl border p-3 animate-slide-up", q.bg)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx("w-4 h-4", q.color)} />
        <span className={clsx("text-xs font-medium", q.color)}>{q.label}</span>

        {data.hasEnoughStarsForPlateSolving ? (
          <span className="ml-auto text-[10px] text-aurora-400/70 bg-aurora-500/10 px-2 py-0.5 rounded-full">
            Plate-solvable
          </span>
        ) : (
          <span className="ml-auto text-[10px] text-stellar-400/70 bg-stellar-500/10 px-2 py-0.5 rounded-full">
            Few stars
          </span>
        )}
      </div>

      {/* Issues */}
      {data.issues?.length > 0 && (
        <div className="space-y-1">
          {data.issues.map((issue: string, i: number) => (
            <p key={i} className="text-[11px] text-white/35 flex items-start gap-1.5">
              <span className="text-white/15 mt-px">•</span>
              {issue}
            </p>
          ))}
        </div>
      )}

      {data.recommendation && (
        <p className="text-[11px] text-white/40 mt-2 pt-2 border-t border-white/[0.06]">
          {data.recommendation}
        </p>
      )}
    </div>
  );
}
