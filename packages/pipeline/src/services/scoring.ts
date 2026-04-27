import type {
  MorphologyFeatures,
  CatalogMatch,
  ChangeDetection,
  DiscoveryScore,
} from "../types";

/**
 * Compute a 0–100 discovery score from pipeline outputs.
 * 
 * Components (each 0–25):
 *   morphologyAnomaly  — unusual features, low confidence, asymmetry
 *   catalogStatus      — uncatalogued = high score
 *   changeSignificance — SNR-weighted change detection
 *   aiAssessment       — mapped from AstroSage discoveryPotential
 */
export function computeDiscoveryScore(params: {
  morphology: MorphologyFeatures;
  catalogMatches: CatalogMatch[];
  changeDetection: ChangeDetection | null;
  aiDiscoveryPotential: string; // "none" | "low" | "moderate" | "high" | "very_high"
}): DiscoveryScore {
  const { morphology, catalogMatches, changeDetection, aiDiscoveryPotential } = params;

  // ── Morphology anomaly (0–25) ──────────────────────────────────────
  let morphologyAnomaly = 0;

  // Unusual features boost score
  morphologyAnomaly += Math.min(morphology.notableFeatures.length * 3, 10);

  // Low classification confidence = more unusual
  if (morphology.confidence < 0.5) morphologyAnomaly += 8;
  else if (morphology.confidence < 0.7) morphologyAnomaly += 4;

  // Asymmetry
  if (morphology.asymmetry === "strongly asymmetric") morphologyAnomaly += 5;
  else if (morphology.asymmetry === "mildly asymmetric") morphologyAnomaly += 2;

  // Tidal tails or merging
  if (morphology.hasTidalTails) morphologyAnomaly += 3;
  if (morphology.isMerging) morphologyAnomaly += 3;

  morphologyAnomaly = Math.min(morphologyAnomaly, 25);

  // ── Catalog status (0–25) ──────────────────────────────────────────
  let catalogStatus = 0;

  if (catalogMatches.length === 0) {
    // Completely uncatalogued
    catalogStatus = 25;
  } else if (catalogMatches.length <= 2) {
    // Sparsely catalogued
    catalogStatus = 10;
  } else {
    // Well-known object
    catalogStatus = 2;
  }

  // ── Change significance (0–25) ─────────────────────────────────────
  let changeSignificance = 0;

  if (changeDetection) {
    if (changeDetection.signalToNoise >= 10) changeSignificance = 25;
    else if (changeDetection.signalToNoise >= 5) changeSignificance = 18;
    else if (changeDetection.signalToNoise >= 3) changeSignificance = 12;
    else if (changeDetection.signalToNoise >= 2) changeSignificance = 6;
    else changeSignificance = 0;

    // Boost for multiple significant regions
    changeSignificance = Math.min(
      changeSignificance + changeDetection.significantRegions * 2,
      25
    );
  }

  // ── AI assessment (0–25) ───────────────────────────────────────────
  const aiMap: Record<string, number> = {
    none: 0,
    low: 5,
    moderate: 12,
    high: 20,
    very_high: 25,
  };
  const aiAssessment = aiMap[aiDiscoveryPotential] ?? 0;

  // ── Total ──────────────────────────────────────────────────────────
  const total = morphologyAnomaly + catalogStatus + changeSignificance + aiAssessment;

  // ── Tier ───────────────────────────────────────────────────────────
  let tier: DiscoveryScore["tier"];
  if (total >= 80) tier = "candidate_discovery";
  else if (total >= 60) tier = "significant";
  else if (total >= 40) tier = "notable";
  else if (total >= 20) tier = "interesting";
  else tier = "routine";

  return {
    total,
    morphologyAnomaly,
    catalogStatus,
    changeSignificance,
    aiAssessment,
    tier,
  };
}
