import { Compass, Search } from "lucide-react";

export default function ExplorePage() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Explore</h1>
            <p className="text-sm text-white/40 mt-1">
              Browse and investigate galaxies from public survey data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-subtle flex items-center gap-2 px-3 py-2 w-64">
              <Search className="w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search by name or coordinates..."
                className="bg-transparent text-sm text-white placeholder-white/25 outline-none w-full"
              />
            </div>
          </div>
        </div>

        {/* Gallery placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="glass-interactive aspect-square flex flex-col items-center justify-center gap-3 cursor-pointer"
            >
              <Compass className="w-8 h-8 text-white/15" />
              <span className="text-xs text-white/25 font-mono">Session 7</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
