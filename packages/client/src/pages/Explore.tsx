import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Shuffle,
  Loader2,
  Filter,
  MapPin,
} from "lucide-react";
import clsx from "clsx";
import {
  getExploreGalaxies,
  getRandomGalaxies,
  searchExplore,
  type GalaxyFeedItem,
} from "@/services/api";
import { GalaxyCard } from "@/components/explore/GalaxyCard";
import { useNavigate } from "react-router-dom";

const TYPES = ["All", "Spiral", "Elliptical", "Lenticular", "Peculiar", "Irregular"];

export default function ExplorePage() {
  const [galaxies, setGalaxies] = useState<GalaxyFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [activeType, setActiveType] = useState("All");
  const [region, setRegion] = useState<string | null>(null);
  const [resolved, setResolved] = useState<{ name: string; ra: number; dec: number } | null>(null);
  const navigate = useNavigate();

  const loadFeed = useCallback(async (type?: string) => {
    setLoading(true);
    setRegion(null);
    setResolved(null);
    try {
      const res = await getExploreGalaxies({
        limit: 24,
        type: type && type !== "All" ? type : undefined,
      });
      setGalaxies(res.items || []);
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(activeType);
  }, [activeType, loadFeed]);

  const handleRandom = async () => {
    setLoading(true);
    setResolved(null);
    try {
      const res = await getRandomGalaxies();
      setGalaxies(res.items || []);
      setRegion(res.region || null);
    } catch (err) {
      console.error("Random error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setRegion(null);
    try {
      const res = await searchExplore(searchQuery.trim());
      setGalaxies(res.items || []);
      setResolved(res.resolved || null);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleInvestigate = (galaxy: GalaxyFeedItem) => {
    // Navigate to observation page with galaxy context
    // Store in sessionStorage for the observation page to pick up
    sessionStorage.setItem("investigate_galaxy", JSON.stringify(galaxy));
    navigate("/");
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Explore</h1>
            <p className="text-sm text-white/35 mt-1">
              Browse galaxies from public surveys and your observations
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="glass-subtle flex items-center gap-2 px-3 py-2 w-56">
              <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Name or coordinates..."
                className="bg-transparent text-xs text-white placeholder-white/20 outline-none w-full"
              />
              {searching && <Loader2 className="w-3 h-3 text-nebula-400 animate-spin shrink-0" />}
            </div>

            {/* Random */}
            <button
              onClick={handleRandom}
              className="glass-interactive px-3 py-2 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 shrink-0"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Random
            </button>
          </div>
        </div>

        {/* Region / resolved indicator */}
        {(region || resolved) && (
          <div className="glass-subtle px-4 py-2.5 mb-4 flex items-center gap-2 animate-fade-in">
            <MapPin className="w-3.5 h-3.5 text-nebula-400" />
            {region && (
              <span className="text-xs text-white/50">
                Showing galaxies near the <span className="text-nebula-300 font-medium">{region}</span>
              </span>
            )}
            {resolved && (
              <span className="text-xs text-white/50">
                Resolved <span className="text-nebula-300 font-medium">{resolved.name}</span> to
                <span className="font-mono text-white/35 ml-1">
                  {resolved.ra.toFixed(4)}° {resolved.dec >= 0 ? "+" : ""}{resolved.dec.toFixed(4)}°
                </span>
              </span>
            )}
          </div>
        )}

        {/* Type filters */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          <Filter className="w-3.5 h-3.5 text-white/20 shrink-0" />
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={clsx(
                "text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap",
                activeType === t
                  ? "bg-nebula-600/15 text-nebula-300 border-nebula-500/20"
                  : "bg-white/[0.02] text-white/30 border-white/[0.06] hover:text-white/50 hover:bg-white/[0.04]"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-nebula-400 animate-spin" />
              <span className="text-xs text-white/25">Loading galaxies...</span>
            </div>
          </div>
        )}

        {/* Galaxy grid */}
        {!loading && galaxies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {galaxies.map((galaxy) => (
              <GalaxyCard
                key={galaxy.id}
                galaxy={galaxy}
                onInvestigate={handleInvestigate}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && galaxies.length === 0 && (
          <div className="glass p-12 flex flex-col items-center justify-center text-center">
            <Search className="w-8 h-8 text-white/10 mb-4" />
            <h3 className="font-display text-lg text-white/50 mb-2">No galaxies found</h3>
            <p className="text-sm text-white/25 max-w-sm">
              Try a different search, change the filter, or hit Random to explore a new region of sky.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
