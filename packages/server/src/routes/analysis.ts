import { Router, Request, Response } from "express";
import multer from "multer";
import { config } from "../config";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed"));
  },
});

/**
 * POST /api/analysis/full
 * Run the complete discovery pipeline on an uploaded image
 * Returns SSE stream with progress updates
 */
router.post("/full", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image provided" });
  }

  const userQuestion = req.body.question || "Analyze this celestial object.";

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendEvent = (stage: string, data: any) => {
    res.write(`event: ${stage}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent("progress", { stage: "triage", message: "Assessing image quality...", progress: 5 });

    // TODO: Session 2 — Kimi K2 triage + morphology (parallel with astrometry)
    // TODO: Session 3 — Astrometry + SkyView
    // TODO: Session 4 — Kimi K2 visual comparison + AstroSage synthesis
    // TODO: Session 5 — Catalog cross-reference + scoring

    sendEvent("progress", { stage: "complete", message: "Analysis complete", progress: 100 });

    // Placeholder result
    sendEvent("result", {
      id: `obs_${Date.now()}`,
      timestamp: new Date().toISOString(),
      pipelineVersion: "1.0.0",
      tier: 3,
      message: "Pipeline stubs ready. Wire in Session 2+.",
    });

    res.end();
  } catch (err) {
    sendEvent("error", { message: (err as Error).message });
    res.end();
  }
});

/**
 * POST /api/analysis/quick
 * Quick VLM-only analysis without coordinate solving
 */
router.post("/quick", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image provided" });
  }

  try {
    // TODO: Session 2 — Kimi K2 morphology only
    res.json({
      message: "Quick analysis stub. Wire in Session 2.",
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
