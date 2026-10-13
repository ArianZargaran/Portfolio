# ari.soy redesign: architecture

Status: DRAFT (full-stack engineer, 2026-10-13). Branch `redesign`, local only. Nothing here is deployed.
Source of truth: `portfolio-brain/graph.yaml`. If this doc disagrees with the graph, the graph wins.

## 0. Current codebase (audit, commit 25f7fa6)
- **Stack:** Remix 2.17 on the **classic compiler** (`remix.config.js`, CJS, not Vite), React 18, TypeScript 5.6, custom **Express** server (`server.ts`, helmet, compression, morgan, trailing-slash redirect), bundled with esbuild to `build/server.js`. Animation: `motion` 12 and `animatea`. CSS modules + PostCSS.
- **Routes (flat routes):** `_index`, `about-me`, `work.($slug)`, 9× `work_.diagrams.*`, `contact`, `skills` + `api.chat` (RAG chat: Anthropic + Voyage, static fallback), `blog` (empty), `projects`, `healthcheck`.
- **Content:** typed data in `app/constants/` (`work-cards.ts` 14 cards with stable slugs, `timeline-data-set.ts`, `main-menu-options.ts`); images and resume PDF in `public/`.
- **Tests:** Vitest + Testing Library + happy-dom (14 test files, colocated); MSW mocks; Cypress e2e (only `smoke.cy.ts`).
- **CI:** one GitHub workflow, `lint-repo.yml` (lint only, Node 18). Typecheck, unit and e2e are **not** run in CI. 3 open Dependabot branches (checkout v6, setup-node v6, cypress action v7).
- **Deploy:** README says "Deployed to Vercel from `main`", but there is no `vercel.json` and the app runs as a long-lived Express server. How Vercel builds it today needs checking in the Vercel dashboard (question Q1).
- **Env:** `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` (skills chat only).
- **Debt / risks:** classic compiler is in maintenance (Vite plugin is the supported path, and React Router 7 is the successor); Node 18 in CI is EOL; CSP disabled; phone number still on site (`logos/phone.tsx`, contact) against decision 3.

## 1. Route structure
A shared pathless layout keeps the scene mounted while the URL drives the camera.

```
app/routes/
  _scene.tsx                 layout: still frame + <SceneMount/> + <Outlet/> (content panel)
  _scene._index.tsx          rest view (no zoom)
  _scene.work.tsx            laptop      -> /work         (list)
  _scene.work.$slug.tsx      laptop      -> /work/<slug>  (keep existing slugs)
  _scene.resume.tsx          bookshelf   -> /resume
  _scene.contact.tsx         phone       -> /contact
  _scene.about.tsx           poster      -> /about
  _scene.case-studies.tsx    Lego figure -> /case-studies
  _scene.case-studies.$slug.tsx
  _scene.podcast.tsx         speakers    -> /podcast (links to swe-feed-proxy)
  _scene.articles.tsx        notebook    -> /articles (static, non-interactive at launch)
  api.scene-state.ts         resource route: current scene ID (JSON)
  healthcheck.tsx
```
- **Route map is data**, keyed by base, generated from `routes.map` in the graph:
  `ROUTE_MAP: Record<Base, Partial<Record<RouteId, ObjectId>>>`. Unknown object for a base (car/plane/office resume) = route still works, content opens as a panel without a dolly.
- **Deep link:** loader returns `{ sceneId, routeId, objectId }`; SSR renders the still *already zoomed* (pre-cropped still per object and breakpoint, or CSS transform of the rest still, decided with the Motion handoff). On hydrate the camera starts at the dolly end pose. Back = history pop -> dolly out.
- **Redirects (proposal, 301):** `/about-me -> /about`, `/blog -> /articles`, `/projects -> /work`, `/skills -> /resume` (chat paused), `/work/diagrams/<x> -> /case-studies/<x>` (pending Q4), `/work/<slug>` stays. Implemented in a single `redirects.ts` table, tested.
- Skills chat: removed from nav/routing, code kept behind `FEATURE_SKILLS_CHAT` flag (not deleted).

## 2. Scene mount (SSR still + client three.js)
1. **Server:** `_scene.tsx` loader resolves the scene ID, picks the still for the breakpoint with `<picture>` + `srcset` (laptop/tablet/mobile compositions), fixed aspect-ratio box (no CLS), `fetchpriority="high"`. Hit areas rendered as real `<a href>` elements over the still (image-map-like, from the handoff polygons), so navigation works with no JS and for screen readers.
2. **Client:** `<SceneMount/>` lazy-imports three.js (`React.lazy` + `ClientOnly`) after hydration and `requestIdleCallback`; loads only the current breakpoint's atlas + manifest; renders into a canvas positioned exactly over the still; cross-fades only once the first frame is identical (check against the default camera). Still stays as fallback.
3. **Degrade:** no WebGL, `Save-Data`, low memory, or load error -> keep the still, links still work. `prefers-reduced-motion` -> no parallax/idle loops, route changes cut instead of dolly.
4. **Contract with Motion:** `SceneController` interface: `load(manifest)`, `setState(sceneId)`, `focus(objectId, {instant})`, `rest()`, `dispose()`. Router -> controller via `useLocation`. Every layer stays a separate entity (atlases + lazy loading, never flattened).
5. Breakpoint switch on resize swaps composition (debounced), never scales one into another.

## 3. Content data models (`app/content/`, typed, no components)
```ts
type SceneId = `${Base}.${Spot}.${Activity}.${Time}.${Weather}.v${number}`;
interface RouteDef { id: RouteId; path: string; label: string; status: "signed-off"|"proposed"; objects: Partial<Record<Base, ObjectId>>; interactive: boolean; }
interface WorkCard { /* existing model in work-cards.ts, unchanged */ }
interface CaseStudy { slug: string; title: string; summary: string; diagrams: string[]; workCardSlug?: string; }
interface ResumeEntry { org: string; role: string; start: YearMonth; end?: YearMonth; bullets: string[]; }
interface ContactInfo { email: "hello@ari.soy"; socials: {kind: "github"|"linkedin"|"x"|"codepen"; href: string}[]; location: string; } // no phone field by design
interface Podcast { title: string; tagline: string; linksHref: string; }
interface TimelineChapter { /* existing timeline-data-set.ts */ }
```
- Migrations: Airtable start = last week of Oct 2021 (resume PDF, card, timeline); remove phone everywhere (site, PDF, structured data, meta); keep Cabify wording.
- A unit test asserts no phone-number pattern appears in content, meta or the PDF text.

## 4. Calendar + weather backend
`app/server/scene-state.server.ts`, exposed via `api.scene-state.ts` and the `_scene` loader.

```
resolveScene(now) ->
  slot = chicagoSlot(now)                      // Intl / Temporal-polyfill, America/Chicago, DST-safe
  event = calendar.currentEvent(now)           // try, timeout 1.5 s
  id = parseSceneId(event?.summary) ?? defaultSceneFor(slot.time)
  weather = weatherFor(event?.location ?? DALLAS)  // try, timeout 1 s; on fail keep id's weather or default
  return validate(id with weather) ?? defaultSceneFor(slot.time)
-> { sceneId, time, weather, expiresAt }       // nothing else leaves the server
```
- **Calendar:** Google Calendar API, service account with read-only access to the one calendar shared by `ari.port.folio.calendar@gmail.com` (account still being created). Read only `summary`/`start`/`end`/`location`; never pass title text, description, attendees or the address to the client. Env: `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `SCENE_CALENDAR_ID` (names only; values in Vercel env).
- **Event format:** event summary (or a fixed field) = scene ID; location = travel override. Proposal to Atlas.
- **Weather provider (proposal):** Open-Meteo (free, no key) primary; NWS (api.weather.gov, free, US only) as alternative. WMO code mapping: 0-1 clear; 2-3 cloudy; 45,48 fog; 51-67,80-82 rain; 71-77,85-86 snow; 95-99 storm. Refresh every 15 min.
- **Time slots (proposal, needs sign-off):** dawn = 30 min before to 30 min after sunrise; morning to 11:00; noon 11-14; afternoon 14 to 1 h before sunset; dusk to 30 min after sunset; night. Sunrise/sunset computed for the location.
- **Cache:** in-memory + `Cache-Control: s-maxage=60, stale-while-revalidate=600` on the resource route; calendar cache 60 s, weather 15 min. Failures logged server-side (structured, no PII), never shown.
- **Fallback:** empty slot / unparseable ID / unknown vocab / outage -> time-of-day default scene. Weather-only failure -> event scene with its own (or default) weather. Default scene table pending graph (open question).
- Bookings: plain link to Arian's personal calendar booking page; never read.

## 5. CI and test plan
- **CI (GitHub Actions, PRs + `redesign`):** Node 20/22; `npm ci`; lint; typecheck; vitest with coverage; build; Cypress e2e against `start:mocks`; Lighthouse CI (mobile budget) on the preview. No deploy step in CI; Vercel previews only once Atlas confirms they can't touch production.
- **Unit:** scene-id parse/validate (all vocab, bad IDs); Chicago slots across DST (2026-11-01, 2027-03-14) and day boundaries; empty slot; calendar outage; weather outage; travel override; no-leak test (response keys whitelist); redirect table; route map per base; no-phone content test.
- **Component:** still frame + hit-area links render without JS; reduced-motion path.
- **E2E:** deep link `/work` renders zoomed, back zooms out, refresh, old URLs redirect, no-JS navigation, WebGL-disabled fallback, axe a11y on every route.
- **Performance:** budgets from Motion handoff; LCP < 2.5 s on mid mobile, CLS 0, JS for first paint excludes three.js.

## 6. Milestones
- **M0 (now, local):** this doc; `redesign` branch; CI upgrade; decide classic compiler vs Remix Vite.
- **M1 (no art dependency):** content models + migrations (Airtable date, phone removal, chat flag), route skeleton under `_scene` with placeholder still, redirect table, tests.
- **M2:** scene-state backend with mocked calendar/weather, then real calendar once the Google account exists; docs for env vars.
- **M3:** CI full pipeline + Lighthouse + a11y gates.
- **M4 (after Motion handoff):** SceneMount, per-breakpoint loading, hit areas, dolly/deep link/back behaviour, reduced motion.
- **M5:** perf + a11y + SEO hardening (structured data, meta, sitemap), QA on devices.
- **M6:** launch readiness review via Atlas; merge/deploy only on Arian's approval.

## 7. Open questions (for Atlas)
1. How does Vercel deploy the Express server today (no `vercel.json`)? Keep Express, or move to the Vercel Remix preset/Vite?
2. Approval to migrate to the Remix Vite plugin (or React Router 7) on the `redesign` branch.
3. Time-of-day default scene per slot and exact slot boundaries.
4. /work vs /case-studies split; where the 9 diagram pages live; curation of 14 cards.
5. Event format in the calendar (scene ID in title? location field for travel?).
6. Weather provider choice (Open-Meteo proposed) and refresh interval.
7. Can `redesign` be pushed for backup / Vercel previews without affecting production?
8. /about: poster opens it at home-office; brief still mentions framed picture. Confirm the poster (graph says poster).
