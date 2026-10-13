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
- **Redirects (proposal, 301):** `/about-me -> /about` (done in M2), `/blog -> /articles`, `/projects -> /work`, `/skills -> /resume` (chat paused), `/work/diagrams/<x> -> /case-studies/<case>#<x>` (see 1.1), `/work/<slug>` stays. Implemented in a single `redirects.ts` table, tested.
- Skills chat: removed from nav/routing, code kept behind `FEATURE_SKILLS_CHAT` flag (not deleted).

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
- **Weather:** Open-Meteo, 15 min refresh (decided; see 4.4). WMO code mapping: 0-1 clear; 2-3 cloudy; 45,48 fog; 51-67,80-82 rain; 71-77,85-86 snow; 95-99 storm.
- **Time slots:** see 4.1 (draft).
- **Cache:** in-memory + `Cache-Control: s-maxage=60, stale-while-revalidate=600` on the resource route; calendar cache 60 s, weather 15 min. Failures logged server-side (structured, no PII), never shown.
- **Fallback:** empty slot / unparseable ID / unknown vocab / outage -> time-of-day default scene. Weather-only failure -> event scene with its own (or default) weather. Default scene table pending graph (open question).
- Bookings: plain link to Arian's personal calendar booking page; never read.

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
- **M2 (done, local):** RR7 + Vite + Vercel preset, Express removed, CSP on, phone removed + test, /about, Open-Meteo weather, CI workflow. **Next in M2:** scene-state backend with mocked calendar/weather, then real calendar once the Google account exists; docs for env vars.
- **M3:** CI full pipeline + Lighthouse + a11y gates.
- **M4 (after Motion handoff):** SceneMount, per-breakpoint loading, hit areas, dolly/deep link/back behaviour, reduced motion.
- **M5:** perf + a11y + SEO hardening (structured data, meta, sitemap), QA on devices.
- **M6:** launch readiness review via Atlas; merge/deploy only on Arian's approval.

## 7. Open questions (for Atlas)

1. ~~Express vs Vercel preset~~: resolved, RR7 + Vercel preset, Express dropped.
2. ~~Migration approval~~: resolved, React Router 7.
3. Sign-off on the slot boundaries (4.1) and default scenes (4.2).
4. Sign-off on the /work vs /case-studies split (1.1).
5. Sign-off on the calendar event format (4.3), including `*` wildcards.
6. ~~Weather provider~~: resolved, Open-Meteo, 15 min.
7. Travel: should the _time_ slot follow the travel location's local time, or always Chicago? (Graph says time follows Chicago; sun times for dawn/dusk would then mix zones.)
8. Resume PDF: the phone line was redacted in place; it still lists arianzf@gmail.com (decision 3: public contact is hello@ari.soy only) and Airtable "Oct 2023" (should be late Oct 2021). Needs a regenerated PDF from its source; where is the source?
9. Skills chat is still routed and in nav (removal is a later M1 task, behind a flag).
10. Can `redesign` be pushed for backup / Vercel previews without affecting production?
11. ~~Poster for /about~~: resolved, the Queen poster opens /about.
