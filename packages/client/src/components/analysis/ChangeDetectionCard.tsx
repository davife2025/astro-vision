import { GitCompare, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import clsx from "clsx";

interface ChangeDetectionCardProps {
  data: {
    changeScore: number;
    signalToNoise: number;
    significantRegions: number;
    isSignificant: boolean;
    description: string;
  };
}

export function ChangeDetectionCard({ data }: ChangeDetectionCardProps) {
  const snrLevel = data.signalToNoise >= 10
    ? "strong"
    : data.signalToNoise >= 5
      ? "moderate"
      : data.signalToNoise >= 3
        ? "marginal"
        : "none";

  const config = {
    strong: {
      icon: Zap,
      color: "text-aurora-400",
      bg: "bg-aurora-500/10 border-aurora-500/20",
      barColor: "bg-aurora-400",
      label: "Strong Signal",
    },
    moderate: {
      icon: AlertTriangle,
      color: "text-stellar-400",
      bg: "bg-stellar-500/10 border-stellar-500/20",
      barColor: "bg-stellar-400",
      label: "Moderate Signal",
    },
    marginal: {
      icon: GitCompare,
      color: "text-nebula-400",
      bg: "bg-nebula-500/10 border-nebula-500/20",
      barColor: "bg-nebula-400",
      label: "Marginal Signal",
    },
    none: {
      icon: CheckCircle2,
      color: "text-white/40",
      bg: "bg-white/[0.03] border-white/[0.06]",
      barColor: "bg-white/20",
      label: "No Significant Changes",
    },
  };

  const c = config[snrLevel];
  const Icon = c.icon;

  return (
    <div className={clsx("rounded-xl border p-4 animate-slide-up", c.bg)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Icon className={clsx("w-4 h-4", c.color)} />
        <span className={clsx("text-xs font-medium", c.color)}>{c.label}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="glass-subtle p-2 rounded-lg text-center">
          <p className="text-lg font-display font-semibold text-white/80">
            {data.signalToNoise.toFixed(1)}
          </p>
          <p className="text-[9px] text-white/30 uppercase tracking-wider">SNR</p>
        </div>
        <div className="glass-subtle p-2 rounded-lg text-center">
          <p className="text-lg font-display font-semibold text-white/80">
            {data.significantRegions}
          </p>
          <p className="text-[9px] text-white/30 uppercase tracking-wider">Regions</p>
        </div>
        <div className="glass-subtle p-2 rounded-lg text-center">
          <p className="text-lg font-display font-semibold text-white/80">
            {data.changeScore > 1000
              ? `${(data.changeScore / 1000).toFixed(1)}k`
              : data.changeScore}
          </p>
          <p className="text-[9px] text-white/30 uppercase tracking-wider">Pixels</p>
        </div>
      </div>

      {/* SNR bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/25">Signal-to-Noise Ratio</span>
          <span className="text-[10px] font-mono text-white/30">{data.signalToNoise.toFixed(2)}σ</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all duration-700", c.barColor)}
            style={{ width: `${Math.min(data.signalToNoise * 10, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-white/15">0</span>
          <span className="text-[9px] text-white/15">3σ</span>
          <span className="text-[9px] text-white/15">5σ</span>
          <span className="text-[9px] text-white/15">10σ</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-white/45 leading-relaxed">{data.description}</p>
    </div>
  );
}
