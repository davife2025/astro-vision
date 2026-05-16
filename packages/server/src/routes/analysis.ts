import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { AstrometryService } from "@astrovision/pipeline";
import { config } from "../config";
import { identifyAndClassify, compareImagesVLM } from "../services/vlm";
import { compareImages, fetchImageBuffer } from "../services/imageComparison";
import { explainObservation } from "../services/llm";
import { getSupabase } from "../config/supabase";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed"));
  },
});

const ANOMALY_THRESHOLD = 1500;

/**
 * POST /api/analysis/full
 * Discovery Pipeline:
 *  1. Identify & classify the object (VLM)
 *  2. Resolve sky coordinates (Astrometry.net)
 *  3. Fetch historical image of same region (SkyView)
 *  4. Compare uploaded vs historical (pixel diff)
 *  5. Flag anomaly if difference exceeds threshold
 */
router.post("/full", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image provided" });
  }

  const observationId = uuid();
  const imageBuffer = req.file.buffer;
  const mimeType = req.file.mimetype;
  const imageBase64 = imageBuffer.toString("base64");
  const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

  // SSE setup
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // ── Stage 1: Identify & Classify ─────────────────────────────────
    send("progress", { stage: "identify", message: "Identifying object...", progress: 10 });

    const { description, classification } = await identifyAndClassify(imageDataUrl);

    send("progress", { stage: "identify_done", message: `Identified: ${classification}`, progress: 30 });
    send("stage_result", { type: "identification", data: { description, classification } });

    // ── Stage 2: Astrometry ──────────────────────────────────────────
    send("progress", { stage: "astrometry", message: "Solving sky coordinates...", progress: 35 });

    let coordinates: { ra: number; dec: number; fieldWidth?: number; fieldHeight?: number; pixscale?: number; orientation?: number } | null = null;
    let historicalImageUrl: string | null = null;
    let diffCount: number | null = null;
    let isAnomaly = false;
    let visualComparison: string | null = null;

    try {
      const astrometry = new AstrometryService(config.astrometryApiKey);
      coordinates = await astrometry.solve(imageBuffer, (attempt, max) => {
        send("progress", {
          stage: "astrometry",
          message: `Solving coordinates... attempt ${attempt}/${max}`,
          progress: 35 + Math.min(20, attempt),
        });
      });

      send("progress", { stage: "astrometry_done", message: "Coordinates resolved", progress: 60 });
      send("stage_result", { type: "coordinates", data: coordinates });

      // ── Stage 3: Fetch historical image ──────────────────────────
      send("progress", { stage: "skyview", message: "Fetching archival image...", progress: 65 });

      historicalImageUrl = `https://skyview.gsfc.nasa.gov/cgi-bin/images?survey=sdssi&position=${coordinates.ra},${coordinates.dec}&size=0.1&pixels=500`;

      send("stage_result", { type: "historicalImage", data: { url: historicalImageUrl } });

      // ── Stage 4: Pixel comparison ────────────────────────────────
      send("progress", { stage: "compare", message: "Comparing with historical image...", progress: 75 });

      try {
        const histBuffer = await fetchImageBuffer(historicalImageUrl);
        const result = await compareImages(imageBuffer, histBuffer);
        diffCount = result.detection.changeScore;
        isAnomaly = diffCount > ANOMALY_THRESHOLD;

        send("stage_result", {
          type: "comparison",
          data: {
            diffCount,
            isAnomaly,
            description: result.detection.description,
          },
        });
      } catch (compErr) {
        console.error("Comparison failed:", compErr);
      }

      // ── Stage 5: Optional VLM visual comparison ──────────────────
      send("progress", { stage: "visual_compare", message: "Visual comparison...", progress: 85 });
      try {
        visualComparison = await compareImagesVLM(imageDataUrl, historicalImageUrl);
        send("stage_result", { type: "visualComparison", data: { text: visualComparison } });
      } catch {
        // optional, non-blocking
      }
    } catch (astrometryErr) {
      console.warn("Astrometry failed:", (astrometryErr as Error).message);
      send("stage_result", {
        type: "astrometryError",
        data: { message: (astrometryErr as Error).message },
      });
    }

    // ── Stage 6: AstroSage explanatory analysis ──────────────────────
    send("progress", { stage: "astrosage", message: "AstroSage is writing the analysis...", progress: 92 });

    let astrosageAnalysis = "";
    try {
      astrosageAnalysis = await explainObservation({
        classification,
        description,
        ra: coordinates?.ra ?? null,
        dec: coordinates?.dec ?? null,
        diffCount,
        isAnomaly,
        visualComparison,
      });
      send("stage_result", { type: "astrosageAnalysis", data: { text: astrosageAnalysis } });
    } catch (llmErr) {
      console.error("AstroSage analysis failed:", llmErr);
      astrosageAnalysis = "AstroSage analysis could not be generated, but the pipeline results above are complete.";
      send("stage_result", { type: "astrosageAnalysis", data: { text: astrosageAnalysis } });
    }

    // ── Done ─────────────────────────────────────────────────────────
    send("progress", { stage: "complete", message: "Analysis complete", progress: 100 });

    const finalResult = {
      id: observationId,
      timestamp: new Date().toISOString(),
      description,
      classification,
      coordinates,
      historicalImage: historicalImageUrl,
      diffCount,
      isAnomaly,
      visualComparison,
      astrosageAnalysis,
      discovery: isAnomaly
        ? `ANOMALY DETECTED: ${diffCount} pixel variances between observation and archive. This region may show real astrophysical changes worth investigating.`
        : diffCount !== null
          ? "Region appears stable compared to historical archive."
          : "Comparison unavailable (coordinates could not be resolved).",
    };

    send("result", finalResult);

    // ── Auto-save to ledger (non-blocking) ───────────────────────────
    try {
      const supabase = getSupabase();
      let imageUrl: string | null = null;

      const filePath = `observations/${observationId}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("observation-images")
        .upload(filePath, imageBuffer, { contentType: mimeType, upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("observation-images")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      await supabase.from("observations").upsert([{
        id: observationId,
        user_id: req.body.userId || "anonymous",
        image_url: imageUrl,
        pipeline_version: "2.0.0-simple",
        tier: coordinates ? 1 : 2,
        ra: coordinates?.ra ?? null,
        dec_coord: coordinates?.dec ?? null,
        field_width: coordinates?.fieldWidth ?? null,
        field_height: coordinates?.fieldHeight ?? null,
        orientation: coordinates?.orientation ?? null,
        pixscale: coordinates?.pixscale ?? null,
        morphology: { classification, description },
        change_detection: diffCount !== null ? { diffCount, isAnomaly, visualComparison } : null,
        synthesis: { summary: finalResult.discovery, analysis: astrosageAnalysis },
        discovery_score: isAnomaly ? 75 : 10,
        discovery_tier: isAnomaly ? "candidate" : "routine",
        user_question: req.body.question || null,
      }]);
    } catch (saveErr) {
      console.error("Auto-save failed:", saveErr);
    }

    res.end();
  } catch (err) {
    console.error("Pipeline error:", err);
    send("error", { message: (err as Error).message });
    res.end();
  }
});

export default router;
