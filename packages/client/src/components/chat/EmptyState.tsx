import { useEffect, useState } from "react";
import {
  Sparkles,
  Upload,
  Star,
  Orbit,
  Telescope,
  Atom,
} from "lucide-react";

interface Suggestion {
  label: string;
  prompt: string;
}

interface EmptyStateProps {
  onSuggestionClick: (prompt: string) => void;
  onUploadClick: () => void;
}

const ICONS = [Star, Orbit, Telescope, Atom, Sparkles, Star];

export function EmptyState({ onSuggestionClick, onUploadClick }: EmptyStateProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    fetch("/api/chat/suggestions")
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => {
        // Fallback suggestions if server is not available
        setSuggestions([
          { label: "Galaxy Classification", prompt: "What are the main types of galaxies in the Hubble sequence and how do they differ?" },
          { label: "Redshift Analysis", prompt: "How does redshift help us determine the distance and age of galaxies?" },
          { label: "Gravitational Lensing", prompt: "Explain how gravitational lensing works and what it reveals about dark matter." },
          { label: "Stellar Evolution", prompt: "Walk me through the lifecycle of a massive star from formation to supernova." },
          { label: "Tidal Interactions", prompt: "What observable features indicate that two galaxies are interacting or merging?" },
          { label: "Transient Events", prompt: "What types of astronomical transient events can be detected through image comparison?" },
        ]);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
      {/* Hero */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-nebula-600/20 via-cosmic-600/15 to-nebula-700/20 border border-nebula-500/15 flex items-center justify-center">
          <Telescope className="w-9 h-9 text-nebula-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-aurora-500/70 border-2 border-void-950 animate-pulse-slow" />
      </div>

      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-2 text-center">
        Begin Your Observation
      </h2>
      <p className="text-white/35 text-sm max-w-lg text-center leading-relaxed mb-10">
        Upload a celestial image for full-pipeline analysis — morphology classification,
        coordinate solving, archival comparison, and discovery scoring — or ask AstroSage
        any astrophysics question.
      </p>

      {/* Upload card */}
      <button
        onClick={onUploadClick}
        className="glass-interactive w-full max-w-lg p-5 flex items-center gap-4 mb-6 group"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-nebula-600/20 to-cosmic-600/20 border border-nebula-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Upload className="w-5 h-5 text-nebula-400" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-medium text-white/80 mb-0.5">
            Upload Celestial Image
          </h3>
          <p className="text-xs text-white/30 leading-relaxed">
            Run the full discovery pipeline — Kimi K2 analysis, Astrometry.net coordinate
            solving, SkyView archival comparison, SIMBAD/NED catalog search
          </p>
        </div>
      </button>

      {/* Suggestion grid */}
      <div className="w-full max-w-lg">
        <p className="text-[11px] font-mono text-white/20 uppercase tracking-widest mb-3 px-1">
          Or ask AstroSage
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestions.map((s, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <button
                key={i}
                onClick={() => onSuggestionClick(s.prompt)}
                className="glass-subtle px-3.5 py-3 text-left group hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3 h-3 text-white/25 group-hover:text-cosmic-400 transition-colors" />
                  <span className="text-xs font-medium text-white/50 group-hover:text-white/70 transition-colors">
                    {s.label}
                  </span>
                </div>
                <p className="text-[11px] text-white/25 leading-relaxed line-clamp-2">
                  {s.prompt}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
