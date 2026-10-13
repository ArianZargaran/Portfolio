# CI and quality gates

Status: workflow files written on the local `redesign` branch only. Nothing has
been pushed, so none of these has run on GitHub yet. Validated locally as noted
below (2026-10-13).

## Workflows (`.github/workflows/`)

| File                     | Trigger                                                      | What it does                                                                                                                                                                                    | Fails on                                                                                                                             |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`                 | push `main`/`redesign`, PRs                                  | Node 20 + 22: `npm ci`, lint, typecheck, unit tests (incl. contract + no-phone tests; installs `poppler-utils`), build                                                                          | any step                                                                                                                             |
| `codeql.yml`             | push, PRs, weekly Mon                                        | CodeQL `javascript-typescript`, `security-extended` queries                                                                                                                                     | code-scanning alerts (configure severity in repo settings)                                                                           |
| `audit.yml`              | lockfile changes, daily, manual                              | `npm audit --omit=dev --audit-level=high`; full audit report-only; `npm audit signatures`; on PRs `dependency-review-action`                                                                    | high/critical in production deps; bad signatures; new high-severity deps in a PR                                                     |
| `quality.yml`            | push, PRs, manual                                            | Builds once (`BUNDLE_REPORT=1`), then in parallel against `npm start` on the runner: bundle budgets, CSP check, axe per route, Lighthouse CI                                                    | budget exceeded; CSP missing/weak or any browser CSP violation; new serious/critical axe violation; Lighthouse error-level assertion |
| `uptime.yml`             | every 30 min; link check daily 13:17 UTC (~08:17 CT); manual | GET the live site routes (status + latency); `lychee` link check of the main pages; opens one tracking issue per kind (`uptime-alert`, `broken-links`), comments on repeats, closes on recovery | non-2xx/3xx or broken links                                                                                                          |
| `.github/dependabot.yml` | weekly Mon 07:00 CT                                          | npm + Actions updates, grouped (react-router, testing, lint, actions); framework/React majors ignored                                                                                           | n/a                                                                                                                                  |

Notes:

- `uptime.yml` is the only workflow that touches production, and only with read-only GETs. GitHub runs schedules from the **default branch only**, so it does nothing until it reaches `main`.
- No workflow deploys. Vercel deploys are configured in Vercel, not here.
- Permissions are least-privilege per workflow (`contents: read`; `security-events: write` for CodeQL; `issues: write` for uptime only).

## Scripts (`scripts/ci/`, also as npm scripts)

| npm script     | Script             | Notes                                                                                                                                                                                                                                                                                |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check:bundle` | `check-bundle.mjs` | gzip sizes from `build/client/assets`; initial JS = `entry.client` + `root` and their static imports (Vite manifest, needs `BUNDLE_REPORT=1 npm run build`). Budgets in `bundle-budgets.json`.                                                                                       |
| `check:csp`    | `check-csp.mjs`    | Per route: CSP present, nonce in `script-src`, no `unsafe-inline`/`unsafe-eval` for scripts, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `nosniff`; every `<script>` carries the nonce; then Chromium loads each route and fails on any CSP console violation. |
| `check:a11y`   | `a11y.mjs`         | `@axe-core/playwright`, WCAG 2.0/2.1 A+AA, desktop 1440x900 and mobile 390x844, reduced motion. Fails on serious/critical violations not in `a11y-baseline.json`; prints baseline entries that are now fixed.                                                                        |
| `lhci`         | `lighthouserc.cjs` | Mobile, 3 runs on `/`, `/work`, `/about`, `/contact`. Errors: a11y ≥ 0.9, best practices ≥ 0.9, SEO ≥ 0.9, CLS ≤ 0.1. Warnings (until M5): performance ≥ 0.8, LCP ≤ 2.5 s, TBT ≤ 300 ms. Reports to `.lighthouseci/` (no public upload).                                             |

Routes checked are listed once in `scripts/ci/routes.mjs`; add new routes there.

## Run locally

```bash
BUNDLE_REPORT=1 npm run build && npm run check:bundle
PORT=3123 npm start &                      # production preview
export BASE_URL=http://localhost:3123
npm run check:csp && npm run check:a11y
CHROME_PATH=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | head -1) npm run lhci
actionlint                                 # lint the workflow files
```

## Local validation results (2026-10-13)

- `actionlint` 1.7.x: all workflows clean. `dependabot.yml` parses.
- Bundle (gzip): initial JS 132.3 kB / 150; total JS 204.2 kB / 240; CSS 19.6 kB / 25; largest chunk 44.4 kB / 55. Pass.
- CSP: 8 routes pass, zero browser violations.
- axe: pass with baseline. Fixed `link-name` (icon-only social links, /about home link). Baselined: `color-contrast` on `/`, `/work`, `/about`, `/contact`, both diagrams; `link-in-text-block` and `scrollable-region-focusable` on the marshal diagram.
- Lighthouse (simulated mobile, local preview): a11y 0.95, best practices 0.96-1, SEO 1, CLS ≤ 0.01 on all four routes (pass). Performance / LCP: `/` 0.80 / 4.7 s, `/work` 0.75 / 6.1 s, `/about` 0.72 / 10.9 s, `/contact` 0.92 / 3.0 s (warnings).
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities, after moving `@vercel/react-router` (build-time only) to devDependencies; its tree (`ts-morph` → `fast-glob` → `micromatch` → `braces`, and `ajv`) still has 7 high + 1 moderate advisories, build-time only, no upstream fix yet. `npm audit signatures`: passes with npm 10 (CI's Node 22); npm 9 fails with an expired-key error (npm bug).
- Not run locally: CodeQL, dependency-review, uptime (needs GitHub).

## Follow-ups

- Add Cypress e2e to CI (M3).
- Make Lighthouse performance/LCP errors at M5; add a three.js lazy-chunk budget at M4 (initial JS budget must not grow).
- Shrink `a11y-baseline.json` to empty before launch.
- Self-host Google Fonts (drops two CSP hosts, helps LCP).
