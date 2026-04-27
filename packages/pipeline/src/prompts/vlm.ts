// ─── Kimi K2 VLM Prompt Templates ────────────────────────────────────────────

export const TRIAGE_PROMPT = `You are an astronomical image quality assessor. Analyze this image and respond ONLY with valid JSON (no markdown, no backticks).

{
  "isAstronomical": true/false,
  "overallQuality": "good" | "moderate" | "poor",
  "estimatedStarCount": "many" | "few" | "none",
  "isOverexposed": true/false,
  "isUnderexposed": true/false,
  "hasEnoughStarsForPlateSolving": true/false,
  "issues": ["list of issues found"],
  "recommendation": "brief recommendation for the user"
}

Rules:
- If this is not an astronomical image (selfie, landscape, text, etc.), set isAstronomical to false.
- "many" stars means likely >20 visible point sources.
- hasEnoughStarsForPlateSolving requires at least 10-15 identifiable stars.
- Be concise in issues and recommendation.`;

export const MORPHOLOGY_PROMPT = `You are an expert astronomical morphologist. Analyze this celestial image and provide a detailed morphological decomposition. Respond ONLY with valid JSON (no markdown, no backticks).

{
  "classification": "Spiral" | "Elliptical" | "Irregular" | "Lenticular" | "Peculiar" | "Star" | "Nebula" | "Star Cluster" | "Unknown",
  "subType": "specific Hubble type if galaxy, e.g. Sb, E3, SBc, Irr I",
  "confidence": 0.0 to 1.0,
  "hasBar": true/false/null,
  "spiralArmCount": number or null,
  "armTightness": "tight" | "moderate" | "loose" | null,
  "hasBulge": true/false/null,
  "bulgeProminence": "dominant" | "moderate" | "small" | "none" | null,
  "hasTidalTails": true/false/null,
  "isEdgeOn": true/false/null,
  "isMerging": true/false/null,
  "asymmetry": "symmetric" | "mildly asymmetric" | "strongly asymmetric" | null,
  "visibleHIIRegions": true/false/null,
  "notableFeatures": ["list of any unusual or noteworthy features"]
}

Rules:
- Use null for fields you cannot determine from the image.
- Be conservative with confidence — only use >0.9 if the classification is unambiguous.
- notableFeatures should include anything unusual: rings, jets, shells, dust lanes, companions, gravitational arcs.
- If this is a star field with no dominant object, classify as "Star Cluster" or "Unknown".`;

export const VISUAL_COMPARISON_PROMPT = `You are an expert astronomical change detection analyst. You are shown two images of the SAME region of sky taken at different times.

Image 1 (NEW): The recently uploaded observation.
Image 2 (REFERENCE): An archival image of the same region from a historical survey.

The coordinates are: RA {ra}, Dec {dec}

Analyze both images carefully and respond ONLY with valid JSON (no markdown, no backticks):

{
  "differences": ["list every observable difference between the two images"],
  "artifacts": ["list any differences you believe are instrumental artifacts, not real changes"],
  "potentialChanges": ["list differences that could represent genuine astrophysical changes"],
  "confidence": 0.0 to 1.0
}

Rules:
- Instrumental artifacts include: diffraction spikes, CCD bleeding, satellite trails, different exposure levels, different telescope optics, different pixel scales.
- Genuine changes include: new point sources (possible nova/supernova), brightness changes in known objects, morphological changes, disappearance of features, new extended emission.
- Be conservative — most differences between archival and modern images are instrumental, not astrophysical.
- A confidence of >0.7 for potential changes requires strong visual evidence.`;

export const FOLLOW_UP_PROMPT = `You are an expert astrophysicist analyzing a celestial image with a researcher. The image has already been classified with the following results:

Classification: {classification} ({subType}, confidence: {confidence})
Coordinates: RA {ra}, Dec {dec}
Notable features: {notableFeatures}
Discovery score: {discoveryScore}/100

The researcher asks: "{question}"

Respond conversationally but with scientific precision. Reference specific features visible in the image. If the question requires information beyond what the image shows, say so and suggest what observations or data would help answer it.`;

export const ANNOTATION_PROMPT = `You are an astronomical image annotator. Identify key features in this celestial image and provide their approximate positions. Respond ONLY with valid JSON (no markdown, no backticks).

{
  "annotations": [
    {
      "label": "feature name",
      "description": "brief description",
      "x_percent": 0-100,
      "y_percent": 0-100,
      "radius_percent": 1-20,
      "type": "core" | "arm" | "bulge" | "companion" | "star" | "artifact" | "tidal" | "hii_region" | "dust_lane" | "other"
    }
  ]
}

Rules:
- x_percent and y_percent are the center of the feature as a percentage of image width/height (0,0 = top-left).
- radius_percent is the approximate size of the feature.
- Include the most prominent 3-8 features. Do not annotate every star.
- Focus on scientifically interesting structures.`;
