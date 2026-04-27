import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { PIPELINE_VERSION } from "@astrovision/pipeline";
import { triageImage, analyzeMorphology, getAnnotations } from "../services/vlm";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed"));
  },
});

/**
 * POST /api/analysis/full
 * Full discovery pipeline with SSE progress streaming
 */
router.post("/full", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image provided" });
  }

  const userQuestion = req.body.question || "Analyze this celestial object.";
  const observationId = uuid();
  const imageBase64 = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype;

  // SSE headers
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
    // ── Stage 1: Triage ──────────────────────────────────────────────
    send("progress", { stage: "triage", message: "Assessing image quality...", progress: 5 });

    const imageQuality = await triageImage(imageBase64, mimeType);

    send("progress", { stage: "triage_done", message: "Image quality assessed", progress: 15 });
    send("stage_result", { type: "imageQuality", data: imageQuality });

    // If not astronomical, return early
    if (!imageQuality.isAstronomical) {
      send("result", {
        id: observationId,
        timestamp: new Date().toISOString(),
        pipelineVersion: PIPELINE_VERSION,
        tier: 3,
        imageQuality,
        morphology: null,
        error: "Image does not appear to be an astronomical image. Please upload a telescope capture or astronomical photograph.",
      });
      return res.end();
    }

    // ── Stage 2: Morphological Analysis ──────────────────────────────
    send("progress", { stage: "morphology", message: "Analyzing morphological features...", progress: 20 });

    const morphology = await analyzeMorphology(imageBase64, mimeType);

    send("progress", { stage: "morphology_done", message: `Classified: ${morphology.classification} (${morphology.subType})`, progress: 40 });
    send("stage_result", { type: "morphology", data: morphology });

    // ── Stage 2b: Annotations (parallel-safe, non-blocking) ─────────
    send("progress", { stage: "annotations", message: "Identifying key features...", progress: 45 });

    let annotations: any[] = [];
    try {
      annotations = await getAnnotations(imageBase64, mimeType);
    } catch {
      // Annotations are non-critical
      annotations = [];
    }

    if (annotations.length > 0) {
      send("stage_result", { type: "annotations", data: annotations });
    }

    // ── Stages 3–5: Astrometry + SkyView + Catalog (Session 3+) ─────
    send("progress", { stage: "plate_solving", message: "Coordinate solving (ready in Session 3)...", progress: 50 });

    // TODO: Session 3 — Astrometry parallel with VLM
    // TODO: Session 3 — SkyView archival fetch
    // TODO: Session 4 — Visual comparison
    // TODO: Session 4 — AstroSage synthesis
    // TODO: Session 5 — Catalog cross-reference + scoring

    send("progress", { stage: "complete", message: "Analysis complete", progress: 100 });

    // ── Final result ─────────────────────────────────────────────────
    send("result", {
      id: observationId,
      timestamp: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      tier: 3,
      imageQuality,
      morphology,
      annotations,
      coordinates: null,
      catalogMatches: [],
      archivalImages: [],
      changeDetection: null,
      visualComparison: null,
      synthesis: null,
      discoveryScore: null,
      modelVersions: {
        vlm: "Kimi-K2.5",
        llm: "AstroSage-8B",
        pipeline: PIPELINE_VERSION,
      },
    });

    res.end();
  } catch (err) {
    console.error("Pipeline error:", err);
    send("error", { message: (err as Error).message, stage: "pipeline" });
    res.end();
  }
});

/**
 * POST /api/analysis/quick
 * Quick VLM-only morphology — no coordinate solving
 */
router.post("/quick", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image provided" });
  }

  try {
    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    const [imageQuality, morphology] = await Promise.all([
      triageImage(imageBase64, mimeType),
      analyzeMorphology(imageBase64, mimeType),
    ]);

    let annotations: any[] = [];
    try {
      annotations = await getAnnotations(imageBase64, mimeType);
    } catch {
      annotations = [];
    }

    res.json({
      id: uuid(),
      timestamp: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      tier: 3,
      imageQuality,
      morphology,
      annotations,
    });
  } catch (err) {
    console.error("Quick analysis error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
