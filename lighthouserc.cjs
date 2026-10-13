// Lighthouse CI. Mobile emulation (default), 3 runs per URL, results kept as
// local files / workflow artifacts only (no public upload).
const PAGE_ROUTES = ["/", "/work", "/about", "/contact"];
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

module.exports = {
  ci: {
    collect: {
      url: PAGE_ROUTES.map((r) => BASE + r),
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    assert: {
      assertions: {
        // Performance and LCP are "warn" until the redesign replaces the
        // current pages (baseline 2026-10-13: perf 0.72-0.8x, LCP 3-11 s on
        // simulated mobile). Flip to "error" at M5 (see docs/ci.md).
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
