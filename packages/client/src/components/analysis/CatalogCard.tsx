import { Search, ExternalLink, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface CatalogCardProps {
  matches: any[];
}

export function CatalogCard({ matches }: CatalogCardProps) {
  const isUncatalogued = matches.length === 0;

  return (
    <div className={clsx(
      "rounded-xl border p-4 animate-slide-up",
      isUncatalogued
        ? "bg-stellar-500/10 border-stellar-500/20"
        : "glass"
    )}>
      <div className="flex items-center gap-2 mb-3">
        {isUncatalogued ? (
          <AlertCircle className="w-4 h-4 text-stellar-400" />
        ) : (
          <Search className="w-4 h-4 text-white/40" />
        )}
        <h3 className="text-xs font-display font-semibold text-white/80">
          Catalog Cross-Reference
        </h3>
        <span className={clsx(
          "ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium",
          isUncatalogued
            ? "bg-stellar-500/20 text-stellar-300"
            : "bg-white/[0.04] text-white/40"
        )}>
          {isUncatalogued ? "Uncatalogued" : `${matches.length} match(es)`}
        </span>
      </div>

      {isUncatalogued ? (
        <p className="text-xs text-stellar-300/60 leading-relaxed">
          No matches found in SIMBAD or NED within 1 arcminute. This object may be
          uncatalogued — a strong signal for potential discovery.
        </p>
      ) : (
        <div className="space-y-2">
          {matches.slice(0, 5).map((m: any, i: number) => (
            <div key={i} className="glass-subtle p-2.5 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/70">
                  {m.objectName || "Unknown"}
                </span>
                <span className="text-[10px] text-white/25 font-mono">{m.source}</span>
              </div>
              {m.objectType && (
                <p className="text-[10px] text-white/40">{m.objectType}</p>
              )}
              {m.redshift !== null && m.redshift !== undefined && (
                <p className="text-[10px] text-white/30 font-mono mt-0.5">
                  z = {Number(m.redshift).toFixed(6)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
