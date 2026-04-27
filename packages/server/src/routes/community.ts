import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { config } from "../config";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function getSupabase() {
  return createClient(config.supabaseUrl, config.supabaseServiceKey);
}

function formatTimeString(timestamp: string): string {
  const date = new Date(timestamp);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

// ── GET /api/community/posts ─────────────────────────────────────────────────
router.get("/posts", async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const posts = (data || []).map((p: any) => ({
      ...p,
      timeString: formatTimeString(p.created_at),
    }));

    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ── POST /api/community/posts ────────────────────────────────────────────────
router.post("/posts", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { text, userId, author, observationId } = req.body;
    let imageUrl = null;

    if (req.file) {
      const ext = req.file.originalname.split(".").pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("community-images")
        .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("community-images").getPublicUrl(filePath);

      imageUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          user_id: userId,
          author,
          text,
          image: imageUrl,
          observation_id: observationId || null,
          likes: 0,
          liked_by: [],
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, post: data });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ── POST /api/community/posts/:id/like ───────────────────────────────────────
router.post("/posts/:id/like", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { userId } = req.body;
    const postId = req.params.id;

    const { data: post, error: fetchErr } = await supabase
      .from("posts")
      .select("liked_by, likes")
      .eq("id", postId)
      .single();

    if (fetchErr) throw fetchErr;

    const likedBy = post.liked_by || [];
    const hasLiked = likedBy.includes(userId);

    const { data, error } = await supabase
      .from("posts")
      .update({
        likes: hasLiked ? post.likes - 1 : post.likes + 1,
        liked_by: hasLiked
          ? likedBy.filter((id: string) => id !== userId)
          : [...likedBy, userId],
      })
      .eq("id", postId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, post: data });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ── GET /api/community/posts/:id/comments ────────────────────────────────────
router.get("/posts/:id/comments", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", req.params.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Build nested comment tree
    const map: Record<string, any> = {};
    const roots: any[] = [];
    (data || []).forEach((c: any) => {
      map[c.id] = { ...c, replies: [], timeString: formatTimeString(c.created_at) };
    });
    (data || []).forEach((c: any) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    res.json({ success: true, comments: roots });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ── POST /api/community/posts/:id/comments ───────────────────────────────────
router.post("/posts/:id/comments", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { userId, author, text, parentId = null } = req.body;

    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          post_id: req.params.id,
          parent_id: parentId,
          user_id: userId,
          author,
          text,
          likes: 0,
          liked_by: [],
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, comment: data });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
