/**
 * GET /api/scene-state -> { sceneId, time, weather, source, expiresAt }
 * Public, cacheable, never errors (falls back to the default scene).
 */
import { sceneDepsFromEnv } from "~/server/scene-config.server";
import { resolveScene } from "~/server/scene-state.server";

export const loader = async () => {
  const state = await resolveScene(new Date(), sceneDepsFromEnv());
  return Response.json(state, {
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
      "X-Robots-Tag": "noindex",
    },
  });
};
