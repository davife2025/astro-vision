import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import {
  PIPELINE_VERSION,
  AstrometryService,
  SkyViewService,
  CatalogService,
  computeDiscoveryScore,
  type Coordinates,
  type ArchivalImage,
} from "@astrovision/pipeline";
import { config } from "../config";
import { triageImage, analyzeMorphology, getAnnotations, compareImages as vlmCompareImages } from "../services/vlm";
import { compareImages, fetchImageBuffer } from "../services/imageComparison";
import { synthesizeResults } from "../services/llm";
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

const skyview = new SkyViewService();
const catalog = new CatalogService();

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
  const imageBuffer = req.file.buffer;
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

    send("progress", { stage: "triage", message: "Image quality assessed", progress: 10 });
    send("stage_result", { type: "imageQuality", data: imageQuality });

    if (!imageQuality.isAstronomical) {
      send("result", {
        id: observationId,
        timestamp: new Date().toISOString(),
        pipelineVersion: PIPELINE_VERSION,
        tier: 3,
        imageQuality,
        morphology: null,
        error: "Image does not appear to be astronomical.",
      });
      return res.end();
    }

    // ── Stage 2: VLM + Astrometry in PARALLEL ────────────────────────
    send("progress", { stage: "morphology", message: "Analyzing morphology + solving coordinates...", progress: 15 });

    // Fire both simultaneously
    const morphologyPromise = analyzeMorphology(imageBase64, mimeType);

    let astrometryPromise: Promise<Coordinates | null>;
    if (imageQuality.hasEnoughStarsForPlateSolving && config.astrometryApiKey) {
      const astrometry = new AstrometryService(config.astrometryApiKey);
      astrometryPromise = astrometry
        .solve(imageBuffer, (attempt, max) => {
          send("progress", {
            stage: "plate_solving",
            message: `Solving coordinates (attempt ${attempt}/${max})...`,
            progress: 15 + Math.min(attempt * 2, 20),
          });
        })
        .catch((err) => {
          send("progress", {
            stage: "plate_solving",
            message: `Plate solving failed: ${(err as Error).message}`,
            progress: 35,
          });
          return null;
        });
    } else {
      astrometryPromise = Promise.resolve(null);
      if (!config.astrometryApiKey) {
        send("progress", { stage: "plate_solving", message: "Astrometry API key not configured — skipping", progress: 35 });
      } else {
        send("progress", { stage: "plate_solving", message: "Insufficient stars for plate solving — skipping", progress: 35 });
      }
    }

    // Wait for both
    const [morphology, coordinates] = await Promise.all([
      morphologyPromise,
      astrometryPromise,
    ]);

    send("progress", {
      stage: "morphology",
      message: `Classified: ${morphology.classification} (${morphology.subType})`,
      progress: 40,
    });
    send("stage_result", { type: "morphology", data: morphology });

    if (coordinates) {
      send("progress", {
        stage: "plate_solving",
        message: `Coordinates: RA ${coordinates.ra.toFixed(4)}°, Dec ${coordinates.dec.toFixed(4)}°`,
        progress: 42,
      });
      send("stage_result", { type: "coordinates", data: coordinates });
    }

    // ── Stage 2b: Annotations (non-blocking) ─────────────────────────
    let annotations: any[] = [];
    try {
      annotations = await getAnnotations(imageBase64, mimeType);
      if (annotations.length > 0) {
        send("stage_result", { type: "annotations", data: annotations });
      }
    } catch {
      annotations = [];
    }

    // ── Stage 3: SkyView archival fetch (only if coordinates available)
    let archivalImages: ArchivalImage[] = [];
    let referenceImageBuffer: Buffer | null = null;
    let diffImageBase64: string | null = null;
    let changeDetection: any = null;

    if (coordinates) {
      send("progress", { stage: "archival_fetch", message: "Fetching archival images from SkyView...", progress: 50 });

      // Get all multi-wavelength images
      archivalImages = skyview.getArchivalImages(coordinates);
      send("stage_result", { type: "archivalImages", data: archivalImages });

      // Fetch the primary optical reference for comparison
      const primaryRef = skyview.getPrimaryOptical(coordinates);
      send("progress", { stage: "archival_fetch", message: `Fetching DSS2 reference image...`, progress: 55 });

      try {
        referenceImageBuffer = await fetchImageBuffer(primaryRef.url);
        send("progress", { stage: "archival_fetch", message: "Reference image retrieved", progress: 60 });

        // Convert reference to base64 for frontend display
        const refBase64 = referenceImageBuffer.toString("base64");
        send("stage_result", {
          type: "referenceImage",
          data: {
            base64: refBase64,
            survey: primaryRef.survey,
            wavelength: primaryRef.wavelength,
          },
        });

        // ── Stage 4: Change detection ──────────────────────────────
        send("progress", { stage: "change_detection", message: "Running change detection...", progress: 65 });

        const comparison = await compareImages(imageBuffer, referenceImageBuffer);
        changeDetection = comparison.detection;
        diffImageBase64 = comparison.diffImageBase64;

        send("progress", {
          stage: "change_detection",
          message: changeDetection.description,
          progress: 75,
        });
        send("stage_result", { type: "changeDetection", data: changeDetection });
        send("stage_result", { type: "diffImage", data: { base64: diffImageBase64 } });

      } catch (err) {
        send("progress", {
          stage: "archival_fetch",
          message: `Could not fetch reference: ${(err as Error).message}`,
          progress: 65,
        });
      }
    } else {
      send("progress", { stage: "archival_fetch", message: "No coordinates — skipping archival comparison", progress: 65 });
    }

    // ── Determine initial tier ─────────────────────────────────────
    let tier: 1 | 2 | 3;
    if (coordinates && changeDetection) tier = 1;
    else if (coordinates || changeDetection) tier = 2;
    else tier = 3;

    // ── Stage 5: VLM Visual Comparison (parallel with catalog) ──────
    let visualComparison: any = null;
    let catalogMatches: any[] = [];

    const parallelTasks: Promise<void>[] = [];

    // VLM visual comparison (only if we have a reference)
    if (coordinates && referenceImageBuffer) {
      parallelTasks.push(
        (async () => {
          send("progress", { stage: "change_detection", message: "AI visual comparison of epochs...", progress: 76 });
          try {
            const refBase64 = referenceImageBuffer!.toString("base64");
            visualComparison = await vlmCompareImages(
              imageBase64,
              refBase64,
              mimeType,
              coordinates!.ra,
              coordinates!.dec
            );
            send("stage_result", { type: "visualComparison", data: visualComparison });
          } catch (err) {
            console.error("VLM comparison error:", err);
          }
        })()
      );
    }

    // Catalog cross-reference (only if we have coordinates)
    if (coordinates) {
      parallelTasks.push(
        (async () => {
          send("progress", { stage: "catalog_query", message: "Querying SIMBAD and NED catalogs...", progress: 78 });
          try {
            catalogMatches = await catalog.crossReference(coordinates!, 1.0);
            send("progress", {
              stage: "catalog_query",
              message: catalogMatches.length > 0
                ? `Found ${catalogMatches.length} catalog match(es)`
                : "No catalog matches — potentially uncatalogued",
              progress: 82,
            });
            send("stage_result", { type: "catalogMatches", data: catalogMatches });
          } catch (err) {
            console.error("Catalog query error:", err);
          }
        })()
      );
    }

    await Promise.all(parallelTasks);

    // ── Stage 6: AstroSage Synthesis ────────────────────────────────
    send("progress", { stage: "synthesis", message: "AstroSage synthesizing findings...", progress: 85 });

    let synthesis: any = null;
    try {
      synthesis = await synthesizeResults({
        morphologyJson: JSON.stringify(morphology),
        ra: coordinates?.ra || null,
        dec: coordinates?.dec || null,
        simbadResults: JSON.stringify(catalogMatches.filter((m: any) => m.source === "SIMBAD")),
        nedResults: JSON.stringify(catalogMatches.filter((m: any) => m.source === "NED")),
        changeScore: changeDetection?.changeScore || null,
        snr: changeDetection?.signalToNoise || null,
        isSignificant: changeDetection?.isSignificant || null,
        visualComparisonJson: visualComparison ? JSON.stringify(visualComparison) : "",
        userQuestion,
      });
      send("progress", { stage: "synthesis", message: "Synthesis complete", progress: 90 });
      send("stage_result", { type: "synthesis", data: synthesis });
    } catch (err) {
      console.error("Synthesis error:", err);
      send("progress", { stage: "synthesis", message: `Synthesis failed: ${(err as Error).message}`, progress: 90 });
    }

    // ── Stage 7: Discovery Scoring ──────────────────────────────────
    send("progress", { stage: "scoring", message: "Computing discovery score...", progress: 92 });

    const discoveryScore = computeDiscoveryScore({
      morphology,
      catalogMatches,
      changeDetection: changeDetection || null,
      aiDiscoveryPotential: synthesis?.discoveryPotential || "none",
    });

    send("progress", {
      stage: "scoring",
      message: `Discovery score: ${discoveryScore.total}/100 (${discoveryScore.tier})`,
      progress: 98,
    });
    send("stage_result", { type: "discoveryScore", data: discoveryScore });

    // Update tier based on full pipeline
    if (coordinates && changeDetection && synthesis) tier = 1;
    else if (coordinates || synthesis) tier = 2;

    send("progress", { stage: "complete", message: "Analysis complete", progress: 100 });

    // ── Final result ─────────────────────────────────────────────────
    send("result", {
      id: observationId,
      timestamp: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      tier,
      imageQuality,
      morphology,
      annotations,
      coordinates,
      catalogMatches,
      archivalImages,
      changeDetection,
      diffImageBase64,
      visualComparison,
      synthesis,
      discoveryScore,
      modelVersions: {
        vlm: "Kimi-K2.5",
        llm: "AstroSage-8B",
        pipeline: PIPELINE_VERSION,
      },
    });

    // ── Auto-save to observation ledger ───────────────────────────────
    try {
      const supabase = getSupabase();
      // Upload image to storage
      let imageUrl = null;
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
        pipeline_version: PIPELINE_VERSION,
        tier,
        ra: coordinates?.ra || null,
        dec_coord: coordinates?.dec || null,
        field_width: coordinates?.fieldWidth || null,
        field_height: coordinates?.fieldHeight || null,
        orientation: coordinates?.orientation || null,
        pixscale: coordinates?.pixscale || null,
        morphology,
        image_quality: imageQuality,
        catalog_matches: catalogMatches,
        is_uncatalogued: catalogMatches.length === 0 && coordinates != null,
        change_detection: changeDetection,
        visual_comparison: visualComparison,
        archival_images: archivalImages,
        synthesis,
        discovery_score: discoveryScore.total,
        discovery_tier: discoveryScore.tier,
        discovery_score_breakdown: discoveryScore,
        model_versions: { vlm: "Kimi-K2.5", llm: "AstroSage-8B", pipeline: PIPELINE_VERSION },
        user_question: userQuestion,
      }]);
    } catch (saveErr) {
      console.error("Auto-save failed (non-blocking):", saveErr);
    }

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
