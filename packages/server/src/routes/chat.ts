import { Router, Request, Response } from "express";
import { config } from "../config";
import { llmPrompts } from "@astrovision/pipeline";

const router = Router();

/**
 * POST /api/chat
 * Chat with AstroSage LLM
 */
router.post("/", async (req: Request, res: Response) => {
  const { message, history = [], maxTokens = 500 } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No message provided" });
  }

  if (!config.hfApiKey) {
    return res.status(500).json({ error: "HF_API_KEY not configured" });
  }

  try {
    // Build prompt with conversation history
    const conversationContext = history
      .slice(-6) // Last 6 messages for context
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "AstroSage"}: ${m.content}`)
      .join("\n");

    const fullPrompt = conversationContext
      ? `${llmPrompts.SYSTEM_PROMPT}\n\n${conversationContext}\nUser: ${message}\nAstroSage:`
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
          stop: ["User:", "\nUser"],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AstroSage API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const text =
      data.choices?.[0]?.text?.trim() ||
      data.choices?.[0]?.message?.content?.trim() ||
      "I could not generate a response. Please try again.";

    res.json({
      response: text,
      model: config.models.llm,
      usage: data.usage || null,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
