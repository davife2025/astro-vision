import { useState, useEffect } from "react";
import { Shield, X, Send, Loader2 } from "lucide-react";
import clsx from "clsx";
import { submitVerification, getVerifications } from "@/services/api";

interface VerifyModalProps {
  observationId: string;
  currentUserId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function VerifyModal({ observationId, currentUserId, onClose, onSubmitted }: VerifyModalProps) {
  const [confidence, setConfidence] = useState(50);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<any[]>([]);
  const [avgConf, setAvgConf] = useState<number | null>(null);

  useEffect(() => {
    getVerifications(observationId).then((res) => {
      setExisting(res.verifications || []);
      setAvgConf(res.avgConfidence);
    }).catch(() => {});
  }, [observationId]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitVerification({
        observationId,
        userId: currentUserId,
        confidence,
        notes: notes.trim() || undefined,
      });
      onSubmitted();
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const confidenceLabel =
    confidence >= 80 ? "High confidence" :
    confidence >= 50 ? "Moderate confidence" :
    confidence >= 25 ? "Low confidence" :
    "Very low confidence";

  const confidenceColor =
    confidence >= 80 ? "text-aurora-400" :
    confidence >= 50 ? "text-nebula-400" :
    confidence >= 25 ? "text-stellar-400" :
    "text-red-400/70";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass p-6 w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-aurora-400" />
            <h3 className="font-display text-base font-semibold text-white">Peer Verification</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing verifications */}
        {existing.length > 0 && (
          <div className="glass-subtle p-3 rounded-xl mb-4">
            <p className="text-[11px] text-white/30 mb-1.5">
              {existing.length} peer review{existing.length > 1 ? "s" : ""} · Average confidence: {avgConf}%
            </p>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-aurora-400/60 transition-all"
                style={{ width: `${avgConf}%` }}
              />
            </div>
          </div>
        )}

        {/* Confidence slider */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-white/40">Your confidence in this discovery</label>
            <span className={clsx("text-sm font-mono font-semibold", confidenceColor)}>
              {confidence}%
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={confidence}
            onChange={(e) => setConfidence(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-white/[0.06] cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-nebula-500 [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
          />

          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-white/15">Not confident</span>
            <span className={clsx("text-[10px]", confidenceColor)}>{confidenceLabel}</span>
            <span className="text-[10px] text-white/15">Very confident</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="text-xs text-white/40 mb-1.5 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations, concerns, or supporting evidence..."
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none resize-none focus:border-white/[0.12]"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-aurora-600/80 hover:bg-aurora-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Submit Verification
            </>
          )}
        </button>
      </div>
    </div>
  );
}
