import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Shield,
  ChevronDown,
  ChevronUp,
  Send,
  Star,
  Crosshair,
} from "lucide-react";
import clsx from "clsx";
import {
  likePost,
  getComments,
  addComment,
} from "@/services/api";

interface PostCardProps {
  post: any;
  currentUserId: string;
  onVerify: (observationId: string) => void;
  onRefresh: () => void;
}

function Comment({ comment, depth = 0 }: { comment: any; depth?: number }) {
  return (
    <div className={clsx("pt-3", depth > 0 && "ml-6 border-l border-white/[0.04] pl-3")}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-medium text-white/50">{comment.author}</span>
        <span className="text-[10px] text-white/20">{comment.timeString}</span>
      </div>
      <p className="text-xs text-white/60 leading-relaxed">{comment.text}</p>
      {comment.replies?.map((reply: any) => (
        <Comment key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}

export function PostCard({ post, currentUserId, onVerify, onRefresh }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLiked = (post.liked_by || []).includes(currentUserId);
  const obs = post.observation;
  const tierConfig: Record<string, string> = {
    candidate_discovery: "score-discovery",
    significant: "score-significant",
    notable: "score-notable",
    interesting: "score-interesting",
    routine: "score-routine",
  };

  const handleLike = async () => {
    await likePost(post.id, currentUserId);
    onRefresh();
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const res = await getComments(post.id);
        setComments(res.comments || []);
      } catch { /* ignore */ }
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(post.id, {
        userId: currentUserId,
        author: "Researcher",
        text: newComment.trim(),
      });
      setNewComment("");
      const res = await getComments(post.id);
      setComments(res.comments || []);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <div className="glass p-4 animate-fade-in">
      {/* Author + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-nebula-600/30 to-cosmic-600/30 border border-white/[0.08] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white/50">
              {(post.author || "A")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-white/60">{post.author}</span>
            <span className="text-[10px] text-white/20 ml-2">{post.timeString}</span>
          </div>
        </div>

        {/* Verification badge */}
        {post.verificationCount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-aurora-400/70 bg-aurora-500/10 border border-aurora-500/20 px-2 py-1 rounded-lg">
            <Shield className="w-3 h-3" />
            {post.verificationCount} verified · {post.avgConfidence}% avg
          </div>
        )}
      </div>

      {/* Text */}
      <p className="text-sm text-white/70 leading-relaxed mb-3">{post.text}</p>

      {/* Linked observation */}
      {obs && (
        <div className="glass-subtle p-3 rounded-xl mb-3 flex items-center gap-3">
          {obs.image_url && (
            <img src={obs.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-black" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white/60">
                {obs.morphology?.classification || "Unknown"}
              </span>
              <span className={clsx("text-[10px] px-1.5 py-0.5 rounded", tierConfig[obs.discovery_tier] || "score-routine")}>
                {obs.discovery_score}/100
              </span>
            </div>
            {obs.ra != null && (
              <span className="text-[10px] text-white/25 font-mono flex items-center gap-1 mt-0.5">
                <Crosshair className="w-2.5 h-2.5" />
                {obs.ra.toFixed(3)}° {obs.dec_coord >= 0 ? "+" : ""}{obs.dec_coord?.toFixed(3)}°
              </span>
            )}
          </div>
          {post.observation_id && (
            <button
              onClick={() => onVerify(post.observation_id)}
              className="shrink-0 text-[10px] text-nebula-400 hover:text-nebula-300 px-2.5 py-1.5 rounded-lg bg-nebula-600/10 border border-nebula-500/20 hover:bg-nebula-600/20 transition-all"
            >
              Verify
            </button>
          )}
        </div>
      )}

      {/* Post image */}
      {post.image && (
        <img src={post.image} alt="" className="w-full rounded-xl border border-white/[0.06] mb-3 max-h-64 object-cover" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-white/[0.04]">
        <button
          onClick={handleLike}
          className={clsx(
            "flex items-center gap-1.5 text-xs transition-colors",
            isLiked ? "text-red-400" : "text-white/30 hover:text-white/50"
          )}
        >
          <Heart className={clsx("w-3.5 h-3.5", isLiked && "fill-current")} />
          {post.likes || 0}
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {post.commentCount || 0}
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-white/[0.04]">
          {loadingComments ? (
            <p className="text-[11px] text-white/20">Loading comments...</p>
          ) : (
            <>
              {comments.map((c) => (
                <Comment key={c.id} comment={c} />
              ))}
              {comments.length === 0 && (
                <p className="text-[11px] text-white/20 mb-2">No comments yet</p>
              )}
            </>
          )}

          {/* Add comment */}
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              placeholder="Add a comment..."
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/[0.12]"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                newComment.trim() ? "bg-nebula-600 text-white" : "bg-white/[0.03] text-white/15"
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
