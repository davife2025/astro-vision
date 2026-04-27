import clsx from "clsx";
import {
  Circle,
  Waves,
  Triangle,
  Hexagon,
  Minus,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

interface MorphologyCardProps {
  data: any;
}

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  Spiral: Waves,
  Elliptical: Circle,
  Irregular: Triangle,
  Lenticular: Hexagon,
  Peculiar: HelpCircle,
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700",
            pct >= 80 && "bg-aurora-400",
            pct >= 50 && pct < 80 && "bg-stellar-400",
            pct < 50 && "bg-red-400/70"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-white/40 w-8 text-right">{pct}%</span>
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined) return null;

  let display: string;
  if (typeof value === "boolean") display = value ? "Yes" : "No";
  else display = String(value);

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs text-white/70 font-medium">{display}</span>
    </div>
  );
}

export function MorphologyCard({ data }: MorphologyCardProps) {
  if (!data) return null;

  const Icon = TYPE_ICONS[data.classification] || HelpCircle;

  return (
    <div className="glass p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-cosmic-600/20 border border-cosmic-500/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-cosmic-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-display font-semibold text-white/90">
            {data.classification}
          </h3>
          <p className="text-xs text-white/40 flex items-center gap-1">
            {data.subType}
            {data.subType !== data.classification && (
              <>
                <ArrowRight className="w-3 h-3" />
                Hubble type
              </>
            )}
          </p>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <p className="text-[11px] text-white/30 mb-1.5 uppercase tracking-wider font-mono">
          Confidence
        </p>
        <ConfidenceBar value={data.confidence} />
      </div>

      {/* Features */}
      <div className="mb-4">
        <p className="text-[11px] text-white/30 mb-1.5 uppercase tracking-wider font-mono">
          Morphological Features
        </p>
        <div className="glass-subtle p-3 rounded-xl">
          <FeatureRow label="Bar structure" value={data.hasBar} />
          <FeatureRow label="Spiral arms" value={data.spiralArmCount} />
          <FeatureRow label="Arm tightness" value={data.armTightness} />
          <FeatureRow label="Central bulge" value={data.hasBulge} />
          <FeatureRow label="Bulge prominence" value={data.bulgeProminence} />
          <FeatureRow label="Edge-on" value={data.isEdgeOn} />
          <FeatureRow label="Tidal tails" value={data.hasTidalTails} />
          <FeatureRow label="Merging" value={data.isMerging} />
          <FeatureRow label="Asymmetry" value={data.asymmetry} />
          <FeatureRow label="HII regions" value={data.visibleHIIRegions} />
        </div>
      </div>

      {/* Notable features */}
      {data.notableFeatures?.length > 0 && (
        <div>
          <p className="text-[11px] text-white/30 mb-1.5 uppercase tracking-wider font-mono">
            Notable Features
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.notableFeatures.map((f: string, i: number) => (
              <span
                key={i}
                className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/50"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
