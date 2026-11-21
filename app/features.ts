/**
 * Feature flags. Values come from env on the server and reach the client only
 * through the root loader. Every flag defaults to OFF.
 *
 *   FEATURE_SKILLS_CHAT=1   /skills page, its nav entry and POST /api/chat.
 *                           Paused for the launch (Arian, 2026-10-13); code kept.
 *   (F4, the "Click to pause" hint flag, is gone with click-to-pause:
 *   Ari, Nov 21 2026.)
 *   FEATURE_HERO_PAUSE_LINK=1   F5: a "Pause animations" control below the scene
 *                           that toggles the same freeze state (pending Ari).
 *   FEATURE_HERO_ROTATION_PREFETCH=1  Let the draft auto-rotation fetch its
 *                           next clip 6 s ahead. Off: hero media is fetched
 *                           only on intent or a trigger (rotation pending Ari).
 *   FEATURE_HERO_ROTATION_NOD=1  Keep the nod (E2) in the draft auto-rotation.
 *                           Off: PLAN §3 removed it (Ari, Q3). Review N1.
 */
export interface Features {
  skillsChat: boolean;
  heroPauseLink: boolean;
  heroRotationPrefetch: boolean;
  heroRotationNod: boolean;
}

const truthy = (v: string | undefined) =>
  /^(1|true|on|yes)$/i.test((v ?? "").trim());

export function readFeatures(
  env: Record<string, string | undefined> = process.env,
): Features {
  return {
    skillsChat: truthy(env.FEATURE_SKILLS_CHAT),
    heroPauseLink: truthy(env.FEATURE_HERO_PAUSE_LINK),
    heroRotationPrefetch: truthy(env.FEATURE_HERO_ROTATION_PREFETCH),
    heroRotationNod: truthy(env.FEATURE_HERO_ROTATION_NOD),
  };
}

export const DEFAULT_FEATURES: Features = {
  skillsChat: false,
  heroPauseLink: false,
  heroRotationPrefetch: false,
  heroRotationNod: false,
};

/** 404 for a route whose feature is off (thrown from loaders/actions). */
export function featureNotFound(): Response {
  return new Response("Not Found", { status: 404 });
}
