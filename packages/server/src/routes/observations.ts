import { Router, Request, Response } from "express";
import { getSupabase } from "../config/supabase";

const router = Router();

/**
 * GET /api/observations
 * List observations for a user (or all if no userId)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { userId, limit = "20", offset = "0", sort = "created_at", order = "desc", minScore } = req.query;

    let query = supabase
      .from("observations")
      .select("id, created_at, pipeline_version, tier, ra, dec_coord, morphology, discovery_score, discovery_tier, image_url, user_question, is_uncatalogued, synthesis")
      .order(sort as string, { ascending: order === "asc" })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (userId) {
      query = query.eq("user_id", userId as string);
    }

    if (minScore) {
      query = query.gte("discovery_score", parseInt(minScore as string));
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, observations: data || [], count });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * GET /api/observations/:id
 * Get full observation detail
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("observations")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: "Observation not found" });

    res.json({ success: true, observation: data });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * POST /api/observations
 * Save a completed pipeline result
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const {
      id,
      userId,
      imageBase64,
      pipelineVersion,
      tier,
      imageQuality,
      morphology,
      coordinates,
      catalogMatches,
      archivalImages,
      changeDetection,
      visualComparison,
      synthesis,
      discoveryScore,
      modelVersions,
      userQuestion,
    } = req.body;

    // Upload image to Supabase storage
    let imageUrl = null;
    if (imageBase64) {
      const buffer = Buffer.from(imageBase64, "base64");
      const filePath = `observations/${id || Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("observation-images")
        .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("observation-images")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }
    }

    const record = {
      id: id || undefined,
      user_id: userId || "anonymous",
      image_url: imageUrl,
      pipeline_version: pipelineVersion || "1.0.0",
      tier: tier || 3,
      ra: coordinates?.ra || null,
      dec_coord: coordinates?.dec || null,
      field_width: coordinates?.fieldWidth || null,
      field_height: coordinates?.fieldHeight || null,
      orientation: coordinates?.orientation || null,
      pixscale: coordinates?.pixscale || null,
      morphology: morphology || null,
      image_quality: imageQuality || null,
      catalog_matches: catalogMatches || [],
      is_uncatalogued: (catalogMatches || []).length === 0 && coordinates != null,
      change_detection: changeDetection || null,
      visual_comparison: visualComparison || null,
      archival_images: archivalImages || [],
      synthesis: synthesis || null,
      discovery_score: discoveryScore?.total || 0,
      discovery_tier: discoveryScore?.tier || "routine",
      discovery_score_breakdown: discoveryScore || null,
      model_versions: modelVersions || {},
      user_question: userQuestion || null,
    };

    const { data, error } = await supabase
      .from("observations")
      .upsert([record])
      .select()
      .single();

    if (error) throw error;

    // Update user profile observation count
    if (userId && userId !== "anonymous") {
      try {
        await supabase.rpc("increment_observation_count", { user_id_input: userId });
      } catch { /* non-critical */ }
    }

    res.json({ success: true, observation: data });
  } catch (err) {
    console.error("Save observation error:", err);
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * DELETE /api/observations/:id
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("observations")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * GET /api/observations/stats/summary
 * Platform-wide stats
 */
router.get("/stats/summary", async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const [totalRes, discoveryRes, uncataloguedRes] = await Promise.all([
      supabase.from("observations").select("id", { count: "exact", head: true }),
      supabase.from("observations").select("id", { count: "exact", head: true }).gte("discovery_score", 60),
      supabase.from("observations").select("id", { count: "exact", head: true }).eq("is_uncatalogued", true),
    ]);

    res.json({
      success: true,
      stats: {
        totalObservations: totalRes.count || 0,
        significantDiscoveries: discoveryRes.count || 0,
        uncataloguedObjects: uncataloguedRes.count || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
