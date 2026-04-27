import { config } from "../config";
import {
  vlmPrompts,
  type ImageQualityAssessment,
  type MorphologyFeatures,
  type VisualComparison,
} from "@astrovision/pipeline";

const HF_INFERENCE_URL = "https://router.huggingface.co/novita/v3/openai/chat/completions";

interface VLMResponse {
  raw: string;
  parsed: any;
}

/**
 * Call Kimi K2.5 with an image and a text prompt
 */
async function callVLM(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  maxTokens = 800
): Promise<VLMResponse> {
  const response = await fetch(HF_INFERENCE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.models.vlm,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`VLM API error (${response.status}): ${response.statusText}. ${errText}`);
  }

  const data = (await response.json()) as any;
  const raw =
    data.choices?.[0]?.message?.content?.trim() ||
    data.choices?.[0]?.text?.trim() ||
    "";

  // Try to parse as JSON
  let parsed: any = null;
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // VLM may return text rather than JSON — that's okay for some prompts
    parsed = null;
  }

  return { raw, parsed };
}

/**
 * Call Kimi K2.5 with TWO images for comparison
 */
async function callVLMComparison(
  image1Base64: string,
  image2Base64: string,
  mimeType: string,
  prompt: string,
  maxTokens = 800
): Promise<VLMResponse> {
  const response = await fetch(HF_INFERENCE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.models.vlm,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${image1Base64}`,
              },
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image2Base64}`,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`VLM comparison error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as any;
  const raw = data.choices?.[0]?.message?.content?.trim() || "";

  let parsed: any = null;
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = null;
  }

  return { raw, parsed };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Stage 1: Image quality triage
 */
export async function triageImage(
  imageBase64: string,
  mimeType: string
): Promise<ImageQualityAssessment> {
  const { parsed, raw } = await callVLM(imageBase64, mimeType, vlmPrompts.TRIAGE_PROMPT, 400);

  if (parsed) return parsed as ImageQualityAssessment;

  // Fallback if JSON parsing fails
  return {
    isAstronomical: true,
    overallQuality: "moderate",
    estimatedStarCount: "few",
    isOverexposed: false,
    isUnderexposed: false,
    hasEnoughStarsForPlateSolving: true,
    issues: ["Could not parse structured response"],
    recommendation: raw.slice(0, 200),
  };
}

/**
 * Stage 2: Detailed morphological analysis
 */
export async function analyzeMorphology(
  imageBase64: string,
  mimeType: string
): Promise<MorphologyFeatures> {
  const { parsed, raw } = await callVLM(
    imageBase64,
    mimeType,
    vlmPrompts.MORPHOLOGY_PROMPT,
    800
  );

  if (parsed) return parsed as MorphologyFeatures;

  // Fallback
  return {
    classification: "Unknown",
    subType: "Unknown",
    confidence: 0.3,
    hasBar: null,
    spiralArmCount: null,
    armTightness: null,
    hasBulge: null,
    bulgeProminence: null,
    hasTidalTails: null,
    isEdgeOn: null,
    isMerging: null,
    asymmetry: null,
    visibleHIIRegions: null,
    notableFeatures: [raw.slice(0, 200)],
  };
}

/**
 * Stage 3: Get annotation positions for overlay
 */
export async function getAnnotations(
  imageBase64: string,
  mimeType: string
): Promise<any[]> {
  const { parsed } = await callVLM(
    imageBase64,
    mimeType,
    vlmPrompts.ANNOTATION_PROMPT,
    600
  );

  return parsed?.annotations || [];
}

/**
 * Stage 4: Visual comparison between two epochs
 */
export async function compareImages(
  newImageBase64: string,
  referenceImageBase64: string,
  mimeType: string,
  ra: number,
  dec: number
): Promise<VisualComparison> {
  const prompt = vlmPrompts.VISUAL_COMPARISON_PROMPT
    .replace("{ra}", ra.toFixed(6))
    .replace("{dec}", dec.toFixed(6));

  const { parsed, raw } = await callVLMComparison(
    newImageBase64,
    referenceImageBase64,
    mimeType,
    prompt,
    800
  );

  if (parsed) return parsed as VisualComparison;

  return {
    differences: [raw.slice(0, 300)],
    artifacts: [],
    potentialChanges: [],
    confidence: 0.3,
  };
}

/**
 * Follow-up conversation about an image
 */
export async function followUpQuestion(
  imageBase64: string,
  mimeType: string,
  question: string,
  context: {
    classification: string;
    subType: string;
    confidence: number;
    ra?: number;
    dec?: number;
    notableFeatures: string[];
    discoveryScore: number;
  }
): Promise<string> {
  const prompt = vlmPrompts.FOLLOW_UP_PROMPT
    .replace("{classification}", context.classification)
    .replace("{subType}", context.subType)
    .replace("{confidence}", String(context.confidence))
    .replace("{ra}", context.ra ? context.ra.toFixed(6) : "unknown")
    .replace("{dec}", context.dec ? context.dec.toFixed(6) : "unknown")
    .replace("{notableFeatures}", context.notableFeatures.join(", ") || "none")
    .replace("{discoveryScore}", String(context.discoveryScore))
    .replace("{question}", question);

  const { raw } = await callVLM(imageBase64, mimeType, prompt, 600);
  return raw;
}
