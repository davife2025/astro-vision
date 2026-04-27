import { BookOpen } from "lucide-react";

export default function ObservatoryPage() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Observatory</h1>
            <p className="text-sm text-white/40 mt-1">
              Your observation history, saved analyses, and discovery reports
            </p>
          </div>
        </div>

        {/* Empty state */}
        <div className="glass p-12 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-10 h-10 text-white/15 mb-4" />
          <h3 className="font-display text-lg text-white/60 mb-2">No observations yet</h3>
          <p className="text-sm text-white/30 max-w-sm">
            Upload and analyze celestial images in the Observation tab. Every analysis will be saved
            here with full pipeline results and discovery scores.
          </p>
        </div>
      </div>
    </div>
  );
}
