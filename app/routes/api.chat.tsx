import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { singleton } from "~/singleton.server";
import { retrieveRelevant } from "~/utils/rag/embeddings.server";
import { generateAnswer } from "~/utils/rag/generate.server";
import { createRateLimiter } from "~/utils/rag/rate-limit.server";
import { getSkillReply } from "~/utils/skills-chat";

/* Public, unauthenticated endpoint on a personal site with no traffic
   monitoring — the rate limit + static-fallback pair (see below) is the only
   thing standing between this and an open-ended API bill. Per-process, not
   distributed: fine for a single-instance deploy, resets on redeploy. */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_QUESTION_LENGTH = 300;

const rateLimiter = singleton("rag-rate-limiter", () =>
  createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS),
);

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!question) {
    return json({ error: "question is required" }, { status: 400 });
  }
  const truncated = question.slice(0, MAX_QUESTION_LENGTH);

  // Best-effort client identity for rate limiting — falls back to a shared
  // bucket if no proxy header is present (e.g. local dev), which just means
  // local requests share one limit rather than going unlimited.
  const clientKey = request.headers.get("x-forwarded-for") ?? "unknown";
  const withinRateLimit = rateLimiter.check(clientKey);

  const hasApiKeys = Boolean(
    process.env.ANTHROPIC_API_KEY && process.env.VOYAGE_API_KEY,
  );

  if (!withinRateLimit || !hasApiKeys) {
    return json({ reply: getSkillReply(truncated), source: "fallback" });
  }

  try {
    const context = await retrieveRelevant(truncated);
    const reply = await generateAnswer(truncated, context);
    return json({ reply, source: "rag" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("RAG pipeline failed, falling back to static reply:", error);
    return json({ reply: getSkillReply(truncated), source: "fallback" });
  }
};
