# Hero player

How the painted hero character plays on the laptop home scene, how visitors pause it (WCAG 2.2.2), and how reactions are queued. Encoding and media are covered in [hero-encoding.md](./hero-encoding.md). The plan is in `/workspace/hero-interactions-scope/PLAN_v3.md` (v3.3) and `BUILD_ORDER.md` (M1, M2).

## Where things live

| File                                    | Role                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/scene/hero/actions.ts`             | Typed clip registry: the base typing loop plus the per-entry action clips (installed: `nod.k180` and the six S1a variants `s1a.k0`…`s1a.k180`; S1b/T2 wait on `hero-reactions-s1a-s1b-t2`) |
| `app/scene/hero/schedule.ts`            | Pure splice maths and the auto-rotation (`stateAt`, `decide`)                                                                                                                              |
| `app/scene/hero/clock.ts`               | The one shared scene clock (pauses with the tab and with freeze)                                                                                                                           |
| `app/scene/hero/freeze.ts`              | Shared freeze state (F3 persistence) and the click/hotspot boundary                                                                                                                        |
| `app/components/scene/scene-freeze.tsx` | Pause mechanisms: background click, Enter/Space, Esc, F1 button, F2 hint, F4/F5 hooks                                                                                                      |
| `app/components/scene/hero-mount.tsx`   | Lazy-loads the player when motion is allowed and the scene isn't frozen                                                                                                                    |
| `app/components/scene/hero-player.tsx`  | Keeps the `<video>`s on the frames the schedule asks for                                                                                                                                   |

## Pausing (WCAG 2.2.2 Pause, Stop, Hide)

The loop starts automatically, runs indefinitely and sits beside the page's links, so 2.2.2 (Level A) applies. Ari chose to have **no visible pause button**. The mechanisms are below. They only exist while the motion can run; under reduced motion the still is all there is.

| Mechanism                                | Behaviour                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click or tap on the scene **background** | Toggles freeze                                                                                                                                                                                                                                                                                                                                                                              |
| Click or tap on a **hotspot**            | Navigates as before; never toggles. The boundary is the hotspot link rects: `isBackgroundActivation` ignores any target inside `a[href]`, `button` and similar                                                                                                                                                                                                                              |
| **Enter / Space** on the focused scene   | Toggles. The scene frame is a `role="group"` with `tabindex="0"`, named "Animated scene. Press Enter or Space to pause, or Esc". Keys pressed on a hotspot link stay the link's                                                                                                                                                                                                             |
| **Esc**                                  | Pauses (never resumes), but only when the page or the scene has focus: the body, the scene frame, its hotspots or F1, or a plain link/button elsewhere. Ignored while focus is in a form control, dialog or other widget (combobox, listbox, menu, slider, tabs…), and while a dialog, `aria-modal`, menu, listbox or `aria-expanded="true"` popup is open (`escAppliesToScene`, review N7) |
| **F1**                                   | A native `<button aria-pressed>` "Pause animation", the **first Tab stop of the hero, before the scene group** (it sits just before the frame in the DOM, inside `.scene_stage`; review N6), visually hidden until keyboard focus (skip-link pattern). Its accessible name never changes; the visible "(paused)" suffix is `aria-hidden` and `aria-pressed` carries the state (review N5)   |
| **F2**                                   | `aria-describedby` instructions on the group                                                                                                                                                                                                                                                                                                                                                |
| **F3**                                   | The state is saved in `localStorage` (`hero:frozen`). A visitor who froze the scene gets the still and no player or media until they press play                                                                                                                                                                                                                                             |
| Status                                   | A polite live region announces "Scene animation paused / playing" after each user toggle                                                                                                                                                                                                                                                                                                    |
| `prefers-reduced-motion`                 | Still only, with no player, media or pause mechanism (`useMotionAllowed`)                                                                                                                                                                                                                                                                                                                   |

- **The scene is a group, not a button.** A `role="button"` wrapper would make its children presentational and hide the hotspot links from screen readers.
- **Freeze is an instant stop.** The clock and every `<video>` pause where they are, so the visible frame holds, with no easing. Resuming continues the same clock, so splices stay in sync.
- **Frozen means no reactions.** The reaction queue rejects requests while frozen (see below).

### Hooks Ari skipped (flags stay off, `app/features.ts`)

Ari skipped F4 and F5 (Nov 17 2026). Both flags stay **off** in every environment; the code stays as an unused hook. Turning either on needs a fresh decision from Ari via Atlas.

| Flag                       | Fix | What it renders                                                                                                                                                    |
| -------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FEATURE_HERO_FREEZE_HINT` | F4  | A "Click to pause" caption for 2 s the first time the pointer enters the scene, once per visitor (`hero:freeze-hint-seen`)                                         |
| `FEATURE_HERO_PAUSE_LINK`  | F5  | A "Pause animations" toggle (`<button aria-pressed>`) below the scene that drives the same shared state. The site has no footer yet; move it there once one exists |

**WCAG status:** see PLAN v3.3 §5.1.

- **Without F4 or F5, the design "likely meets" 2.2.2:** pointer users get no visible hint.
- **F5 is the cleanest full pass.**

## Reactions (M2: state machine and queue)

Reactions are one-shot actions triggered by the visitor. They're cut into the typing loop at the next **join point**.

- **Join points** (`join-config.ts`): every 36 frames (3 s, on the head-sway cycle) of the decided 18 s loop: f0, f36, f72, f108, f144, f180.
- **B1 (`v5_2` installed and locked):** the switch line is `HERO_JOIN_VERSION = "v5_2"` and the `v5_2` media ships with it. `JOIN_V5_2` joins every 36 frames (f0/36/72/108/144/180, `homePoseClean: true`). It's a build-time constant, not an env flag, because the join points have to match the bundled typing clip. Ari locked the loop on card t1003s5480 (Nov 19 2026, 12:36 AM CT, relayed by Atlas): `V5_2_LOCK_RECORD = "LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2"` (lock file sha256 `14563ba506716c358c08cec7e81799844084833088ac7e0fd1c2a5f085b5b712`; the one copy lives in `LOCK_RECORDS` in `actions.ts`, and `V5_2_LOCK_RECORD`/`V5_2_LOCK_SHA256` derive from it), so `JOIN_V5_2` is no longer `provisional` and the lock gate in `join-config.test.ts` (the active config is never provisional and names the lock) is a plain `it` again.
  - **Locks this install builds on** (all verified against portfolio-brain `tools/locks_now29.sha`, sha256 `d57a83dd7b325e9e6f951afb73f0eaa3ca33721e4b8cb68e4d2ee7975d15020a`, 69 locks = `locks_now28.sha` (`7c51a34f…3927`, 68) + the S1a V2 record; fresh reviews `designs/review_locks_now28/REVIEW.md` and `designs/review_locks_now29/REVIEW.md`, both PASS WITH NOTES; `scripts/hero/verify_locks.py` pins both lists):
    - `LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2` (`14563ba5…b712`): the typing loop. Bounce v2 (`frames/bounce`) is inside this record; it is locked as an asset only and does **not** ship.
    - `LOCK_PAINTED_CHAR_ACTION_E2_NOD_V4` (`08dcd66c…27dc`): `nod.k180`.
    - `LOCK_PAINTED_CHAR_ACTION_S1A_GLANCE_UP_V2` (`6de9b1ac…8027`, Ari t1014s5523, Nov 19 2026 10:16 AM CT, "Lock just the glance-up for poster hover"): `s1a.k0` … `s1a.k180`, the `glance-up` reaction on queen-poster hover/focus. The 12 encodes come from `36c7ba0`; their staged frames are byte-identical to the locked `variants/H<k>_k<k>/frames` and re-encoding the locked frames reproduces them byte-for-byte (`$HERO_REPORT/pipeline/s1a-restore/REPORT.md`). Each variant is opaque with the screen baked in, so it plays **only at its own entry join** (`validateAction`, `joinableKs`/`entryKs`, `step`, `occurrenceState`, and `decide` via `onOwnEntry`; `s1a-join-safety.test.ts`).
    - `LOCK_POSTER_M2_V3_R2` (`0e49dc87…e5a0`, the `_R2.json` file; revision 2 of `LOCK_POSTER_M2_V3`, relocked against `wt_tmpl4_poster_recreated.py`, Ari t1005s5485). Output pins are unchanged, so the plate and clips are unchanged. Revision 1 `LOCK_POSTER_M2_V3.json` (`dbee17ff…2c77`) stays beside it untouched.
  - **Encodes reused, not rebuilt:** typing (216 frames) and nod v4 (i60–131) were re-rendered from the locked files with `variants.py --no-encode`; every frame is byte-identical to the frames the shipped encodes were made from, and re-encoding them with the recorded settings reproduces the shipped files (`$HERO_REPORT/pipeline/lock-v5_2/REPORT.md`).
  - **Not installed:** the S1b and T2 clips are not locked (t1003s5480 locked only the loop, nod v4 and bounce v2; t1014s5523 only S1a). Their clips, `REACTIONS` entries, idle/return/doze triggers and tests are kept on the local branch `hero-reactions-s1a-s1b-t2` (at `36c7ba0`) and come back when they lock.
- **Join safety (design A, lock review §4):** the character equals f180 at every join, but the full composite at f0–f144 does not (up to 103 levels, all on the screen and spill). So every opaque clip is baked for one entry and may come up **only at that join**: `joinableKs` returns its own `entry` and nothing else, `validateAction` rejects a clip whose first frame is off its entry or whose enter window reaches another join, `step` refuses a registry variant whose entry isn't the join it lands on, and `occurrenceState` never shows an occurrence placed off its entry (queue, egg and rotation all go through it). `decide` re-checks the own entry before it prepares or shows anything (`onOwnEntry`), and the player plans a glance (`planReaction`) on its own entry before fetching it. Tests: the "join safety" block in `reactions.test.ts`, `s1a-join-safety.test.ts` and `reaction-plan.test.ts`. Installed: `nod.k180` (enters at f180 only) and `s1a.k<k>` (each enters only at its own join f<k>, enter window one frame).

`reactions.ts` is a pure machine; the player only feeds it the clock.

| Rule       | Value                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Queue      | One slot. Higher priority replaces the queued request; equal priority: the newest wins; lower is refused                                                                          |
| Scheduling | Earliest join point that has a variant, is ≥ `LEAD_FRAMES` (4) away, isn't inside a live rotation clip, and respects the cooldowns                                                |
| Commit     | Locks `LEAD_FRAMES` before its join; a locked request can't be replaced. Leaving the hotspot never cancels (commit-on-dwell; the 250 ms dwell is checked by the event wiring, M5) |
| Cooldowns  | The same reaction is refused for 30 s after its start. Any two starts are ≥ 6 s apart and ≤ 6 per minute (later starts move to a later join)                                      |
| Freeze     | Requests are refused and the queued one is dropped. A reaction already on screen holds its frame and continues after play                                                         |
| Rotation   | A scheduled or playing reaction suppresses an overlapping rotation occurrence. A rotation clip that's already live is never cut; the reaction waits                               |
| E2 egg     | Not a queued reaction. It's armed outside the queue (M4), so it never blocks the speaker reaction                                                                                 |

- **Registry:** `REACTIONS` holds `glance-up` (S1a, priority 3) with the six locked per-entry variants `s1a.k0`…`s1a.k180`. The speaker (T6), phone (S5) and sip (S4) ids are typed and get entries when their clips are locked; `strong-bounce` (S1b) and `doze` (T2, `oncePerVisit`) return from `hero-reactions-s1a-s1b-t2`. The queue machinery (per-entry variants, once-per-visit, cooldowns) is also tested on fixture clips (`app/scene/hero/__fixtures__/actions.ts`).
- **Requests:** event sources call `requestHeroReaction(id)` (`reaction-bus.ts`). The handler only enqueues, which keeps INP cheap; video work happens on the player's next animation frame. Event wiring (hover/focus, idle, tab return) is M5 and not built yet.

## Fetching and the byte budget (M3)

Decided (PLAN v3.3 §4): reaction media is fetched **on hover/focus intent only**. There is no idle prefetch.

- **What loads at mount:** only the typing loop (`preload="auto"`). Every action `<video>` starts at `preload="none"` and has no request on the wire.
- **Intent is dwell-confirmed (review N3):** hover or focus has to stay on a hotspot for the 250 ms dwell. Only then does the event source call `intentHeroReaction(id)`, followed straight away by `requestHeroReaction(id)`, which enqueues it. On intent the player first dry-runs the queue (`planReaction`, review N1: freeze, the 30 s same-reaction cooldown, a playing or locked slot, priority, the 6 s gap / 6-per-minute push and whatever is busy, then the own-entry check) and fetches only the variant that plan would play, and nothing else. A refused plan fetches nothing (`data-reaction="glance-up:cooldown"` etc. on the player root), so hovering the poster again during the cooldown downloads nothing. Leaving before the dwell sends nothing, so a quick swipe across the scene fetches no media.
- **Auto-rotation:** the player runs `heroRotation(nod)`. The nod's slot is empty unless `FEATURE_HERO_ROTATION_NOD` is on (off by default; PLAN §3 removed E2 from the rotation, review N1), and the draft rotation is `[null, "nod.k180", null, null]`: the cycle-2 bounce slot is empty until S1b locks, so by default the rotation plays nothing. A rotation play shares the reaction's cooldown key (`cooldownKey`: every variant of a family counts as that family's reaction). **Every rotation play passes the reaction cooldowns** (`gateRotation` in `reactions.ts`): it's decided once per occurrence and plays only if its clip is fetched, nothing is frozen, playing or locked, and the 30 s same-action, 6 s gap and 6-per-minute limits allow a start then. A play is written to the same ledger, so reactions also wait for it. A refused or unfetched occurrence shows the base and reserves no busy time (review N2). The rotation fetches nothing by default. Its 6 s look-ahead fetch sits behind `FEATURE_HERO_ROTATION_PREFETCH` (off; `app/features.ts`, passed down via `SceneShell → HeroMount → HeroPlayer`). With the flag off, a rotation occurrence plays only if its clip was already fetched through intent or a trigger; otherwise that occurrence shows the base. The player never calls `play()` on a `preload="none"` element, because that would start a download outside the intent rule and the budget. With the flag on, the look-ahead is charged to the same budget.
- **Budget** (`budget.ts`): 750 KiB per visit with AV1, or 970 KiB with H.264. This covers the typing loop and every clip the visit fetches. Sizes are in the registry (`ClipSource.bytes`; `media-files.test.ts` keeps them equal to `hero-media.build.json`). So a clip is checked before it's fetched, and it's charged once. The codec is read from the base `<video>`'s `currentSrc` once metadata loads; until then the larger H.264 sizes count.
- **Over budget:** the clip isn't fetched (`data-budget="full"` on the player root) and its reaction is dropped. The still and the loop carry on.
- **The egg nod is reserved (review N1):** a reaction clip (S1a) is fetched only while the E2 nod still fits beside it (`budget.canFetchKeeping(clip, [nod])`). So repeated glances in one visit stop at 3 S1a variants in either codec, and the egg can always still be fetched: worst case typing + nod + 3 variants = 718,149 B AV1 / 768,000 and 945,501 B H.264 / 993,280. Every clip in one visit without this gate would be 985,235 / 1,298,206 B (over). `check:media` models this ("multi-glance").
- **Worst-case visit, one glance** (typing + the largest variant of every shipped action: `nod.k180` and the largest S1a): 538,510 B with AV1 / 768,000, 709,646 B with H.264 / 993,280. Repeated glances: see the reserve above.
- **Debugging:** the player root carries `data-bytes`, the bytes charged so far.

## E2 egg (M4)

`egg.ts` is a pure scheduler; the player feeds it hotspot visits and the clock.

- **Sequence:** a dwell-confirmed visit to `queen-poster`, then `speakers`, within 10 s. The speakers hotspot queues the speaker reaction (T6) through the normal queue. Completing the sequence also **arms a nod** at the next join the nod can use, after T6 ends. That's f180: nod v4 is baked for that entry only. Today the speaker reaction has no clip, so the nod is armed at the next f180.
- **Outside the queue:** the armed nod never takes the queue slot, so it can't block or delay another reaction.
  - Until it commits (`LEAD_FRAMES` before its clip starts), any other reaction or rotation clip that overlaps it disarms it.
  - Once committed it isn't cut: the player passes `eggBusyUntil` to the queue as busy time, and an overlapping rotation occurrence is suppressed (`applyEgg`, applied before `resolveState`).
  - If the rotation happens to play the very same nod, the egg stands down.
- **Disarm:** leaving the hero scene, the tab going hidden, and freezing all drop the sequence and the armed nod. A nod already on screen finishes (or holds, if frozen).
- **Fetch:** the nod clip is fetched on dwell-confirmed intent only, when the speakers dwell completes while the poster visit is still inside the window (the same moment the sequence completes). It's within the byte budget; over budget, the egg isn't armed.
- **Messages:** hotspot sources call `heroHotspot(id, "intent" | "visit" | "leave")` (`reaction-bus.ts`).

## Event wiring (M5)

`triggers.ts` is attached by the player (the lazy chunk) to the closest `.scene_frame`. Nothing is listening before the player mounts, so there are no listeners under reduced motion, a stored freeze, or off the laptop composition. All the numbers live in `TRIGGERS`, and the hotspot→reaction map lives in `HOTSPOT_REACTIONS`.

| Source            | Rule                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hotspot hover     | Only where `(any-hover: hover) and (any-pointer: fine)` matches, and never for touch pointers. Intent (fetch) fires at once. After 250 ms still on the hotspot it becomes a visit plus the reaction request. Leaving before then cancels only the request. A tap on touch navigates. |
| Hotspot focus     | Keyboard focus (`:focus-visible`) on a hotspot link works like hover, on any device                                                                                                                                                                                                  |
| Queen poster      | Hover or focus on `queen-poster` past the 250 ms dwell: a visit (the E2 egg's first step) and the `glance-up` (S1a) intent + request: one S1a variant, the next own-entry join's, fetched only if the queue would accept it                                                          |
| Scrolled away     | The scene below 50% visible: `leave`. No idle, doze, tab-return or back-in-view reaction until S1b / T2 lock (they are on `hero-reactions-s1a-s1b-t2`); a hidden tab only cancels a pending dwell                                                                                    |
| Leaving the scene | Pointer and focus both out of the frame: `leave`, which disarms the E2 egg                                                                                                                                                                                                           |

- **Map:** `speakers → speaker` (T6), `phone → phone` (S5). The other hotspots (`queen-poster`, `laptop`, `bookshelf`, `lego`, `notebook`) send only intent and visit messages. The poster still sends its visit, so the E2 egg (poster, then speakers) works as before.
- **Sip (S4), retired timer (Atlas):** the old "45 s on the page: sip" trigger stays retired. When the S4 clip exists it returns as a timer-only "90 s on the page".
- **Every reaction goes through the queue:** cooldowns (30 s same reaction, 6 s gap, 6 per minute), freeze and the single slot.
- **Missing clips:** the speaker, phone and sip reactions have no clips yet, so the queue refuses them as `unknown` and nothing is fetched for them. They start working once their clips are registered in `REACTIONS`.
- **Track B4 (done for laptop):** hotspots are matched by their `data-object` id, never by geometry. The laptop boxes are Dusk's measured t995 v2 boxes, imported by `scripts/hotspots/import-hotspots.mjs` ([hotspots.md](./hotspots.md)). `speakers` is drawn on the navy Stanley (V12 has no speaker). The S4 sip has no hotspot. Tablet and mobile are still unmeasured estimates.
- **Fetch timing for non-hover triggers** (when S1b/T2 return): an idle, doze or return trigger is itself the intent. Its clip is fetched when the trigger fires, then cut in at the next join it has a clip for. That isn't the rejected "idle prefetch" (PLAN v3.3 §4).

## Warm hidden videos (M6)

`warm.ts` handles the switch latency.

- **When:** up to 12 frames (1 s) before a scheduled clip's first frame. That covers a queued reaction, an armed egg nod and the next rotation occurrence.
- **What happens:** the player seeks that clip's already-fetched `<video>` to clip frame 0 and leaves it paused, so the decoder has the frame ready. At the cut-in, `decide` only has to `play()` it, with no cold seek-and-decode on the visible path.
- **Primed cut-in (review N2):** at the prepare, an element that is paused, not seeking, has its current frame decoded (`readyState` ≥ 2) and sits on the clip frame due (`isPrimed`) already shows the cut-in pixels. The player marks it ready at once and `play()`s it without a re-seek. That matters for S1a, whose enter window is one frame (83 ms at 12 fps): the cold path (seek + `play()` + first-frame callback) could miss it. The Safari probe measures both paths (`s1aCutIn`).
- **Fetching:** warming never fetches. A clip that hasn't been fetched (no intent yet, or over budget) isn't warmed; it falls back to the cold path, where the base keeps showing until a frame is up.
- **Pool:** the base loop plus at most 2 action elements (`WARM_MAX_ACTIONS`) are warm at once, so 3 in total. One per element, nearest first.
- **Elements:** every clip is `muted`, `playsinline`, `aria-hidden`, and `preload="none"` until fetched (the base is `auto`). That keeps inline playback working on iOS Safari.
- **Chromium with real idle (review N9, Nov 17 2026):** Chromium 156 headless, local probe server, 3 warm elements held paused for 60 s and 120 s of wall-clock idle (2 rounds each, 121 s and 242 s measured). Warm p95 51.5 ms (60 s) and 38.5 ms (120 s), both ≤ 67 ms; cold p95 25.9 / 52.4 ms. So in Chromium a long idle costs nothing visible. Cold is just as fast from a local server, so the probe doesn't show a warm _gain_ there; the real question stays Safari/iPhone. Raw results: `/workspace/hero-interactions-scope/warm-probe-idle/`.
- **Not yet checked on Safari (PLAN v3.3 §4):** whether idle decoders get suspended. If Safari drops them, fall back to "seek on intent", which costs about one cold switch. This needs an Apple device.
- **Byte budget:** same per visit (M3). Warming adds no bytes.

## Network gate and Safari handling (M7)

The gate runs once per page, after the `load` event (`net-gate.ts` decides, `net-gate-store.ts` does the browser reads). `useMotionAllowed` combines it with the composition and reduced-motion checks, so the freeze UI and the player mount both follow it. The verdict is mirrored on `<html data-hero-gate="verdict:reason">` for debugging and smoke tests.

| Order | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                   | Verdict                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0     | Reduced motion, or not the laptop composition                                                                                                                                                                                                                                                                                                                                                                                          | still (the gate doesn't run)                            |
| 1     | Save-Data (`navigator.connection.saveData`) or `prefers-reduced-data: reduce`. The latter is a bonus check: no stable browser supports it yet                                                                                                                                                                                                                                                                                          | still                                                   |
| 2     | Battery API (Chromium): under 20 % and not charging                                                                                                                                                                                                                                                                                                                                                                                    | still                                                   |
| 3     | `navigator.connection.effectiveType` present (Chromium): must be `4g`                                                                                                                                                                                                                                                                                                                                                                  | play / still                                            |
| 4     | No connection API (Safari, Firefox): bytes over the combined span of the document, CSS, JS and the LCP still (Resource Timing `transferSize`), as a lower bound. ≥ 1.5 Mbps **and** the composition's planned bytes within its budget. Remembered 7 days                                                                                                                                                                               | play / still                                            |
| 5     | Inconclusive: the still or document is not a genuine download. A cache hit (`transferSize` 0), Chromium's cached/revalidated shape (`transferSize` ~300 with `encodedBodySize` 0), a 304 (`transferSize` < `encodedBodySize`: headers only), missing size fields, no Resource Timing, or no still entry. Only `encodedBodySize > 0` and `transferSize >= encodedBodySize` counts (`fresh()`); non-fresh CSS/JS are left out of the sum | the remembered verdict if ≤ 7 days old, else **frozen** |

- **Frozen:** the scene starts paused on the still, with no player chunk and no media, through `heroFreeze().freezeForPage()`. That pause isn't persisted, unlike a visitor's own pause. Activating the scene (click, tap, Enter or Space, or the focus-revealed button) plays it, which mounts the player.
- **Byte budgets per composition** (`COMPOSITION_BUDGET`): laptop 970 KiB (codec unknown before play), tablet 0.7 MB, phone 0.4 MB. Tablet and phone have no motion yet, because the close-ups are pending Ari. Their entries are ready for when the compositions exist.
- **Safari notes (PLAN v3.3 §7), as handled in code:**
  - **No `navigator.connection`:** Safari always takes the throughput path (rule 4), never "missing API = slow".
  - **Cache hits are never samples** (review lock-v5_2-clean, Medium 1): Chromium reports a revalidated or memory-cached still as `transferSize` 300, `encodedBodySize` 0. Before the fix that counted as a download, so a repeat visit "measured" ~5 kB of HTML over ~20 ms and could store a noise-driven verdict for 7 days (the measured-gate e2e flake). The e2e now clears the browser cache for the measured case and asserts a cached repeat visit is `frozen:inconclusive`. The Safari probe's cache-hit check records how Safari reports the same thing.
  - **`transferSize` 0:** repeat visits served from cache report 0, and so do cross-origin assets without `Timing-Allow-Origin`. Both are treated as inconclusive and reuse the last verdict. Today the still and clips are same-origin relative `/assets/` paths. If media ever moves to another origin, that origin must send `Timing-Allow-Origin: https://ari.soy`, or every Safari visit falls back to the remembered or frozen verdict.
  - **TCP slow start:** the measurement spans document + CSS + JS + the still rather than one small image, and it's a lower bound. A low reading errs toward the still.
  - **iOS Low Power Mode / autoplay blocked:** `play()` rejects with `NotAllowedError`, the player marks itself `failed`, and the still stays. Every clip is `muted playsinline` so inline autoplay is allowed when it can be.
  - **Unverified without an Apple device:** Safari's `transferSize` values, warm-decoder suspension and Low Power behaviour. See the M11a checklist (`docs/safari-checklist.md`).

## Budgets enforced locally (M8)

| Check                     | Command                 | Budget                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lazy hero player chunk    | `npm run check:bundle`  | ≤ 8 kB gzip (`heroChunkKb` in `bundle-budgets.json`), next to the existing initial / total / CSS / largest-chunk budgets. Fails if the `hero-player-*.js` chunk disappears (e.g. it got inlined into the entry)                                                                                                                                                       |
| Hero media per clip       | `npm run check:media`   | Reaction clips ≤ 120 kB AV1 / 160 kB H.264. Typing loop ≤ 340 / 455 kB. 1 kB = 1000 B (`media-budgets.json`)                                                                                                                                                                                                                                                          |
| Exceptions                | `npm run check:media`   | Each is explicit, with a reason and a tight cap. None today: the nod exception was removed with the v5_2 install (`nod.k180` at AV1 crf 32 / H.264 crf 21: 116.0 / 147.6 kB, inside the reaction cap)                                                                                                                                                                 |
| Manifest                  | `npm run check:media`   | Every clip's size equals `hero-media.build.json`, which the player's budget table is tested against                                                                                                                                                                                                                                                                   |
| Repeated glances          | `npm run check:media`   | Models the runtime gate: every S1a variant asked for 4× over, largest first, each fetched only while the egg nod still fits, egg before or after. The runtime peak must stay ≤ the per-visit cap (shipped: 3 variants + nod, 718.1 / 768.0 kB AV1, 945.5 / 993.3 kB H.264)                                                                                            |
| Worst-case visit          | `npm run check:media`   | Base + one variant per action ≤ 750 KiB AV1 / 970 KiB H.264. Variants are named `<action>.k<join>.<codec>.mp4`                                                                                                                                                                                                                                                        |
| Always-loaded scene chunk | `npm run check:bundle`  | ≤ 9 kB gzip (`sceneChunkKb`, review N4). The `scene-*.js` route chunk ships with the home page: shell, hit areas, freeze, net gate, actions registry. 7.4 kB after the N1-N7 fixes (7.1 kB at review); 9 kB keeps ~25 % headroom. Plus `heroTotalKb` ≤ 15 kB for scene + player together (13.4 kB after the N1-N7 fixes (Nov 17 2026)). Fails if the chunk disappears |
| Both                      | `npm run check:budgets` | `check:bundle` (needs `npm run build` first), then `check:media` (no build needed)                                                                                                                                                                                                                                                                                    |

- **Tests:** `media-budgets.test.ts` runs the media check on the shipped clips (pass) and on oversize fixtures (fail).
- **CI wiring isn't committed.** The workflows weren't changed, because verifying them would need a push. When a push is approved, the proposed change is one step in `.github/workflows/quality.yml`, right after the existing bundle step:

```yaml
- name: Hero media budgets
  run: node scripts/ci/check-media.mjs
```

## Media pipeline, early half (M9a)

`scripts/hero/variants.py` builds design A's entry variants: one baked clip per join point, rendered from the per-frame layers, proven, encoded and content-hashed. Details are in `scripts/hero/README.md` (step 8).

- **Dry run (v5_1 + E2 v3):** the native nod variant (k=180) passes both splice proofs (max diff 4 levels, 0 px over 8). Re-encoded, it reproduces the shipped `nod.av1.mp4` / `nod.h264.mp4` byte for byte (164,081 / 217,147 B, ±0 %).
- **Other joins:** the five other nod joins fail the proof (p99.9 ≥ 100 levels at the cut-in). That's expected: their head/hand entry art is Track B (B2/B3). The proof is the gate that keeps them from shipping.
- **M9b install (v5_2, locked; option (a)):** `variants.py --loop v5_2` built and proved the t995 candidates; only the locked ones are installed in `app/scene/hero/media/`: `typing`, `nod.k180` and `s1a.k0`…`s1a.k180` (`<action>.k<join>.<codec>.mp4`), with `CLIP_BYTES` and `hero-media.build.json` (which also pins the four lock records). S1b/T2 are on `hero-reactions-s1a-s1b-t2`. Worst-case visit (check:media: base + the largest variant per action): 538,510 B AV1 / 709,646 B H.264 of 768,000 / 993,280. Encoder settings are per clip in `variants.py` (`crf`): nod v4 uses AV1 crf 32 / H.264 crf 21 to fit the reaction cap. Reports: `$HERO_REPORT/pipeline/m9b-dryrun-v5_2/`, `pipeline/install-v5_2/`, `pipeline/lock-v5_2/`.

## Tests (M10a)

- **Vitest (unit and component):**
  - freeze: `freeze.test.ts`, `scene-freeze.test.tsx`
  - queue and joins: `reactions.test.ts`, `join-config.test.ts`
  - bus: `reaction-bus.test.ts`
  - E2: `egg.test.ts`
  - triggers: `triggers.test.ts`
  - warm pool: `warm.test.ts` (incl. `isPrimed`), the primed S1a cut-in in `hero-player.test.tsx`
  - budget: `budget.test.ts` (incl. the egg-nod reserve under repeated glances), plus intent fetch, plan-before-fetch and the rotation flag in `hero-player.test.tsx`; the plan itself in `reaction-plan.test.ts`
  - gate: `net-gate.test.ts`, plus mount behaviour per verdict in `hero-mount.test.tsx`
  - media caps: `media-budgets.test.ts` (incl. the multi-glance model); the Safari probe's S1a snippet: `safari-probe-s1a.test.ts`
- **Cypress, stub clips (`cypress/e2e/hero.cy.ts`):** every `.mp4` is answered with `cypress/fixtures/hero-stub.av1.mp4`, a 7 kB solid-colour test fixture (not art), so the spec checks behaviour and requests only.
  - 4G plays, with only `typing` requested before intent.
  - E2 intent fetches the nod within the budget.
  - S1a: repeated poster hovers during the 30 s cooldown fetch no extra S1a clip, and the egg nod still fits afterwards.
  - Save-Data and 3G give the still with no media.
  - No connection API and no timing starts frozen without persisting it, and plays on Enter.
  - No connection API on a fast network plays and remembers the verdict.
  - Esc freezes and persists.
- **Run it:** `npm run test:e2e:hero` (build first). Or serve on a spare port and run `PORT=<port> npx cypress run --spec cypress/e2e/hero.cy.ts`.
- **Final pass (M10b):** after the art locks, the same specs run against the real clips, plus latency within ±5 % of the sim.

## Safari first pass without a device (M11a)

- **Checklist:** `docs/safari-checklist.md`, with the steps, pass criteria and what each result decides (warm pool vs seek-on-intent, the `transferSize` fallbacks, the H.264 fallback, Low Power Mode).
- **Probe:** `npm run probe:safari` serves `scripts/hero/safari-probe/probe.html` from Ari's Mac. It's loopback-only by default; `PROBE_HOST=0.0.0.0` lets the iPhone on the same Wi-Fi reach it.
  - It measures codec choice, muted inline autoplay, Resource Timing `transferSize` (first, cached, cross-origin with and without TAO), the cache-hit shapes (`cacheHit`: the still loaded twice in-page and after a reload, immutable and 304-revalidated, with sizes, duration and the gate's reading) and cold vs warm first-frame latency after 60 s idle.
  - Results save to `scripts/hero/safari-probe/results/` (gitignored).
  - On the box it was smoke-run in headless Chromium only, to prove the page and server work. Chromium numbers say nothing about Safari.
