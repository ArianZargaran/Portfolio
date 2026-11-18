# Hero player

How the painted hero character plays on the laptop home scene, how visitors pause it (WCAG 2.2.2), and how reactions are queued. Encoding and media are covered in [hero-encoding.md](./hero-encoding.md). The plan is in `/workspace/hero-interactions-scope/PLAN_v3.md` (v3.3) and `BUILD_ORDER.md` (M1, M2).

## Where things live

| File                                    | Role                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `app/scene/hero/actions.ts`             | Typed clip registry: the base typing loop plus spliced actions (nod, bounce)          |
| `app/scene/hero/schedule.ts`            | Pure splice maths and the auto-rotation (`stateAt`, `decide`)                         |
| `app/scene/hero/clock.ts`               | The one shared scene clock (pauses with the tab and with freeze)                      |
| `app/scene/hero/freeze.ts`              | Shared freeze state (F3 persistence) and the click/hotspot boundary                   |
| `app/components/scene/scene-freeze.tsx` | Pause mechanisms: background click, Enter/Space, Esc, F1 button, F2 hint, F4/F5 hooks |
| `app/components/scene/hero-mount.tsx`   | Lazy-loads the player when motion is allowed and the scene isn't frozen               |
| `app/components/scene/hero-player.tsx`  | Keeps the `<video>`s on the frames the schedule asks for                              |

## Pausing (WCAG 2.2.2 Pause, Stop, Hide)

The loop starts automatically, runs indefinitely and sits beside the page's links, so 2.2.2 (Level A) applies. Ari chose to have **no visible pause button**. The mechanisms are below. They only exist while the motion can run; under reduced motion the still is all there is.

| Mechanism                                | Behaviour                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click or tap on the scene **background** | Toggles freeze                                                                                                                                                                  |
| Click or tap on a **hotspot**            | Navigates as before; never toggles. The boundary is the hotspot link rects: `isBackgroundActivation` ignores any target inside `a[href]`, `button` and similar                  |
| **Enter / Space** on the focused scene   | Toggles. The scene frame is a `role="group"` with `tabindex="0"`, named "Animated scene. Press Enter or Space to pause, or Esc". Keys pressed on a hotspot link stay the link's |
| **Esc** anywhere                         | Pauses (never resumes). Ignored while a dialog, `aria-modal` element or menu is open                                                                                            |
| **F1**                                   | A native `<button aria-pressed>` "Pause animation", first in the scene's tab order, visually hidden until keyboard focus (skip-link pattern)                                    |
| **F2**                                   | `aria-describedby` instructions on the group                                                                                                                                    |
| **F3**                                   | The state is saved in `localStorage` (`hero:frozen`). A visitor who froze the scene gets the still and no player or media until they press play                                 |
| Status                                   | A polite live region announces "Scene animation paused / playing" after each user toggle                                                                                        |
| `prefers-reduced-motion`                 | Still only, with no player, media or pause mechanism (`useMotionAllowed`)                                                                                                       |

- **The scene is a group, not a button.** A `role="button"` wrapper would make its children presentational and hide the hotspot links from screen readers.
- **Freeze is an instant stop.** The clock and every `<video>` pause where they are, so the visible frame holds, with no easing. Resuming continues the same clock, so splices stay in sync.
- **Frozen means no reactions.** The reaction queue rejects requests while frozen (see below).

### Hooks pending Ari (flags off by default, `app/features.ts`)

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
- **B1 hook:** the points come from `HERO_JOIN`, so the retouched loop (v5_2, pending Ari) drops in by adding its config and pointing `HERO_JOIN` at it.
- **Today only some joins are usable:** `homePoseClean` is false for v5_1, so a reaction may only use joins its clip's own cut window covers. That's f72 for the bounce and f180 for the nod (`joinableKs`).

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

- **Registry:** `REACTIONS` holds the reactions with media: today only `bounce` (priority 1, joins at f72). The speaker (T6), phone (S5) and sip (S4) ids are typed and get entries when their clips are locked (design A: one baked variant per join point).
- **Requests:** event sources call `requestHeroReaction(id)` (`reaction-bus.ts`). The handler only enqueues, which keeps INP cheap; video work happens on the player's next animation frame. Event wiring (hover/focus, idle, tab return) is M5 and not built yet.

## Fetching and the byte budget (M3)

Decided (PLAN v3.3 §4): reaction media is fetched **on hover/focus intent only**. There is no idle prefetch.

- **What loads at mount:** only the typing loop (`preload="auto"`). Every action `<video>` starts at `preload="none"` and has no request on the wire.
- **Intent:** when hover or focus starts on something that can trigger a reaction, the event source calls `intentHeroReaction(id)`. The player then fetches the clip for that reaction's next reachable join (`nextVariant`) and nothing else. The 250 ms dwell then calls `requestHeroReaction(id)`, which enqueues it. Leaving before the dwell cancels the request, not the fetch: the bytes are already counted.
- **Auto-rotation:** the draft rotation (`HERO_ROTATION`, pending Ari) still buffers its next clip 6 s ahead of the cut-in, because it isn't a reaction. It's charged to the same budget. Setting the rotation to all `null` leaves intent as the only fetch path.
- **Budget** (`budget.ts`): 750 KiB per visit with AV1, or 970 KiB with H.264. This covers the typing loop and every clip the visit fetches. Sizes are in the registry (`ClipSource.bytes`; `media-files.test.ts` keeps them equal to `hero-media.build.json`). So a clip is checked before it's fetched, and it's charged once. The codec is read from the base `<video>`'s `currentSrc` once metadata loads; until then the larger H.264 sizes count.
- **Over budget:** the clip isn't fetched (`data-budget="full"` on the player root) and its reaction is dropped. The still and the loop carry on.
- **Today's full visit** (typing + nod + bounce): 576 KiB with AV1, 760 KiB with H.264.
- **Debugging:** the player root carries `data-bytes`, the bytes charged so far.

## E2 egg (M4)

`egg.ts` is a pure scheduler; the player feeds it hotspot visits and the clock.

- **Sequence:** a dwell-confirmed visit to `queen-poster`, then `speakers`, within 10 s. The speakers hotspot queues the speaker reaction (T6) through the normal queue. Completing the sequence also **arms a nod** at the next join the nod can use, after T6 ends. That's f180 on v5_1. Today the speaker reaction has no clip, so the nod is armed at the next f180.
- **Outside the queue:** the armed nod never takes the queue slot, so it can't block or delay another reaction.
  - Until it commits (`LEAD_FRAMES` before its clip starts), any other reaction or rotation clip that overlaps it disarms it.
  - Once committed it isn't cut: the player passes `eggBusyUntil` to the queue as busy time, and an overlapping rotation occurrence is suppressed (`applyEgg`, applied before `resolveState`).
  - If the rotation happens to play the very same nod, the egg stands down.
- **Disarm:** leaving the hero scene, the tab going hidden, and freezing all drop the sequence and the armed nod. A nod already on screen finishes (or holds, if frozen).
- **Fetch:** the nod clip is fetched on intent only. That happens when hover or focus starts on the speakers while the poster visit is still inside the window, or at the latest when the sequence completes. It's within the byte budget; over budget, the egg isn't armed.
- **Messages:** hotspot sources call `heroHotspot(id, "intent" | "visit" | "leave")` (`reaction-bus.ts`).
