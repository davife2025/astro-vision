import dotenv from "dotenv";
// Load .env from monorepo root (dev) — silently skips in production where env vars are set directly
dotenv.config({ path: "../../.env" });
dotenv.config({ path: ".env" });

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // HuggingFace
  hfApiKey: process.env.HF_API_KEY || "",

  // Astrometry
  astrometryApiKey: process.env.ASTROMETRY_API_KEY || "",

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || "",

  // CORS
  clientUrl: process.env.VITE_API_URL
    ? process.env.VITE_API_URL.replace("/api", "")
    : "http://localhost:5173",

  // Models
  models: {
    vlm: "Qwen/Qwen3.5-35B-A3B:novita",
    llm: "AstroMLab/AstroSage-8B",
    llmLarge: "AstroMLab/AstroSage-LLaMA-3.1-70B",
  },
} as const;

export function validateConfig() {
  const missing: string[] = [];
  if (!config.hfApiKey) missing.push("HF_API_KEY");
  if (!config.astrometryApiKey) missing.push("ASTROMETRY_API_KEY");
  if (!config.supabaseUrl) missing.push("SUPABASE_URL");
  if (!config.supabaseServiceKey) missing.push("SUPABASE_SERVICE_KEY");

  return {
    valid: missing.length === 0,
    missing,
    status: {
      huggingface: !!config.hfApiKey,
      astrometry: !!config.astrometryApiKey,
      supabase: !!config.supabaseUrl && !!config.supabaseServiceKey,
    },
  };
}
