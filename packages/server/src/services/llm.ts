import { config } from "../config";
import { llmPrompts, type AstroSageSynthesis } from "@astrovision/pipeline";

const HF_URL = "https://router.huggingface.co/featherless-ai/v1/completions";

/**
 * Call AstroSage LLM with a prompt
 */
async function callLLM(prompt: string, maxTokens = 800): Promise<string> {
  const response = await fetch(HF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.models.llm,
      prompt,
      max_tokens: maxTokens,
      temperature: 0.5,
      top_p: 0.9,
      stop: ["User:", "\nUser", "\n\n\n"],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`AstroSage API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as any;
  return (
    data.choices?.[0]?.text?.trim() ||
    data.choices?.[0]?.message?.content?.trim() ||
    ""
  );
}

/**
 * Run AstroSage synthesis combining all pipeline outputs
 */
export async function synthesizeResults(params: {
  morphologyJson: string;
  ra: number | null;
  dec: number | null;
  simbadResults: string;
  nedResults: string;
  changeScore: number | null;
  snr: number | null;
  isSignificant: boolean | null;
  visualComparisonJson: string;
  userQuestion: string;
}): Promise<AstroSageSynthesis> {
  const prompt = llmPrompts.SYNTHESIS_PROMPT
    .replace("{morphologyJson}", params.morphologyJson)
    .replace("{ra}", params.ra?.toFixed(6) || "unknown")
    .replace("{dec}", params.dec?.toFixed(6) || "unknown")
    .replace("{simbadResults}", params.simbadResults || "none found")
    .replace("{nedResults}", params.nedResults || "none found")
    .replace("{changeScore}", params.changeScore?.toString() || "N/A")
    .replace("{snr}", params.snr?.toFixed(2) || "N/A")
    .replace("{isSignificant}", params.isSignificant?.toString() || "N/A")
    .replace("{visualComparisonJson}", params.visualComparisonJson || "not performed")
    .replace("{userQuestion}", params.userQuestion);

  const raw = await callLLM(prompt, 1000);

  // Try to parse structured JSON
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned) as AstroSageSynthesis;
  } catch {
    // Fallback: extract what we can from text
    return {
      summary: raw.slice(0, 500),
      classification: "See morphology analysis",
      hypotheses: extractListItems(raw, "hypothes"),
      followUpRecommendations: extractListItems(raw, "follow"),
      relevantPapers: extractListItems(raw, "paper"),
      discoveryPotential: "low",
    };
  }
}

/**
 * Generate a narrative report
 */
export async function generateReportNarrative(params: {
  ra: number;
  dec: number;
  classification: string;
  confidence: number;
  discoveryScore: number;
  catalogStatus: string;
  changeDescription: string;
  notableFeatures: string;
}): Promise<string> {
  const prompt = llmPrompts.REPORT_NARRATIVE_PROMPT
    .replace("{ra}", params.ra.toFixed(6))
    .replace("{dec}", params.dec.toFixed(6))
    .replace("{classification}", params.classification)
    .replace("{confidence}", params.confidence.toFixed(2))
    .replace("{discoveryScore}", params.discoveryScore.toString())
    .replace("{catalogStatus}", params.catalogStatus)
    .replace("{changeDescription}", params.changeDescription)
    .replace("{notableFeatures}", params.notableFeatures);

  return callLLM(prompt, 400);
}

/**
 * Helper: extract list items from unstructured text
 */
function extractListItems(text: string, keyword: string): string[] {
  const lines = text.split("\n");
  const items: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line.toLowerCase().includes(keyword)) {
      inSection = true;
      continue;
    }
    if (inSection && (line.startsWith("-") || line.startsWith("•") || line.match(/^\d+\./))) {
      items.push(line.replace(/^[-•\d.]+\s*/, "").trim());
    }
    if (inSection && line.trim() === "" && items.length > 0) {
      break;
    }
  }

  return items.length > 0 ? items : ["See full analysis above"];
}
