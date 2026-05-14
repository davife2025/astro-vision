import { config } from "../config";

const HF_INFERENCE_URL = "https://router.huggingface.co/v1/chat/completions";

interface VLMResult {
  description: string;
  classification: string;
}

/**
 * Send image to VLM and get:
 *  - A one-sentence description of what the object is
 *  - A short classification label (Spiral Galaxy, Elliptical Galaxy, Star, Nebula, etc.)
 */
export async function identifyAndClassify(imageDataUrl: string): Promise<VLMResult> {
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
            { type: "image_url", image_url: { url: imageDataUrl } },
            {
              type: "text",
              text: `Look at this astronomical image. Respond with exactly two lines:
Line 1: A one-sentence description of what this celestial object appears to be.
Line 2: A short classification label (e.g. "Spiral Galaxy", "Elliptical Galaxy", "Star Cluster", "Nebula", "Supernova Remnant", "Star Field").
Do not add any other text.`,
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`VLM API error (${response.status}): ${response.statusText}. ${errText}`);
  }

  const data: any = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || "";

  // Parse two-line response
  const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean);
  let description = lines[0] || "A celestial object captured in deep space.";
  let classification = lines[1] || "Galaxy";

  // Clean up prefixes the model sometimes adds
  description = description.replace(/^(line 1:|description:|1\.)\s*/i, "").trim();
  classification = classification.replace(/^(line 2:|classification:|2\.)\s*/i, "").trim();

  return { description, classification };
}

/**
 * Optional: Visual comparison between two images
 * Used if you want VLM's qualitative read on the difference
 */
export async function compareImagesVLM(
  newImageDataUrl: string,
  referenceImageUrl: string
): Promise<string> {
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
            { type: "image_url", image_url: { url: newImageDataUrl } },
            { type: "image_url", image_url: { url: referenceImageUrl } },
            {
              type: "text",
              text: "These two images show the same region of sky at different times. Image 1 is the recent observation, Image 2 is the historical archive. In 2-3 sentences, describe any observable differences. Distinguish likely instrumental artifacts from possible real astronomical changes. If they look essentially the same, say so.",
            },
          ],
        },
      ],
      max_tokens: 250,
      temperature: 0.3,
    }),
  });

  if (!response.ok) return "Could not perform visual comparison.";

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "No comparison available.";
}
