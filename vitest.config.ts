/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./test/setup-test-env.ts"],
    include: ["./app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}"],
      exclude: [
        "app/**/*.test.{ts,tsx}",
        "app/**/*.d.ts",
        "app/**/*.server.{ts,tsx}",
        "app/entry.client.tsx",
        "app/entry.server.tsx",
        "app/root.tsx",
        "app/routes/**",
        "app/constants/**",
        "app/components/icons/**",
        "app/components/logos/**",
        "app/components/illustrations/{child,couple,pilot,teenager}.tsx",
        "app/components/illustrations/illustrations-track/**",
        "app/components/backgrounds/blurry-circles/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
