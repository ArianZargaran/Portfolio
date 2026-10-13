/**
 * Feature flags. Values come from env on the server and reach the client only
 * through the root loader. Every flag defaults to OFF.
 *
 *   FEATURE_SKILLS_CHAT=1   /skills page, its nav entry and POST /api/chat.
 *                           Paused for the launch (Arian, 2026-10-13); code kept.
 */
export interface Features {
  skillsChat: boolean;
}

const truthy = (v: string | undefined) =>
  /^(1|true|on|yes)$/i.test((v ?? "").trim());

export function readFeatures(
  env: Record<string, string | undefined> = process.env,
): Features {
  return { skillsChat: truthy(env.FEATURE_SKILLS_CHAT) };
}

export const DEFAULT_FEATURES: Features = { skillsChat: false };

/** 404 for a route whose feature is off (thrown from loaders/actions). */
export function featureNotFound(): Response {
  return new Response("Not Found", { status: 404 });
}
