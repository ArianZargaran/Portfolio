# ari.soy redesign: architecture

Status: DRAFT (full-stack engineer, updated 2026-10-13 after M2). Branch `redesign`, local only. Nothing pushed or deployed; `main` untouched.
Source of truth: `portfolio-brain/graph.yaml`. If this doc disagrees with the graph, the graph wins.

## 0. Codebase status

### 0.1 Before M2 (audit of `main` @ 25f7fa6, unchanged on main)

Remix 2.17 on the classic compiler, custom Express server (`server.ts`: helmet with CSP **disabled**, compression, morgan, trailing-slash 301), Vitest + Cypress, lint-only CI on Node 18, phone number on the site and in the resume PDF.

### 0.2 After M2 (branch `redesign`, local only)

- **React Router 7.18.4 framework mode + Vite 6** (`vite.config.ts`, `react-router.config.ts`, `app/routes.ts` using `flatRoutes()` so every existing route file keeps its URL). RR 8 exists but `@vercel/react-router` 1.3.x only supports RR 7, so we pin 7.
- **Vercel preset** (`@vercel/react-router`, `vercelPreset()`); server bundle lands in `build/server/<hash>/index.js`. `vercel.json` sets `trailingSlash: false`.
- **Express server removed.** Why, item by item:
  | Express did | Now |
  |---|---|
  | Serve the Remix handler | Vercel runs the RR7 server build as a function; locally `react-router-serve` (`npm start`, `scripts/serve.mjs`). |
  | helmet security headers (CSP off) | `app/server/security-headers.ts`, applied in `entry.server.tsx` to every document, **CSP on**. |
  | Trailing-slash 301 | `vercel.json` `trailingSlash: false` (local preview does not redirect; acceptable). |
  | compression, static caching of `/build` | Vercel CDN (Brotli, immutable hashed `/assets`); `react-router-serve` does it locally. |
  | morgan logging | Vercel request logs. |
  | Chrome DevTools probe route | Unneeded (harmless 404). |
  | Dev HMR glue (chokidar, broadcastDevReady) | Vite dev server (`react-router dev`). |
  Nothing truly needs a long-lived Node server: the scene backend is request-scoped with HTTP caching. If we ever need websockets or a long-lived process, revisit.
- **CSP (on):** nonce-based scripts (`script-src 'self' 'nonce-…' 'strict-dynamic'`; nonce generated per request in `entry.server.tsx`, passed to `ServerRouter`, `<Scripts>` and `<ScrollRestoration>` via `app/nonce.tsx`), `style-src 'self' 'unsafe-inline' fonts.googleapis.com` (motion/react writes inline styles), `font-src fonts.gstatic.com`, `img-src 'self' data: blob:`, `worker-src blob:` and `connect-src 'self'` (three.js and the scene API are same-origin), `object-src 'none'`, `frame-ancestors 'none'`. Dev relaxes `connect-src` for Vite HMR. Plus nosniff, Referrer-Policy, X-Frame-Options, COOP, Permissions-Policy, HSTS (prod). Self-hosting the Google Fonts later would let us drop those two hosts.
- `"type": "module"`; CJS config files renamed to `.cjs`.
- **Routes:** `/about-me` → `/about` (the Queen poster opens `/about`; `/about-me` 301s). Nav, theme and tests updated.
- **Phone number removed everywhere:** social nav entry and `logos/phone` deleted; the phone line was **redacted** from `public/arian-zargaran-resume.pdf` (true text removal with PyMuPDF; header now starts with the email). `app/content/no-phone-number.test.ts` scans every text file in `app/` and `public/` and the PDF text (needs `pdftotext`, installed in CI) for phone shapes and `tel:` links.
- **Weather:** `app/server/weather.server.ts` (Open-Meteo, 15 min cache, stale-if-error, request dedupe, 1.5 s timeout) + tests. Vocabulary mirrored in `app/scene/vocab.ts`.
- **CI:** `.github/workflows/ci.yml` (was `lint-repo.yml`): Node 20 and 22 matrix, `npm ci`, lint, typecheck (`react-router typegen && tsc && tsc -p cypress`), unit tests, build. Pushes to `main`/`redesign` and PRs. No deploy step. Cypress e2e is not in CI yet (M3).
- Lint was already failing on `main` (10 errors in work-grid/murmuration); fixed so CI can be green.

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
  _scene.about.tsx           Queen poster -> /about   (home-office; office poster)
  _scene.case-studies.tsx    Lego figure -> /case-studies
  _scene.case-studies.$slug.tsx
  _scene.podcast.tsx         speakers    -> /podcast (links to swe-feed-proxy)
  _scene.articles.tsx        notebook    -> /articles (static, non-interactive at launch)
  api.scene-state.ts         resource route: current scene ID (JSON)
  healthcheck.tsx
```

- **Route map is data**, keyed by base, generated from `routes.map` in the graph:
  `ROUTE_MAP: Record<Base, Partial<Record<RouteId, ObjectId>>>`. Unknown object for a base (car/plane/office resume) = route still works, content opens as a panel without a dolly.
- **Deep link:** loader returns `{ sceneId, routeId, objectId }`; SSR renders the still _already zoomed_ (pre-cropped still per object and breakpoint, or CSS transform of the rest still, decided with the Motion handoff). On hydrate the camera starts at the dolly end pose. Back = history pop -> dolly out.
- **Redirects (proposal, 301):** `/about-me -> /about` (done in M2), `/blog -> /articles`, `/projects -> /work`, `/skills -> /resume` (temporary 302 while the chat is paused; done, conditional on /resume), `/work/diagrams/<x> -> /case-studies/<case>#<x>` (see 1.1), `/work/<slug>` stays. Implemented in a single `redirects.ts` table, tested.
- Skills chat (done): gated by `FEATURE_SKILLS_CHAT` (`app/features.ts`, default **off**). The root loader exposes only the boolean flags; `menuOptionsFor()` drops the Skills nav entry; the `/skills` loader and the `/api/chat` loader/action return 404 when off (no sign the endpoint exists, no API spend). `/skills` gets a **temporary 302 to `/resume`** while the flag is off, active automatically once `app/routes/resume.tsx` exists (build-time `import.meta.glob` check); until then it stays a 404. A unit test is set to fail when /resume lands, as a reminder to flip the Cypress smoke test. Tests: flag parsing, nav filtering, `/skills` 404/200, `/api/chat` 404; Cypress smoke asserts both 404s. Code kept, not deleted.

### 1.1 DRAFT: /work vs /case-studies split

- **/work (laptop) keeps all 14 work cards**, in their current order, each with its existing `/work/<slug>` URL (slugs are stable; nothing changes).
- **/case-studies (Lego figure)** holds long-form deep dives. The 9 diagram pages move here, grouped into 7 case studies:
  | Case study `/case-studies/<slug>` | Diagram pages (old URL `/work/diagrams/<x>`) |
  |---|---|
  | `brandkit` | brandkit-architecture, brandkit-naming-convention, brandkit-theming |
  | `marshal` | marshal |
  | `ask-nova` | ask-nova |
  | `ai-design-to-code` | ai-design-to-code |
  | `content-modeling` | content-modeling |
  | `motion-spec-sheet` | motion-spec-sheet |
  | `murmuration` | murmuration |
  Each diagram keeps its own URL: `/case-studies/<case>/<diagram>`; old `/work/diagrams/<x>` 301s there. A work card that has a case study links to it ("Read the case study"); a case study links back to its card.
- The draft "honest failure" Walmart case study has no diagram yet; it's a content question, not a route.

## 2. Scene mount (SSR still + client three.js)

1. **Server:** `_scene.tsx` loader resolves the scene ID, picks the still for the breakpoint with `<picture>` + `srcset` (laptop/tablet/mobile compositions), fixed aspect-ratio box (no CLS), `fetchpriority="high"`. Hit areas rendered as real `<a href>` elements over the still (image-map-like, from the handoff polygons), so navigation works with no JS and for screen readers.
2. **Client:** `<SceneMount/>` lazy-imports three.js (`React.lazy` + `ClientOnly`) after hydration and `requestIdleCallback`; loads only the current breakpoint's atlas + manifest; renders into a canvas positioned exactly over the still; cross-fades only once the first frame is identical (check against the default camera). Still stays as fallback.
3. **Degrade:** no WebGL, `Save-Data`, low memory, or load error -> keep the still, links still work. `prefers-reduced-motion` -> no parallax/idle loops, route changes cut instead of dolly.
4. **Contract with Motion:** `SceneController` interface: `load(manifest)`, `setState(sceneId)`, `focus(objectId, {instant})`, `rest()`, `dispose()`. Router -> controller via `useLocation`. Every layer stays a separate entity (atlases + lazy loading, never flattened).
5. Breakpoint switch on resize swaps composition (debounced), never scales one into another.

### 2.1 Hero scene (branch `feat/hero-scene`, local only)

The first real motion on `/`: the locked painted character over the locked V12 dusk room. Encoding comparison, measurements and gaps are in `docs/hero-encoding.md`.

- **First paint:** the SSR `<picture>` still. On laptop it is now the V12 room with the polished character still (LOCK_PAINTED_CHAR_STILL_POLISH_V5). It is the LCP image and the whole scene for no-JS, reduced motion, Save-Data/2G, and tablet/mobile.
- **Lazy motion:** `HeroMount` (in `SceneShell`, home only) waits for the `load` event plus an idle slot. It then `React.lazy`-loads `hero-player` (2.4 kB gzip) only if the laptop query matches and motion is allowed (`motionAllowed`). Otherwise no JS chunk and no media are fetched. It reacts live to the media queries changing.
- **Composition:** one opaque crop of the full composite (x 176, y 272, 464x576), absolutely positioned in % of the 1440x900 frame. It has a 12 px feathered `mask-image` edge, so there's no seam against the still and it scales with the still at any width. `pointer-events: none`; the hit-area navs sit above it (`z-index: 1`), so every link still works (the smoke test clicks the laptop and the poster mid-playback).
- **Clock and actions:** `app/scene/hero/`
  - `clock.ts`: one shared clock (`performance.now`, paused while the tab is hidden), `phase = (t mod period) / period`.
  - `actions.ts`: typed registry. `BASE_LOOP` is typing, 216 frames at 12 fps. `ACTIONS.nod` (E2 v3) has `spliceOffset` 120, so action frame i shows base frame (120 + i) mod 216; enter window 0–60, exit window 110–167, clip trimmed to f48–121. `ACTIONS.bounce` has offset 0, windows 0–83 / 108–215, clip f72–119.
  - `schedule.ts`: pure `stateAt(t)`, `decide()`, `nextOccurrence()`, `validateRotation()`. `HERO_ROTATION` is the draft order [typing, nod, bounce, typing]; 4 x 18 s = 72 s, the cloud period.
  - `hero-player.tsx`: turns decisions into `<video>` calls. It cuts in only inside the enter window, and only once the clip has a frame up. If the clip misses the window, that occurrence is skipped rather than popped in mid-motion. It cuts out in the exit window and re-seeks only on more than 1.5 frames of drift.
  - To add an action: render it against the locked loop, run `scripts/hero/build_web_media.py`, add one `ACTIONS` entry and a rotation slot. `validateAction` and `validateRotation` run in the unit tests.
- **Media:** `public/scene/home-office.desk.coding.dusk.clear/hero/*.{av1,h264}.mp4`, 1.37 MB total in git (AV1 set 576 KB, H.264 set 760 KB); `hero-media.json` records the source frames and hashes. No LFS needed at this size. CSP unchanged: `media-src 'self'`.
- **Tests:** `schedule.test.ts` (splice mapping, phases, rotation overlap, 72 s periodicity, drift, decisions), `media.test.ts`, `media-files.test.ts` (shipped clips match the registry), `hero-mount.test.tsx` (reduced motion/tablet load nothing; control mounts). `scripts/hero-smoke.mjs` is the headless Chrome smoke test: normal, nod and bounce cut-ins, H.264 fallback, reduced motion, tablet, CPU.
- **Open:**
  - 18 s locked loop vs the spec's 24 s master (decision for Ari).
  - No tablet/mobile composition in the spec.
  - Laptop hit boxes are estimates on V12.
  - The Harvey screenshot (launch checklist).

## 3. Content data models (`app/content/`, typed, no components)

```text
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

## 4. Calendar + weather backend (implemented against mocks, M2)

```
GET /api/scene-state            app/routes/api.scene-state.ts
  -> resolveScene(now, deps)    app/server/scene-state.server.ts   (never throws)
       calendar.eventsAt(now)   CalendarProvider (ical | google | mock | none)
       pick: valid scene IDs only, latest start wins
       geocode(event.location)  "lat,lon" or Open-Meteo geocoding (24 h cache)
       slot = timeSlot(now, zone, sun at lat/lon)        app/server/time.server.ts
       weather(lat/lon) if needed (Open-Meteo, 15 min)  app/server/weather.server.ts
  <- { sceneId, time, weather, source, expiresAt }       whitelist, nothing else
  Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=600
```

Wiring from env: `app/server/scene-config.server.ts`. The `_scene` layout loader (M4) calls the same `resolveScene`.

### 4.0 Calendar access (read-only): two options

**Decided (Atlas, 2026-10-13): the secret iCal URL is the primary.** The scene calendar lives in the dedicated account **ari.port.folio.calendar@gmail.com**; its secret iCal address goes into `SCENE_CALENDAR_ICAL_URL` (Vercel env, never committed). The service account stays documented as the fallback option. The account address is server-side configuration knowledge only and never reaches the client.

Both are behind one interface, `CalendarProvider` (`app/server/calendar/types.ts`): `eventsAt(now) -> CalendarEvent[]` with only `summary, start, end, location?, timeZone?`; all-day and cancelled events excluded; recurrences expanded; outage throws `CalendarUnavailableError` (the resolver turns that into the default scene). **`app/server/calendar/contract.test.ts` runs the same suite against all three implementations** (mock, iCal with a generated Google-style feed, Google API with a faked token and events endpoint): whitelisted fields only, overlap, start inclusive / end exclusive, all-day and cancelled excluded, daily recurrence with COUNT, recurrence across the DST change, empty calendar, outage.

|                                         | **Primary: secret iCal URL**                                                                                                  | **Alternative: Google service account**                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Code                                    | `calendar/ical.server.ts`                                                                                                     | `calendar/google.server.ts`                                                                                                                     |
| Env                                     | `SCENE_CALENDAR_ICAL_URL` (one var)                                                                                           | `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `SCENE_CALENDAR_ID`                                                                                 |
| Setup (Arian, in the dedicated account) | Google Calendar > scene calendar > Settings > Integrate calendar > copy **Secret address in iCal format**                     | Create a GCP project + service account + JSON key; share the scene calendar with the SA email as **See all event details**; enable Calendar API |
| Read-only how                           | The feed is read-only by nature                                                                                               | Scope `calendar.events.readonly`; share permission is read-only                                                                                 |
| Data fetched                            | Whole feed (all events, incl. descriptions) on our server, then reduced to the whitelist                                      | Only `items(summary,location,status,start,end)` via `fields=`, single instances (`singleEvents=true`) for a 1 s window                          |
| Freshness                               | Google refreshes the secret feed itself, typically within minutes (not instant); we cache 60 s                                | Live; token cached ~1 h                                                                                                                         |
| Recurrence                              | Our parser: DAILY/WEEKLY (INTERVAL, COUNT, UNTIL, BYDAY), EXDATE, RECURRENCE-ID overrides; other FREQs are skipped and logged | Expanded by Google                                                                                                                              |
| Secret handling                         | The URL is the credential: https only, never logged (errors are generic), rotate with "Reset" in Google                       | Private key in Vercel env (`\n`-escaped PEM); rotate keys in GCP                                                                                |
| Trade-off                               | Simplest, no GCP project; feed size grows with history; slight lag                                                            | More setup; minimal data transfer; exact                                                                                                        |

Selection: `SCENE_CALENDAR_PROVIDER` forces one; otherwise the iCal URL wins if set, then the service account, else `none` (always the default scene). A misconfiguration logs and falls back to `none`; the site never breaks. `mock` serves a fixed v3.2 scene for local dev.

### 4.0.1 Time zones (configurable)

- `SCENE_TIME_ZONE`: home zone for slots, default `America/Chicago`.
- `SCENE_TRAVEL_TIME_ZONE`: zone used for the slot while travelling (event has a resolvable location). **Default `event`** (decided 2026-10-13): the calendar event's own zone (iCal `TZID` / Google `start.timeZone`), then the geocoded place's zone, falling back to `America/Chicago` if neither is known or valid. Set an IANA zone to pin one zone for every trip. Note: Google stamps every timed event with a zone (the calendar's default, Chicago, unless the event's time zone is changed when creating it), so for the trip's zone to win, Atlas should set the event's time zone to the destination when scheduling travel scenes.
- Sun times always come from the place whose clock is used (home coordinates when on Chicago time, trip coordinates otherwise), so dawn/dusk never mix zones. Weather always follows the trip location.
- Invalid zones fall back to Chicago. Tests cover CST/CDT offsets, the 2026-11-01 fall-back and 2027-03-14 spring-forward days, every slot boundary on 2026-10-13, Madrid and Tokyo.

### 4.0.2 Rules

- Event title must be a valid scene ID (vocabulary-checked); anything else is ignored and logged. `*` time/weather resolve live; explicit values are kept (Atlas directed them) and skip the weather call.
- Empty slot / invalid IDs / calendar outage -> default scene for the slot (4.2). Weather outage alone -> the event scene with `clear`.
- Output whitelist enforced by a test (no title text, location, ticket, account address).
- Caches: calendar feed 60 s, weather 15 min per location (stale-if-error, deduped), geocoding 24 h, CDN 60 s + SWR 10 min. On Vercel the memory caches are per instance; the CDN header does the heavy lifting.
- Bookings: plain link to Arian's booking page; his personal calendar is never read.

### 4.1 DRAFT: time-of-day slots (America/Chicago, DST-safe)

Sun times computed for the active location (Dallas by default, the event location when travelling), so dawn and dusk track the seasons. Boundaries are half-open `[start, end)`.
| Slot | From | To |
|---|---|---|
| dawn | sunrise − 45 min | sunrise + 45 min |
| morning | sunrise + 45 min | 11:30 |
| noon | 11:30 | 14:00 |
| afternoon | 14:00 | sunset − 60 min |
| dusk | sunset − 60 min | sunset + 45 min |
| night | sunset + 45 min | next sunrise − 45 min |
Fallback if the sun calculation fails: fixed 06:00 / 08:00 / 11:30 / 14:00 / 18:00 / 20:30. Edge case: if sunrise + 45 min is later than 11:30 (never in Dallas), morning collapses to zero.

### 4.2 DRAFT: default scene per slot

Used for an empty slot, an unparseable event or a calendar outage. Weather is still real (Open-Meteo) when available; else `clear`.
| Slot | Default scene | Art exists? |
|---|---|---|
| dawn | `home-office.window.thinking.dawn.<weather>.v1` | no |
| morning | `home-office.desk.coding.morning.<weather>.v1` | no |
| noon | `home-office.kitchen.eating.noon.<weather>.v1` | no |
| afternoon | `home-office.desk.designing.afternoon.<weather>.v1` | no |
| dusk | `home-office.desk.coding.dusk.clear.v3.2` | **yes (approved baseline)** |
| night | `home-office.couch.resting.night.<weather>.v1` | no |
Until other art exists, **every slot falls back to the approved v3.2 scene** with the time-of-day tint from `scene.config.json` `timeOfDay` (dawn/day/dusk/night). Resolution order: exact scene → same base/spot/activity with any time/weather art + tint → v3.2 + tint.

### 4.3 DRAFT: calendar event format

Schema: `docs/calendar-event.schema.json`.

- **Title (summary):** the scene ID and nothing else, e.g. `home-office.desk.coding.*.*.v3`. `*` for time or weather means "resolve live" (Chicago slot, real weather), so one event can span a slot boundary.
- **Start/End:** timed events only (all-day events are ignored). Overlaps: the event that started last wins.
- **Location:** empty = Dallas. Travel = `lat,lon` (preferred, no lookup) or a place name geocoded server-side via Open-Meteo geocoding (cached 24 h).
- **Ticket:** `extendedProperties.private.ticket` (Atlas's ticket id). Description is free text for the team.
- Server reads only summary, start, end, location; validates the ID against the vocabulary; nothing but `sceneId` (+ resolved time/weather, expiry) reaches the client.

### 4.4 Weather (implemented)

Open-Meteo `current=weather_code`, no API key, so no env var. Cached in memory per location (rounded to 0.01°) for **15 min**; concurrent requests deduped; on failure serve the stale value, else `null` → caller keeps the event's weather or `clear`. WMO mapping as above (`wmoToWeather`, unit-tested). On Vercel, the in-memory cache is per function instance; the scene resource route will add `Cache-Control: s-maxage=60, stale-while-revalidate=600` so the CDN absorbs traffic.

## 5. CI and test plan

- **CI (GitHub Actions):** done in M2: Node 20/22, `npm ci`, lint, typecheck, unit, build. Next (M3): coverage gate, Cypress e2e against `npm start`, Lighthouse CI (mobile budget) on the preview. No deploy step in CI; Vercel previews only once Atlas confirms they can't touch production.
- **Unit:** scene-id parse/validate (all vocab, bad IDs); Chicago slots across DST (2026-11-01, 2027-03-14) and day boundaries; empty slot; calendar outage; weather outage; travel override; no-leak test (response keys whitelist); redirect table; route map per base; no-phone content test.
- **Component:** still frame + hit-area links render without JS; reduced-motion path.
- **E2E:** deep link `/work` renders zoomed, back zooms out, refresh, old URLs redirect, no-JS navigation, WebGL-disabled fallback, axe a11y on every route.
- **Performance:** budgets from Motion handoff; LCP < 2.5 s on mid mobile, CLS 0, JS for first paint excludes three.js.

## 6. Milestones

- **M0 (done):** this doc; `redesign` branch.
- **M1 (no art dependency):** content models + migrations (Airtable date, phone removal, chat flag), route skeleton under `_scene` with placeholder still, redirect table, tests.
- **M2 (done, local):** RR7 + Vite + Vercel preset, Express removed, CSP on, phone removed + test, /about, Open-Meteo weather, CI workflow.
- **M2b (done, local):** scene-state backend behind `CalendarProvider` (secret iCal primary, Google service account alternative, mock) with a contract test; configurable travel time zone; `/api/scene-state`; env docs in `.env.example`. **Remaining:** connect the real calendar once the dedicated Google account exists.
- **M3 (workflows written, local):** CodeQL, Dependabot, dependency audit, CSP check, axe per route, Lighthouse CI, bundle budgets, uptime + link check (`docs/ci.md`). **Remaining:** Cypress e2e in CI; turn Lighthouse perf gates from warn to error at M5; shrink the a11y baseline.
- **M4 (after Motion handoff):** SceneMount, per-breakpoint loading, hit areas, dolly/deep link/back behaviour, reduced motion.
- **M5:** perf + a11y + SEO hardening (structured data, meta, sitemap), QA on devices.
- **M6:** launch readiness review via Atlas; merge/deploy only on Arian's approval.

## 6.1 Launch checklist (must be decided or done before launch)

- [ ] **Decide /skills (301 vs drop).** Today: a temporary 302 to `/resume` while `FEATURE_SKILLS_CHAT` is off (404 until `/resume` exists). Keep the 302 until decided.
- [ ] Real calendar connected (`SCENE_CALENDAR_ICAL_URL` in Vercel env).
- [ ] Lighthouse performance/LCP assertions switched from warn to error.
- [ ] `scripts/ci/a11y-baseline.json` empty.
- [ ] All Cypress e2e running in CI.
- [ ] **Monitor screenshot check (hero scene).** The typing loop's screen shows a real harvey.ai screenshot during the Harvey hold (typing f192–23, `designs/painted_char_typing_t959/v5_1/ref/harvey_home_1440x900.png`). It's allowed for the local preview only. Before anything goes public (remote preview included), Ari decides to keep it (with permission/attribution checked), replace it, or blur it; then re-render the loop and re-run `scripts/hero/build_web_media.py`.
- [ ] Hero timing: decide the 18 s locked character loop vs the spec's 24 s master (see `docs/hero-encoding.md`).
- [ ] Measured V12 laptop hit boxes from Dusk (today: estimates, `estimated: ["laptop"]`).
- [ ] Arian approves the launch through Atlas; only then merge to `main` and deploy.

## 7. Open questions (for Atlas)

1. ~~Express vs Vercel preset~~: resolved, RR7 + Vercel preset, Express dropped.
2. ~~Migration approval~~: resolved, React Router 7.
3. Sign-off on the slot boundaries (4.1) and default scenes (4.2).
4. Sign-off on the /work vs /case-studies split (1.1).
5. Sign-off on the calendar event format (4.3), including `*` wildcards.
6. ~~Weather provider~~: resolved, Open-Meteo, 15 min.
7. ~~Travel time zone~~: default `event` (the trip\'s own zone), fallback America/Chicago; configurable via `SCENE_TRAVEL_TIME_ZONE`.
8. ~~iCal vs service account~~: the secret iCal URL is primary (account ari.port.folio.calendar@gmail.com). Waiting for the secret address to be set in Vercel env.
9. Known a11y debt on current pages (colour contrast on most routes, marshal diagram link/scroll issues) is baselined in `scripts/ci/a11y-baseline.json`; contrast fixes are a Designer call.
10. Resume PDF: the phone line was redacted in place; it still lists arianzf@gmail.com (decision 3: public contact is hello@ari.soy only) and Airtable "Oct 2023" (should be late Oct 2021). Needs a regenerated PDF from its source; where is the source?
11. ~~Skills chat~~: behind `FEATURE_SKILLS_CHAT` (default off); `/skills` 302s to `/resume` once that route exists (404 until then). Switch to 301, or remove, after launch?
12. Can `redesign` be pushed for backup / Vercel previews without affecting production?
13. ~~Poster for /about~~: resolved, the Queen poster opens /about.

### Milestone A — /resume and /contact foundations (done)

- `/resume` and `/contact` render from typed data (`app/content/resume.ts`, `app/content/contact.ts`); web email is hello@ari.soy (PDF keeps arianzf@gmail.com).
- Shared `RoutePage` shell: decorative v3.2 still (`SceneStill`, `app/scene/still.ts`) as scene placeholder, then a labelled `<main>` with one h1.
- `/skills` now 302s to `/resume` (auto via `RESUME_ROUTE_EXISTS`); unit + Cypress tests updated.

### Milestone B — /work and /case-studies split (done)

- 9 diagram pages → 7 case studies (`app/content/case-studies.ts`): `/case-studies/brandkit` (+ `/theming`, `/naming-convention`, `/architecture`), `marshal`, `ask-nova`, `ai-design-to-code`, `content-modeling`, `motion-spec-sheet`, `murmuration`. Single-diagram cases render the diagram on the case page.
- Old `/work/diagrams/<x>` → 301 via one route, `work_.diagrams.$diagram.tsx` (`LEGACY_DIAGRAM_REDIRECTS`); unknown → 404. Work-card `diagrams`/`references` hrefs point at the new URLs.
- Atlas decision: the `live-on-this-site` work card follows `FEATURE_SKILLS_CHAT` — hidden from the grid (`visibleWorkRows`) and `/work/live-on-this-site` 404s while off. Tested in `case-studies.test.ts`.

### Milestone C — /about and /articles (done)

- `/about` rebuilt on the `RoutePage` shell from typed data (`app/content/about.ts`): bio + the timeline as an ordered list; long stories in native `<details>` (replaces the modal dialog and scroll lock). Bio is a placeholder until Ari writes the poster-face blurb.
- `/articles` is the static notebook (`app/content/articles.ts`, empty `ARTICLES`), no interactivity at launch per Ari. `/blog` → 301 `/articles`.
- Deleted the unused `contact.css`. Old about-page pieces (`about.css`, `AshesRain`, `IllustrationsSidebar`, `TimelineEvent`) are now unused; remove in a cleanup pass.

### Milestone D — still-frame scene shell (done)

- `/` renders `<SceneShell>`: the server-rendered v3.2 still (`priority`, real alt text) plus link hit areas for all 7 routes (`app/scene/hit-areas.ts`). One `<nav aria-label="Scene">` per breakpoint, shown by the same media queries as the `<picture>` sources; boxes are % of the canvas, so they track the image at any width. Multi-rect objects (bookshelf: laptop photo frames, tablet lower shelf) expose only the first rect to AT and tab order. Lego is stacked after the bookshelf, so it wins the overlap.
- No JS and no motion: this shell is also the reduced-motion and no-JS scene. Labels appear on hover/focus; the label fade only runs under `prefers-reduced-motion: no-preference`.
- Minimal `/podcast` page (speakers) links to the SWE feed proxy.
- **Estimated hit areas (flag):** the Queen poster boxes on tablet and mobile are hand estimates (the layout json has only the old `framed_photo`). They are marked `estimated: ["tablet", "mobile"]` in the data. Replace when design supplies measured boxes.
- **Placeholder compositions (flag):** the tablet (820×1180) and mobile (390×844) v3.2 stills are rough collages, used as placeholders only. Final paintings come from Design; hit boxes must be re-measured when they land.
- The old home hero (`home.css`, blurry circles, doodles, noise, social nav) is no longer used by `/`; remove in a cleanup pass.

### Milestone E — deep links load each route's content (done)

- Every route's content comes from its loader and is server-rendered, so a deep link (or no-JS visit) gets the full page. `RoutePage` now renders `<SceneShell decorative focus=…>`: the still lands "already zoomed" on the route's object (`focusForPath`, prefix match, so `/work/<slug>` → laptop and `/case-studies/*` → Lego). The zoom is a static `transform: scale(1.8)` with a per-breakpoint `transform-origin` in CSS vars (`--zoom-origin-{laptop,tablet,mobile}`). There is no transition, so it is reduced-motion safe. Hit areas stay live, and the current object is marked `aria-current="page"`.
- `/work` and the case-study diagram pages keep their own layouts (no zoomed still yet).
- Fix: `route-page.css` sized in rem assuming 16px, but this codebase sets 1rem = 1px (`fonts.css`). Values were converted, so the /resume, /contact, /about, /articles, /podcast and /case-studies layouts now render at the intended size. This was broken since Milestone A.
- Tests: `app/routes/deep-links.test.tsx` covers each content route (loader → h1 inside `<main>`, zoom object current in every breakpoint nav); Cypress fetches each URL and checks the server HTML.

### Bookshelf re-point to layer 6 entities (Dusk, Oct 13)

- Dusk retired the old `50_hot_lego` card (and `bookshelf`, `20_room_shelf-*`, `50_hot_frame{a,b}`); layer 6 (`layers/layer06_bookshelf_v1/piece.json`) splits the shelf into free entities. `HitObject.entities` now names the layer 6 cards each hit area stands for:
  - `/case-studies` (id `lego`) → `layer06_bookshelf_v1/item.lego`. Laptop box = its canvas_bbox `[984,572,1042,670]`.
  - `/resume` (id `bookshelf`) → `shelf.frame`, `shelf.interior`, the 4 `shelf_books.*` groups, `item.xwing`, `item.vader`, `item.r2d2`, `item.hero_{cap,glasses,top}`, `item.photo_{a,b}`, `item.shelf_lamp`. Laptop boxes = `shelf.frame` `[884,208,1440,900]` + photo frames `[1234,110,1415,208]` (pointer-only).
  - X-Wing, Vader, R2 and the hero figures have no route of their own (layer plan: "—"), so they open /resume with the rest of the shelf. Lego stays stacked above the shelf.
- **Estimated (flag):** both objects are marked `estimated` on laptop, tablet and mobile until Dusk delivers real boxes. Laptop uses layer 6 bboxes (rectangles, not alpha-tight); tablet/mobile still use the old layout-json boxes drawn from the retired cards.
- The `prototypes/2.5d-v2.1` config still loads `50_hot_lego.png`; it predates layer 6 and is not used by the site.
