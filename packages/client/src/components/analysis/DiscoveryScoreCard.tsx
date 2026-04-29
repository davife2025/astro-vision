import clsx from "clsx";
import { Gauge, TrendingUp } from "lucide-react";

interface DiscoveryScoreCardProps {
  data: {
    total: number;
    morphologyAnomaly: number;
    catalogStatus: number;
    changeSignificance: number;
    aiAssessment: number;
    tier: string;
  };
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  routine: {
    label: "Routine Observation",
    color: "text-white/40",
    bg: "from-white/5 to-white/[0.02]",
  },
  interesting: {
    label: "Interesting",
    color: "text-nebula-300",
    bg: "from-nebula-600/15 to-nebula-600/5",
  },
  notable: {
    label: "Notable Finding",
    color: "text-stellar-300",
    bg: "from-stellar-500/15 to-stellar-500/5",
  },
  significant: {
    label: "Significant",
    color: "text-cosmic-300",
    bg: "from-cosmic-500/15 to-cosmic-500/5",
  },
  candidate_discovery: {
    label: "Candidate Discovery",
    color: "text-aurora-300",
    bg: "from-aurora-500/15 to-aurora-500/5",
  },
};

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-white/30 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-nebula-500 to-cosmic-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-white/30 w-8 text-right">
        {value}/{max}
      </span>
    </div>
  );
}

export function DiscoveryScoreCard({ data }: DiscoveryScoreCardProps) {
  if (!data) return null;

  const tierConfig = TIER_CONFIG[data.tier] || TIER_CONFIG.routine;
  const isDiscovery = data.tier === "candidate_discovery";

  return (
    <div
      className={clsx(
        "rounded-2xl border p-5 animate-slide-up bg-gradient-to-br",
        tierConfig.bg,
        isDiscovery
          ? "border-aurora-500/30 glow-green"
          : "border-white/[0.06]"
      )}
    >
      {/* Score header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge className={clsx("w-5 h-5", tierConfig.color)} />
          <div>
            <h3 className="text-xs font-display font-semibold text-white/80">
              Discovery Score
            </h3>
            <p className={clsx("text-[10px] font-medium", tierConfig.color)}>
              {tierConfig.label}
            </p>
          </div>
        </div>

        {/* Big score number */}
        <div className="text-right">
          <p className={clsx("text-3xl font-display font-bold", tierConfig.color)}>
            {data.total}
          </p>
          <p className="text-[10px] text-white/20 font-mono">/100</p>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="space-y-2.5">
        <ScoreBar label="Morphology" value={data.morphologyAnomaly} max={25} />
        <ScoreBar label="Catalog status" value={data.catalogStatus} max={25} />
        <ScoreBar label="Change signal" value={data.changeSignificance} max={25} />
        <ScoreBar label="AI assessment" value={data.aiAssessment} max={25} />
      </div>

      {/* Discovery alert */}
      {isDiscovery && (
        <div className="mt-4 p-3 rounded-xl bg-aurora-500/10 border border-aurora-500/20 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-aurora-400 shrink-0" />
          <p className="text-xs text-aurora-300/80 leading-relaxed">
            This observation has high discovery potential. Consider submitting for peer verification
            and follow-up observation.
          </p>
        </div>
      )}
    </div>
  );
}
