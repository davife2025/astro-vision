import { Brain, Lightbulb, ArrowRight, BookOpen } from "lucide-react";

interface SynthesisCardProps {
  data: {
    summary: string;
    classification: string;
    hypotheses: string[];
    followUpRecommendations: string[];
    relevantPapers: string[];
    discoveryPotential: string;
  };
}

export function SynthesisCard({ data }: SynthesisCardProps) {
  if (!data) return null;

  return (
    <div className="glass p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-nebula-600/20 border border-nebula-500/20 flex items-center justify-center">
          <Brain className="w-4 h-4 text-nebula-400" />
        </div>
        <div>
          <h3 className="text-xs font-display font-semibold text-white/80">AstroSage Synthesis</h3>
          <p className="text-[10px] text-white/30 font-mono">AI-generated analysis summary</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-white/70 leading-relaxed mb-4">
        {data.summary}
      </p>

      {/* Classification */}
      <div className="glass-subtle p-3 rounded-xl mb-4">
        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1 font-mono">
          Final Classification
        </p>
        <p className="text-sm text-white/80 font-medium">{data.classification}</p>
      </div>

      {/* Hypotheses */}
      {data.hypotheses?.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3 h-3 text-stellar-400" />
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
              Hypotheses
            </p>
          </div>
          <div className="space-y-1.5">
            {data.hypotheses.map((h, i) => (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="text-[10px] text-stellar-400/60 mt-0.5 shrink-0">
                  H{i + 1}
                </span>
                <p className="text-xs text-white/55 leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up recommendations */}
      {data.followUpRecommendations?.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowRight className="w-3 h-3 text-aurora-400" />
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
              Recommended Follow-Up
            </p>
          </div>
          <div className="space-y-1.5">
            {data.followUpRecommendations.map((r, i) => (
              <p key={i} className="text-xs text-white/50 leading-relaxed pl-1 flex items-start gap-2">
                <span className="text-white/15 mt-px">•</span>
                {r}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Relevant papers */}
      {data.relevantPapers?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3 h-3 text-cosmic-400" />
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
              Related Research
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.relevantPapers.map((p, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-lg bg-cosmic-500/10 border border-cosmic-500/15 text-[10px] text-cosmic-300/60"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
