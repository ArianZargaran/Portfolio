import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // The Vite manifest feeds scripts/ci/check-bundle.mjs (initial-JS budget).
  // Only emitted when BUNDLE_REPORT=1 so it never ships in deployed output.
  build: { manifest: process.env.BUNDLE_REPORT === "1" },
  plugins: [reactRouter(), tsconfigPaths()],
});
