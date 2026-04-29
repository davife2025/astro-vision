import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Telescope,
  AlertCircle,
  Star,
  Loader2,
  Filter,
  ArrowLeft,
  Trash2,
  Download,
} from "lucide-react";
import clsx from "clsx";
import {
  getObservations,
  getObservation,
  getObservationStats,
  deleteObservation,
  type ObservationSummary,
  type ObservationDetail,
  type ObservationStats,
} from "@/services/api";
import { ObservationCard } from "@/components/analysis/ObservationCard";
import { MorphologyCard } from "@/components/analysis/MorphologyCard";
import { CoordinatesCard } from "@/components/analysis/CoordinatesCard";
import { ChangeDetectionCard } from "@/components/analysis/ChangeDetectionCard";
import { CatalogCard } from "@/components/analysis/CatalogCard";
import { SynthesisCard } from "@/components/analysis/SynthesisCard";
import { DiscoveryScoreCard } from "@/components/analysis/DiscoveryScoreCard";

type View = "list" | "detail";

export default function ObservatoryPage() {
  const [view, setView] = useState<View>("list");
  const [observations, setObservations] = useState<ObservationSummary[]>([]);
  const [stats, setStats] = useState<ObservationStats | null>(null);
  const [selected, setSelected] = useState<ObservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "notable" | "uncatalogued">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const minScore = filter === "notable" ? 40 : undefined;
      const [obsRes, statsRes] = await Promise.all([
        getObservations({ limit: 50, minScore }),
        getObservationStats(),
      ]);
      let obs = obsRes.observations || [];
      if (filter === "uncatalogued") {
        obs = obs.filter((o) => o.is_uncatalogued);
      }
      setObservations(obs);
      if (statsRes.success) setStats(statsRes.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectObservation = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await getObservation(id);
      if (res.success) {
        setSelected(res.observation);
        setView("detail");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this observation? This cannot be undone.")) return;
    try {
      await deleteObservation(id);
      setView("list");
      setSelected(null);
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleExportJSON = () => {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `observation-${selected.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Detail view ────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const o = selected;
    const coords = o.ra != null && o.dec_coord != null
      ? { ra: o.ra, dec: o.dec_coord, fieldWidth: o.field_width ?? undefined, fieldHeight: o.field_height ?? undefined, orientation: o.orientation ?? undefined, pixscale: o.pixscale ?? undefined }
      : null;

    return (
      <div className="p-4 sm:p-6 overflow-y-auto h-full">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => { setView("list"); setSelected(null); }}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Observatory
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
              >
                <Download className="w-3 h-3" /> Export JSON
              </button>
              <button
                onClick={() => handleDelete(o.id)}
                className="flex items-center gap-1.5 text-xs text-red-400/50 hover:text-red-400/80 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>

          {/* Observation header */}
          <div className="flex items-start gap-5 mb-6">
            {o.image_url && (
              <img
                src={o.image_url}
                alt="Observation"
                className="w-28 h-28 rounded-2xl object-cover border border-white/[0.08] bg-black"
              />
            )}
            <div>
              <h1 className="font-display text-xl font-semibold text-white mb-1">
                {o.morphology?.classification || "Unknown Object"}
                {o.morphology?.subType && (
                  <span className="text-white/30 font-normal text-base ml-2">{o.morphology.subType}</span>
                )}
              </h1>
              <p className="text-sm text-white/35 mb-2 max-w-xl leading-relaxed">
                {o.synthesis?.summary || o.user_question || "No description available"}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-white/25">
                <span>{new Date(o.created_at).toLocaleString()}</span>
                <span>Pipeline v{o.pipeline_version}</span>
                <span>Tier {o.tier}</span>
              </div>
            </div>
          </div>

          {/* Result cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {o.discovery_score_breakdown && <DiscoveryScoreCard data={o.discovery_score_breakdown} />}
            {o.morphology && <MorphologyCard data={o.morphology} />}
            {coords && <CoordinatesCard data={coords} />}
            {o.change_detection && <ChangeDetectionCard data={o.change_detection} />}
            {(o.catalog_matches?.length > 0 || coords) && (
              <CatalogCard matches={o.catalog_matches || []} />
            )}
            {o.synthesis && <SynthesisCard data={o.synthesis} />}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Observatory</h1>
            <p className="text-sm text-white/35 mt-1">
              Your observation history and discovery reports
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-subtle p-3.5 text-center">
              <p className="text-2xl font-display font-semibold text-white/80">{stats.totalObservations}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Observations</p>
            </div>
            <div className="glass-subtle p-3.5 text-center">
              <p className="text-2xl font-display font-semibold text-cosmic-400">{stats.significantDiscoveries}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Significant</p>
            </div>
            <div className="glass-subtle p-3.5 text-center">
              <p className="text-2xl font-display font-semibold text-stellar-400">{stats.uncataloguedObjects}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Uncatalogued</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-3.5 h-3.5 text-white/25" />
          {(["all", "notable", "uncatalogued"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "text-xs px-3 py-1.5 rounded-lg border transition-all",
                filter === f
                  ? "bg-nebula-600/15 text-nebula-300 border-nebula-500/20"
                  : "bg-white/[0.02] text-white/30 border-white/[0.06] hover:text-white/50 hover:bg-white/[0.04]"
              )}
            >
              {f === "all" ? "All" : f === "notable" ? "Notable+" : "Uncatalogued"}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-nebula-400 animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass p-4 border-red-500/20 mb-4">
            <p className="text-sm text-red-400/70">{error}</p>
          </div>
        )}

        {/* Observation list */}
        {!loading && observations.length > 0 && (
          <div className="space-y-2">
            {observations.map((obs) => (
              <ObservationCard
                key={obs.id}
                observation={obs}
                onClick={() => handleSelectObservation(obs.id)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && observations.length === 0 && !error && (
          <div className="glass p-12 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-10 h-10 text-white/10 mb-4" />
            <h3 className="font-display text-lg text-white/50 mb-2">
              {filter === "all" ? "No observations yet" : `No ${filter} observations`}
            </h3>
            <p className="text-sm text-white/25 max-w-sm">
              {filter === "all"
                ? "Upload and analyze celestial images in the Observation tab. Every analysis is automatically saved here."
                : "Try changing the filter or run more analyses."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
