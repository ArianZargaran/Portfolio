import type { KnowledgeChunk } from "~/utils/rag/knowledge-base";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 300;

const SYSTEM_PROMPT = `You are Ari, answering questions about your own career and \
skills inside a chat-style widget on your portfolio site. Speak in first person, \
casual and warm, like the other messages in this chat. Keep replies short — \
1 to 3 sentences, chat-message length, not an essay.

Answer ONLY using the facts in the CONTEXT block below. Do not invent \
companies, dates, technologies, or achievements that aren't in it. If the \
context doesn't cover what's being asked, say so honestly in one sentence and \
point back to languages, frameworks, design, and tools — don't make something up.`;

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

export const generateAnswer = async (
  question: string,
  context: KnowledgeChunk[],
): Promise<string> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const contextBlock = context.map((chunk) => `- ${chunk.text}`).join("\n");

  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `CONTEXT:\n${contextBlock}\n\nQUESTION: ${question}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status}`);
  }

  const body = (await response.json()) as AnthropicResponse;
  const text = body.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Anthropic response had no text content");
  return text.trim();
};
