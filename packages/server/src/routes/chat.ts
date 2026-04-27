import { Router, Request, Response } from "express";
import { config } from "../config";
import { llmPrompts } from "@astrovision/pipeline";

const router = Router();

/**
 * POST /api/chat
 * Chat with AstroSage LLM
 */
router.post("/", async (req: Request, res: Response) => {
  const { message, history = [], maxTokens = 600 } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No message provided" });
  }

  if (!config.hfApiKey) {
    return res.status(500).json({ error: "HF_API_KEY not configured" });
  }

  try {
    // Build prompt with conversation history (last 8 turns)
    const recentHistory = history.slice(-8);
    const conversationContext = recentHistory
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "User" : "AstroSage"}: ${m.content}`
      )
      .join("\n\n");

    const fullPrompt = conversationContext
      ? `${llmPrompts.SYSTEM_PROMPT}\n\nConversation so far:\n${conversationContext}\n\nUser: ${message}\n\nAstroSage:`
      : llmPrompts.CHAT_PROMPT_TEMPLATE.replace("{userMessage}", message);

    const response = await fetch(
      "https://router.huggingface.co/featherless-ai/v1/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.hfApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.models.llm,
          prompt: fullPrompt,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          stop: ["User:", "\nUser", "\n\nUser"],
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `AstroSage API error (${response.status}): ${response.statusText}. ${errBody}`
      );
    }

    const data = (await response.json()) as any;
    const text =
      data.choices?.[0]?.text?.trim() ||
      data.choices?.[0]?.message?.content?.trim() ||
      "I could not generate a response. Please try again.";

    // Clean up common artifacts
    const cleaned = text
      .replace(/^AstroSage:\s*/i, "")
      .replace(/\nUser:.*$/s, "")
      .trim();

    res.json({
      response: cleaned,
      model: config.models.llm,
      tokens: data.usage?.completion_tokens || null,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/chat/suggestions
 * Return contextual conversation starters
 */
router.get("/suggestions", (_req: Request, res: Response) => {
  res.json({
    suggestions: [
      {
        label: "Galaxy Classification",
        prompt: "What are the main types of galaxies in the Hubble sequence and how do they differ?",
      },
      {
        label: "Redshift Analysis",
        prompt: "How does redshift help us determine the distance and age of galaxies?",
      },
      {
        label: "Gravitational Lensing",
        prompt: "Explain how gravitational lensing works and what it reveals about dark matter.",
      },
      {
        label: "Stellar Evolution",
        prompt: "Walk me through the lifecycle of a massive star from formation to supernova.",
      },
      {
        label: "Tidal Interactions",
        prompt: "What observable features indicate that two galaxies are interacting or merging?",
      },
      {
        label: "Transient Events",
        prompt: "What types of astronomical transient events can be detected through image comparison?",
      },
    ],
  });
});

export default router;
