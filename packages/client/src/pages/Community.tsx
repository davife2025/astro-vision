import { Users, MessageCircle } from "lucide-react";

export default function CommunityPage() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Community</h1>
            <p className="text-sm text-white/40 mt-1">
              Discuss findings, verify discoveries, and collaborate with researchers
            </p>
          </div>
          <button className="glass-interactive px-4 py-2 text-sm font-medium text-nebula-300 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            New Post
          </button>
        </div>

        {/* Empty state */}
        <div className="glass p-12 flex flex-col items-center justify-center text-center">
          <Users className="w-10 h-10 text-white/15 mb-4" />
          <h3 className="font-display text-lg text-white/60 mb-2">Community feed</h3>
          <p className="text-sm text-white/30 max-w-sm">
            When analyses produce high discovery scores, they will automatically appear here
            for peer review and discussion.
          </p>
        </div>
      </div>
    </div>
  );
}
