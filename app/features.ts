/**
 * Feature flags. Values come from env on the server and reach the client only
 * through the root loader. Every flag defaults to OFF.
 *
 *   FEATURE_SKILLS_CHAT=1   /skills page, its nav entry and POST /api/chat.
 *                           Paused for the launch (Arian, 2026-10-13); code kept.
 *   FEATURE_HERO_FREEZE_HINT=1  F4: a brief "Click to pause" hint the first time
 *                           the pointer enters the animated scene (pending Ari).
 *   FEATURE_HERO_PAUSE_LINK=1   F5: a "Pause animations" control below the scene
 *                           that toggles the same freeze state (pending Ari).
 */
export interface Features {
  skillsChat: boolean;
  heroFreezeHint: boolean;
  heroPauseLink: boolean;
}

const truthy = (v: string | undefined) =>
  /^(1|true|on|yes)$/i.test((v ?? "").trim());

export function readFeatures(
  env: Record<string, string | undefined> = process.env,
): Features {
  return {
    skillsChat: truthy(env.FEATURE_SKILLS_CHAT),
    heroFreezeHint: truthy(env.FEATURE_HERO_FREEZE_HINT),
    heroPauseLink: truthy(env.FEATURE_HERO_PAUSE_LINK),
  };
}

export const DEFAULT_FEATURES: Features = {
  skillsChat: false,
  heroFreezeHint: false,
  heroPauseLink: false,
};

/** 404 for a route whose feature is off (thrown from loaders/actions). */
export function featureNotFound(): Response {
  return new Response("Not Found", { status: 404 });
}
