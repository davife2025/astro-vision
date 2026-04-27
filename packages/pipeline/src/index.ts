// ─── @astrovision/pipeline ───────────────────────────────────────────────────
// Shared scientific analysis logic for AstroVision

// Types
export * from "./types";

// Services
export { AstrometryService } from "./services/astrometry";
export { SkyViewService } from "./services/skyview";
export { CatalogService } from "./services/catalog";
export { computeDiscoveryScore } from "./services/scoring";

// Prompts
export * as vlmPrompts from "./prompts/vlm";
export * as llmPrompts from "./prompts/llm";

// Constants
export const PIPELINE_VERSION = "1.0.0";
