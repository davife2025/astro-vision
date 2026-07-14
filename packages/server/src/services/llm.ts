import { config } from "../config";

// NOTE: router.huggingface.co only exposes the OpenAI-compatible chat endpoint
// at /v1/chat/completions (the provider is selected via a ":provider" suffix on
// the model id, not via a "/featherless-ai/..." URL segment). Hitting a path
// like "/featherless-ai/v1/completions" doesn't match any route on the router,
// so the request falls through to huggingface.co's website and you get back its
// generic HTML 503 page instead of a real API error.
const HF_URL = "https://router.huggingface.co/v1/chat/completions";

/**
 * Call AstroSage LLM with a prompt
 */
async function callLLM(prompt: string, maxTokens = 700): Promise<string> {
  const response = await fetch(HF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `${config.models.llm}:featherless-ai`,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.6,
      top_p: 0.9,
      stop: ["User:", "\nUser", "\n\n\n"],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`AstroSage API error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data: any = await response.json();
  return (
    data.choices?.[0]?.message?.content?.trim() ||
    data.choices?.[0]?.text?.trim() ||
    ""
  );
}

interface AnalysisInputs {
  classification: string;
  description: string;
  ra: number | null;
  dec: number | null;
  diffCount: number | null;
  isAnomaly: boolean;
  visualComparison: string | null;
}

/**
 * AstroSage produces the full explanatory analysis.
 * Takes everything the pipeline gathered and writes a proper scientific explanation.
 */
export async function explainObservation(inputs: AnalysisInputs): Promise<string> {
  const { classification, description, ra, dec, diffCount, isAnomaly, visualComparison } = inputs;

  const coordLine = ra != null && dec != null
    ? `The object's sky coordinates have been resolved to RA ${ra.toFixed(4)}°, Dec ${dec.toFixed(4)}° (J2000).`
    : `The object's sky coordinates could not be resolved (the image likely lacks enough background stars for plate-solving).`;

  const comparisonLine = diffCount != null
    ? isAnomaly
      ? `A pixel-level comparison with a historical archival image of the same region detected ${diffCount} significant variances, which exceeds the anomaly threshold. This may indicate a real observable change such as a transient event, variable object, or other astrophysical change.`
      : `A pixel-level comparison with a historical archival image of the same region detected ${diffCount} variances, below the anomaly threshold, indicating the region appears stable over time.`
    : `No historical comparison was performed because coordinates were unavailable.`;

  const visualLine = visualComparison
    ? `A visual comparison between the new and archival images noted: ${visualComparison}`
    : "";

  const prompt = `You are AstroSage, an expert astrophysics research assistant. A researcher has uploaded an astronomical image to the AstroVision platform and the analysis pipeline has gathered the following information:

VISUAL IDENTIFICATION: The image appears to show a ${classification}. ${description}

COORDINATES: ${coordLine}

TEMPORAL COMPARISON: ${comparisonLine}

${visualLine}

Based on all of the above, write a clear, explanatory scientific analysis for the researcher. Your response should:
1. Explain what this type of object is and its key physical characteristics.
2. Interpret the specific features mentioned in the visual identification.
3. Explain what the temporal comparison result means scientifically.
4. If an anomaly was detected, explain what kind of discovery this could represent and what follow-up observations would confirm it. If the region is stable, explain what that tells us.
5. Be precise and educational, suitable for an advanced undergraduate or researcher.

Write 2-3 well-structured paragraphs. Do not use bullet points or headers.

AstroSage:`;

  const result = await callLLM(prompt, 700);
  return result || "AstroSage analysis could not be generated. Please try again.";
}

/**
 * Plain chat with AstroSage (for the chat tab)
 */
export async function chatWithAstroSage(message: string, history: { role: string; content: string }[] = []): Promise<string> {
  const ctx = history.slice(-6).map(m => `${m.role === "user" ? "User" : "AstroSage"}: ${m.content}`).join("\n\n");
  const prompt = ctx
    ? `You are AstroSage, an expert astrophysics research assistant.\n\n${ctx}\n\nUser: ${message}\n\nAstroSage:`
    : `You are AstroSage, an expert astrophysics research assistant. Answer the following question with scientific precision.\n\nUser: ${message}\n\nAstroSage:`;
  return callLLM(prompt, 600);
}