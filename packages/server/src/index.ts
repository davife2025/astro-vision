import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config, validateConfig } from "./config";
import analysisRoutes from "./routes/analysis";
import chatRoutes from "./routes/chat";
import communityRoutes from "./routes/community";
import observationsRoutes from "./routes/observations";
import { PIPELINE_VERSION } from "@astrovision/pipeline";

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/analysis", analysisRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/observations", observationsRoutes);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  const { status } = validateConfig();
  res.json({
    name: "AstroVision API",
    version: "1.0.0",
    pipelineVersion: PIPELINE_VERSION,
    status,
    endpoints: [
      "POST /api/analysis/full     — Full discovery pipeline (SSE)",
      "POST /api/analysis/quick    — Quick VLM-only analysis",
      "POST /api/chat              — AstroSage conversation",
      "GET  /api/observations      — List observations",
      "GET  /api/observations/:id  — Get observation detail",
      "POST /api/observations      — Save observation",
      "GET  /api/community/posts   — Community feed",
      "POST /api/community/posts   — Create post",
    ],
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  const { valid, missing, status } = validateConfig();

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AstroVision API v1.0.0
  Pipeline: ${PIPELINE_VERSION}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Port:        ${config.port}
  Environment: ${config.nodeEnv}
  HuggingFace: ${status.huggingface ? "✓ ready" : "✗ missing"}
  Astrometry:  ${status.astrometry ? "✓ ready" : "✗ missing"}
  Supabase:    ${status.supabase ? "✓ connected" : "✗ missing"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${missing.length > 0 ? `  ⚠ Missing: ${missing.join(", ")}\n` : ""}  `);
});

export default app;
