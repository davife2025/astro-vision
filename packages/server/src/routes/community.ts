import { Router, Request, Response } from "express";
import multer from "multer";
import { getSupabase } from "../config/supabase";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function timeAgo(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ── GET /api/community/posts ─────────────────────────────────────────────────
router.get("/posts", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { filter } = req.query;

    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter === "discoveries") {
      query = query.not("observation_id", "is", null);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enrich posts with observation data if linked
    const posts = await Promise.all(
      (data || []).map(async (p: any) => {
        let observation = null;
        if (p.observation_id) {
          const { data: obs } = await supabase
            .from("observations")
            .select("morphology, discovery_score, discovery_tier, ra, dec_coord, image_url")
            .eq("id", p.observation_id)
            .single();
          observation = obs;
        }

        // Get comment count
        const { count } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("post_id", p.id);

        // Get verification count if linked to observation
        let verificationCount = 0;
        let avgConfidence = null;
        if (p.observation_id) {
          const { data: verifs } = await supabase
            .from("verifications")
            .select("confidence")
            .eq("observation_id", p.observation_id);
          if (verifs && verifs.length > 0) {
            verificationCount = verifs.length;
            avgConfidence = Math.round(
              verifs.reduce((s: number, v: any) => s + v.confidence, 0) / verifs.length
            );
          }
        }

        return {
          ...p,
          timeString: timeAgo(p.created_at),
          commentCount: count || 0,
          observation,
          verificationCount,
          avgConfidence,
        };
      })
    );

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
      const { data: { publicUrl } } = supabase.storage.from("community-images").getPublicUrl(filePath);
      imageUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert([{ user_id: userId, author, text, image: imageUrl, observation_id: observationId || null, likes: 0, liked_by: [] }])
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
    const { data: post, error: fetchErr } = await supabase
      .from("posts")
      .select("liked_by, likes")
      .eq("id", req.params.id)
      .single();
    if (fetchErr) throw fetchErr;

    const likedBy = post.liked_by || [];
    const hasLiked = likedBy.includes(userId);

    const { data, error } = await supabase
      .from("posts")
      .update({
        likes: hasLiked ? post.likes - 1 : post.likes + 1,
        liked_by: hasLiked ? likedBy.filter((id: string) => id !== userId) : [...likedBy, userId],
      })
      .eq("id", req.params.id)
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

    const map: Record<string, any> = {};
    const roots: any[] = [];
    (data || []).forEach((c: any) => {
      map[c.id] = { ...c, replies: [], timeString: timeAgo(c.created_at) };
    });
    (data || []).forEach((c: any) => {
      if (c.parent_id && map[c.parent_id]) map[c.parent_id].replies.push(map[c.id]);
      else roots.push(map[c.id]);
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
      .insert([{ post_id: req.params.id, parent_id: parentId, user_id: userId, author, text, likes: 0, liked_by: [] }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, comment: data });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ── POST /api/community/verify ───────────────────────────────────────────────
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { observationId, userId, confidence, notes } = req.body;

    if (!observationId || !userId || confidence == null) {
      return res.status(400).json({ error: "observationId, userId, and confidence required" });
    }

    if (confidence < 0 || confidence > 100) {
      return res.status(400).json({ error: "confidence must be 0-100" });
    }

    const { data, error } = await supabase
      .from("verifications")
      .upsert([{ observation_id: observationId, user_id: userId, confidence, notes: notes || null }], { onConflict: "observation_id,user_id" })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, verification: data });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ── GET /api/community/verify/:observationId ─────────────────────────────────
router.get("/verify/:observationId", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("verifications")
      .select("*")
      .eq("observation_id", req.params.observationId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const verifications = data || [];
    const avgConfidence = verifications.length > 0
      ? Math.round(verifications.reduce((s: number, v: any) => s + v.confidence, 0) / verifications.length)
      : null;

    res.json({
      success: true,
      verifications,
      count: verifications.length,
      avgConfidence,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ── GET /api/community/queue ─────────────────────────────────────────────────
// Verification queue: observations scoring >= 40 that need peer review
router.get("/queue", async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("observations")
      .select("id, created_at, ra, dec_coord, morphology, discovery_score, discovery_tier, image_url, synthesis, user_question")
      .gte("discovery_score", 40)
      .order("discovery_score", { ascending: false })
      .limit(20);

    if (error) throw error;

    // Enrich with verification counts
    const items = await Promise.all(
      (data || []).map(async (obs: any) => {
        const { data: verifs } = await supabase
          .from("verifications")
          .select("confidence")
          .eq("observation_id", obs.id);

        const vCount = verifs?.length || 0;
        const avgConf = vCount > 0
          ? Math.round(verifs!.reduce((s: number, v: any) => s + v.confidence, 0) / vCount)
          : null;

        return { ...obs, verificationCount: vCount, avgConfidence: avgConf };
      })
    );

    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
