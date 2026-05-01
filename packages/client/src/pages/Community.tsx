import { useState, useEffect, useCallback } from "react";
import {
  Users,
  MessageCircle,
  Shield,
  Filter,
  Loader2,
  Send,
  Star,
} from "lucide-react";
import clsx from "clsx";
import {
  getCommunityPosts,
  createCommunityPost,
  getVerificationQueue,
} from "@/services/api";
import { PostCard } from "@/components/community/PostCard";
import { VerifyModal } from "@/components/community/VerifyModal";

type Tab = "feed" | "queue";
type FeedFilter = "all" | "discoveries";

const TEMP_USER_ID = "user_" + Math.random().toString(36).slice(2, 10);

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>("feed");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [posts, setPosts] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);
  const [verifyingObservation, setVerifyingObservation] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCommunityPosts(feedFilter);
      setPosts(res.posts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [feedFilter]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVerificationQueue();
      setQueue(res.items || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "feed") fetchFeed();
    else fetchQueue();
  }, [tab, fetchFeed, fetchQueue]);

  const handleCreatePost = async () => {
    if (!newPostText.trim() || submittingPost) return;
    setSubmittingPost(true);
    try {
      await createCommunityPost({
        text: newPostText.trim(),
        userId: TEMP_USER_ID,
        author: "Researcher",
      });
      setNewPostText("");
      setShowNewPost(false);
      fetchFeed();
    } catch { /* ignore */ }
    setSubmittingPost(false);
  };

  const tierConfig: Record<string, string> = {
    candidate_discovery: "score-discovery",
    significant: "score-significant",
    notable: "score-notable",
    interesting: "score-interesting",
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Community</h1>
            <p className="text-sm text-white/35 mt-1">
              Discuss findings and verify discovery candidates
            </p>
          </div>
          <button
            onClick={() => setShowNewPost(!showNewPost)}
            className="glass-interactive px-4 py-2 text-xs font-medium text-nebula-300 flex items-center gap-2"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            New Post
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setTab("feed")}
            className={clsx(
              "flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl border transition-all",
              tab === "feed"
                ? "bg-nebula-600/15 text-nebula-300 border-nebula-500/20"
                : "bg-white/[0.02] text-white/30 border-white/[0.06] hover:text-white/50"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Feed
          </button>
          <button
            onClick={() => setTab("queue")}
            className={clsx(
              "flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl border transition-all",
              tab === "queue"
                ? "bg-aurora-600/15 text-aurora-300 border-aurora-500/20"
                : "bg-white/[0.02] text-white/30 border-white/[0.06] hover:text-white/50"
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            Verification Queue
          </button>
        </div>

        {/* New post form */}
        {showNewPost && (
          <div className="glass p-4 mb-4 animate-slide-up">
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Share a finding, ask a question, or discuss an observation..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none resize-none focus:border-white/[0.12] mb-3"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowNewPost(false); setNewPostText(""); }}
                className="text-xs text-white/30 hover:text-white/50 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPostText.trim() || submittingPost}
                className={clsx(
                  "flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl transition-all",
                  newPostText.trim()
                    ? "bg-nebula-600 text-white hover:bg-nebula-500"
                    : "bg-white/[0.04] text-white/20"
                )}
              >
                <Send className="w-3 h-3" />
                Post
              </button>
            </div>
          </div>
        )}

        {/* Feed tab */}
        {tab === "feed" && (
          <>
            {/* Feed filter */}
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-3.5 h-3.5 text-white/20" />
              {(["all", "discoveries"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFeedFilter(f)}
                  className={clsx(
                    "text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                    feedFilter === f
                      ? "bg-nebula-600/15 text-nebula-300 border-nebula-500/20"
                      : "bg-white/[0.02] text-white/25 border-white/[0.06] hover:text-white/40"
                  )}
                >
                  {f === "all" ? "All Posts" : "Discoveries Only"}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-nebula-400 animate-spin" />
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={TEMP_USER_ID}
                    onVerify={(obsId) => setVerifyingObservation(obsId)}
                    onRefresh={fetchFeed}
                  />
                ))}
              </div>
            ) : (
              <div className="glass p-12 flex flex-col items-center text-center">
                <Users className="w-8 h-8 text-white/10 mb-3" />
                <h3 className="text-sm text-white/40 mb-1">No posts yet</h3>
                <p className="text-xs text-white/20">Be the first to share a finding or start a discussion.</p>
              </div>
            )}
          </>
        )}

        {/* Verification queue tab */}
        {tab === "queue" && (
          <>
            <p className="text-xs text-white/30 mb-4">
              Observations scoring 40+ awaiting peer review. Click to submit your confidence assessment.
            </p>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-aurora-400 animate-spin" />
              </div>
            ) : queue.length > 0 ? (
              <div className="space-y-2">
                {queue.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setVerifyingObservation(item.id)}
                    className="glass-interactive w-full p-4 flex items-center gap-4 text-left"
                  >
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="w-14 h-14 rounded-xl object-cover bg-black shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white/70">
                          {item.morphology?.classification || "Unknown"}
                        </span>
                        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded", tierConfig[item.discovery_tier] || "score-interesting")}>
                          {item.discovery_score}/100
                        </span>
                        {item.verificationCount > 0 && (
                          <span className="text-[10px] text-aurora-400/60 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" />
                            {item.verificationCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/35 line-clamp-1">
                        {item.synthesis?.summary || item.user_question || "Awaiting review"}
                      </p>
                    </div>
                    <Star className="w-4 h-4 text-white/10 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="glass p-12 flex flex-col items-center text-center">
                <Shield className="w-8 h-8 text-white/10 mb-3" />
                <h3 className="text-sm text-white/40 mb-1">Queue is empty</h3>
                <p className="text-xs text-white/20">No observations need verification right now.</p>
              </div>
            )}
          </>
        )}

        {/* Verification modal */}
        {verifyingObservation && (
          <VerifyModal
            observationId={verifyingObservation}
            currentUserId={TEMP_USER_ID}
            onClose={() => setVerifyingObservation(null)}
            onSubmitted={() => {
              setVerifyingObservation(null);
              if (tab === "feed") fetchFeed();
              else fetchQueue();
            }}
          />
        )}
      </div>
    </div>
  );
}
