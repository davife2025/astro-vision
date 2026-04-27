// ─── Pipeline Types ──────────────────────────────────────────────────────────

export interface Coordinates {
  ra: number;
  dec: number;
  fieldWidth?: number;
  fieldHeight?: number;
  orientation?: number;
  pixscale?: number;
}

export interface MorphologyFeatures {
  classification: string;           // e.g. "Spiral", "Elliptical", "Irregular"
  subType: string;                  // e.g. "Sb", "E3", "Irr I"
  confidence: number;               // 0-1
  hasBar: boolean | null;
  spiralArmCount: number | null;
  armTightness: string | null;      // "tight", "moderate", "loose"
  hasBulge: boolean | null;
  bulgeProminence: string | null;   // "dominant", "moderate", "small", "none"
  hasTidalTails: boolean | null;
  isEdgeOn: boolean | null;
  isMerging: boolean | null;
  asymmetry: string | null;         // "symmetric", "mildly asymmetric", "strongly asymmetric"
  visibleHIIRegions: boolean | null;
  notableFeatures: string[];
}

export interface ImageQualityAssessment {
  isAstronomical: boolean;
  overallQuality: "good" | "moderate" | "poor";
  estimatedStarCount: string;       // "many", "few", "none"
  isOverexposed: boolean;
  isUnderexposed: boolean;
  hasEnoughStarsForPlateSolving: boolean;
  issues: string[];
  recommendation: string;
}

export interface CatalogMatch {
  source: "SIMBAD" | "NED";
  objectName: string | null;
  objectType: string | null;
  distance: number | null;          // arcseconds from query position
  redshift: number | null;
  knownProperties: Record<string, string>;
}

export interface ChangeDetection {
  changeScore: number;              // raw pixel diff count
  signalToNoise: number;            // SNR of detected changes
  significantRegions: number;       // clusters of change above threshold
  isSignificant: boolean;
  description: string;
}

export interface DiscoveryScore {
  total: number;                    // 0-100
  morphologyAnomaly: number;        // 0-25
  catalogStatus: number;            // 0-25 (uncatalogued = high)
  changeSignificance: number;       // 0-25
  aiAssessment: number;             // 0-25
  tier: "routine" | "interesting" | "notable" | "significant" | "candidate_discovery";
}

export interface ArchivalImage {
  url: string;
  survey: string;                   // "DSS", "SDSS", "2MASS", "GALEX"
  wavelength: string;               // "optical", "infrared", "ultraviolet"
  epoch: string | null;             // observation date if available
}

export interface VisualComparison {
  differences: string[];
  artifacts: string[];
  potentialChanges: string[];
  confidence: number;
}

export interface AstroSageSynthesis {
  summary: string;
  classification: string;
  hypotheses: string[];
  followUpRecommendations: string[];
  relevantPapers: string[];
  discoveryPotential: string;
}

export interface PipelineResult {
  id: string;
  timestamp: string;
  pipelineVersion: string;

  // Tier 1: Full analysis
  imageQuality: ImageQualityAssessment;
  morphology: MorphologyFeatures;
  coordinates: Coordinates | null;
  catalogMatches: CatalogMatch[];
  archivalImages: ArchivalImage[];
  changeDetection: ChangeDetection | null;
  visualComparison: VisualComparison | null;
  synthesis: AstroSageSynthesis;
  discoveryScore: DiscoveryScore;

  // Metadata
  tier: 1 | 2 | 3;                 // 1=full, 2=no coordinates, 3=VLM only
  modelVersions: {
    vlm: string;
    llm: string;
    pipeline: string;
  };
}

export type PipelineStage =
  | "triage"
  | "morphology"
  | "plate_solving"
  | "catalog_query"
  | "archival_fetch"
  | "change_detection"
  | "visual_comparison"
  | "synthesis"
  | "scoring"
  | "complete"
  | "error";

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  progress: number;                 // 0-100
  partialResult?: Partial<PipelineResult>;
}
