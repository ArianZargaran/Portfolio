/* Hero motion end to end with stub clips (M10a). Every .mp4 is answered with
   a tiny solid-colour AV1 stub (cypress/fixtures/hero-stub.av1.mp4), so the
   test checks behaviour and requests, never the art. Laptop composition.

   Since the code split (feat/hero-player-split): the action <video>s are
   appended by the lazy reactions chunk once the loop shows its first frame
   (`.hero[data-reactions=ready]`), every clip is ONE fetch() into a blob
   (identified here by the element's data-clip id), and a queued reaction's
   clip is fetched only FETCH_LEAD_FRAMES (18) before its join, so tests on
   the pinned clock move it to J-18 (`due(J)`) before waiting for the clip. */

type Conn = { effectiveType?: string; saveData?: boolean } | null;

// Registry ids: the base "typing" and the per-entry actions (<family>.k<join>;
// installed today: nod.k180, s1a.k0..k180, t6.k0..k180); built names are
// <id>.<codec>-<hash>.mp4.
const clipOf = (url: string) =>
  (url.match(/\/(typing|[a-z0-9]+\.k\d+)\.[^/]*\.mp4/) ?? [])[1] ?? url;

/* Controlled hero clock (M10b). The player's clock reads performance.now()
   (clock.ts); with `pinnedClock` the page's performance.now() returns a value
   the test sets, so the hero's time only moves when the test moves it. Real
   video decode still runs in real time, so a cut-in can be waited for at an
   exact frame, with no race against the nod's 2-frame enter window. */
type PinnedWin = Cypress.AUTWindow & { __heroMs: number };
const setHeroMs = (ms: number) =>
  cy.window().then((w) => {
    (w as PinnedWin).__heroMs = ms;
  });
/** Clock ms at which the loop shows frame `f` of cycle `cycle` (12 fps, 216 frames), mid-frame. */
const msAtFrame = (f: number, cycle = 0) =>
  ((cycle * 216 + f + 0.5) / 12) * 1000;

/* Hold the pinned hero clock on frame `f` and assert, on every animation
   frame, that what is shown is in `allowed` and that no clip matching
   `watch` other than an allowed one has data-on (review p2 M1 / p3: a hold
   ends only after HOLD_MS of real time AND MIN_TICKS player ticks, and if a
   watched <video> fires `playing` during it, AFTER_PLAYING_TICKS /
   AFTER_PLAYING_MS more, so a wrong cut-in has time to show). */
const HOLD_MS = 500;
const MIN_TICKS = 8;
const AFTER_PLAYING_TICKS = 4;
const AFTER_PLAYING_MS = 250;
/** "/<clip id>." for a hero <video> (the src is a blob: URL now). */
const srcOf = (v: Element) => `/${v.getAttribute("data-clip") ?? ""}.`;
/** reactions.ts FETCH_LEAD_FRAMES: a queued clip is fetched from J-18. */
const FETCH_LEAD = 18;
const due = (join: number, cycle = 0) =>
  setHeroMs(msAtFrame(join - FETCH_LEAD, cycle));
/** The loop is live and the lazy reactions chunk is attached. */
const LIVE = ".hero[data-state=live][data-reactions=ready]";
function holdAt(f: number, watch: RegExp, allowed: string[], cycle = 0) {
  setHeroMs(msAtFrame(f, cycle));
  return cy.window().then(
    { timeout: 20_000 },
    (w) =>
      new Cypress.Promise<void>((resolve, reject) => {
        const vids = [...w.document.querySelectorAll("video")].filter((v) =>
          watch.test(srcOf(v)),
        );
        const t0 = Date.now(); // real time (performance.now is pinned)
        let frames = 0;
        let playingAt: number | null = null;
        let playingMs = 0;
        const onPlaying = () => {
          if (playingAt === null) {
            playingAt = frames;
            playingMs = Date.now();
          }
        };
        vids.forEach((v) => v.addEventListener("playing", onPlaying));
        const done = (err?: unknown) => {
          vids.forEach((v) => v.removeEventListener("playing", onPlaying));
          if (err) reject(err as Error);
          else resolve();
        };
        const frame = () => {
          try {
            const shown =
              w.document.querySelector(".hero")?.getAttribute("data-shown") ??
              "";
            expect(
              allowed,
              `f${f} (hold frame ${frames}) shows ${shown}`,
            ).to.include(shown);
            for (const v of vids)
              if (v.hasAttribute("data-on"))
                expect(
                  allowed.some(
                    (id) => id !== "base" && srcOf(v).includes(`/${id}.`),
                  ),
                  `f${f} ${srcOf(v)} data-on`,
                ).to.eq(true);
          } catch (e) {
            return done(e);
          }
          frames++;
          const held = frames >= MIN_TICKS && Date.now() - t0 >= HOLD_MS;
          const settled =
            playingAt === null ||
            (frames - playingAt >= AFTER_PLAYING_TICKS &&
              Date.now() - playingMs >= AFTER_PLAYING_MS);
          if (held && settled) done();
          else w.requestAnimationFrame(frame);
        };
        w.requestAnimationFrame(frame);
      }),
  );
}

const waitDecodable = (id: string) =>
  cy
    .get("video")
    .filter((_, v) => srcOf(v).includes(`/${id}.`))
    .should("have.length", 1)
    .should((v) => expect((v[0] as HTMLVideoElement).readyState).to.be.gte(2));

/* triggers.ts HOVER_MQ. Headless Electron reports no hover-capable pointer,
   so `hover: true` makes the page's matchMedia answer this one query as a
   mouse would (every other query is the browser's own). */
const HOVER_MQ = "(any-hover: hover) and (any-pointer: fine)";
const hoverOver = (sel: string) =>
  cy.get(sel).first().trigger("pointerover", {
    eventConstructor: "PointerEvent",
    pointerType: "mouse",
  });
const HEADPHONES = '.scene_hits--laptop [data-object="headphones"]';
const POSTER = '.scene_hits--laptop [data-object="queen-poster"]';

/** Lazy hero chunks the page requested in the current visit (change 1). */
let chunks: string[] = [];

function visitHome(
  conn: Conn,
  opts: {
    noTiming?: boolean;
    pinnedClock?: boolean;
    hover?: boolean;
    /** A `hero:frozen` value already in storage before the page loads. */
    storedFreeze?: string;
  } = {},
) {
  const requested: string[] = [];
  chunks = [];
  cy.intercept(
    { method: "GET", url: /\/assets\/hero-(player|reactions)-[\w-]+\.js/ },
    (req) => {
      chunks.push(/hero-reactions-/.test(req.url) ? "reactions" : "player");
    },
  );
  cy.intercept({ method: "GET", url: /\.mp4($|\?)/ }, (req) => {
    requested.push(clipOf(req.url));
    req.reply({
      fixture: "hero-stub.av1.mp4,null",
      headers: { "content-type": "video/mp4" },
    });
  });
  cy.viewport(1440, 900);
  cy.visit("/", {
    onBeforeLoad(win) {
      win.localStorage.clear();
      if (opts.storedFreeze !== undefined)
        win.localStorage.setItem("hero:frozen", opts.storedFreeze);
      Object.defineProperty(win.navigator, "connection", {
        configurable: true,
        get: () => (conn === null ? undefined : conn),
      });
      if (opts.noTiming) win.performance.getEntries = () => [];
      if (opts.hover) {
        const mm = win.matchMedia.bind(win);
        win.matchMedia = (q: string) =>
          q === HOVER_MQ
            ? ({ ...mm(q), matches: true, media: q } as MediaQueryList)
            : mm(q);
      }
      if (opts.pinnedClock) {
        const w = win as PinnedWin;
        w.__heroMs = 0;
        Object.defineProperty(win.performance, "now", {
          configurable: true,
          value: () => w.__heroMs,
        });
      }
    },
  });
  return requested;
}

const gate = () => cy.get("html").invoke("attr", "data-hero-gate");

// The measured-gate case needs a genuine cold download, not a header-only
// revalidation whose few bytes say nothing about throughput (review Medium 1).
const clearBrowserCache = () =>
  cy.then(() => {
    // CDP is Chromium/Electron only; other engines start each spec cold.
    if (Cypress.isBrowser({ family: "chromium" }))
      return Cypress.automation("remote:debugger:protocol", {
        command: "Network.clearBrowserCache",
      });
  });

/** Hero chunk loads the page actually made (Resource Timing, cache or not). */
const heroChunks = (w: Cypress.AUTWindow) =>
  w.performance
    .getEntriesByType("resource")
    .map((e) => e.name)
    .filter((n) => /\/assets\/hero-(player|reactions)-/.test(n))
    .map((n) => (/hero-reactions-/.test(n) ? "reactions" : "player"));

describe("hero motion (stub clips)", () => {
  // CDP overrides used by some cases must never leak into the next one.
  afterEach(() => {
    if (Cypress.isBrowser({ family: "chromium" })) {
      cy.then(() =>
        Cypress.automation("remote:debugger:protocol", {
          command: "Network.setCacheDisabled",
          params: { cacheDisabled: false },
        }),
      );
      cy.then(() =>
        Cypress.automation("remote:debugger:protocol", {
          command: "Emulation.setEmulatedMedia",
          params: { features: [] },
        }),
      );
    }
  });

  it("4G: plays, and fetches only the typing loop before any intent", () => {
    const requested = visitHome({ effectiveType: "4g" });
    gate().should("eq", "play:connection-4g");
    cy.get(LIVE, { timeout: 15000 });
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(1500).then(() =>
      expect([...new Set(requested)]).to.deep.eq(["typing"]),
    );
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.gt", 0);
  });

  it("E2 intent (poster visit, then focus on the headphones) fetches only the nod and one T6 variant, within the budget", () => {
    const requested = visitHome({ effectiveType: "4g" });
    cy.get(LIVE, { timeout: 15000 });
    cy.get('.scene_hits--laptop [data-object="queen-poster"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(400);
    // The poster's dwell queues the glance-up (S1a, locked t1014s5523) for
    // the next join and counts as the egg's first visit. Its clip is fetched
    // only 18 frames before that join, so if the headphones replace it first it
    // is never fetched (change 3): at most ONE S1a variant.
    cy.get('.scene_hits--laptop [data-object="headphones"]').first().focus();
    cy.wrap(requested).should("include", "nod.k180");
    // The headphones' dwell is also the speaker-groove intent (T6 v3, locked
    // t1029s5606): exactly ONE T6 variant, the next join's.
    cy.wrap(requested, { timeout: 6000 }).should((r) => {
      const ids = [...new Set(r.filter((id) => id !== "typing"))];
      expect(ids.filter((id) => id.startsWith("s1a."))).to.have.length.lte(1);
      expect(ids.filter((id) => id.startsWith("t6."))).to.have.length(1);
      expect(ids.find((id) => id.startsWith("t6."))).to.match(
        /^t6\.k(0|36|72|108|144|180)$/,
      );
      expect(ids).to.include("nod.k180");
      expect(ids.some((id) => /^(s1b|t2)\./.test(id))).to.eq(false);
    });
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.lte", 970 * 1024);
  });

  it("M10b + T6: poster then headphones at f0 -> t6.k36 at f36 (replacing the queued glance), then the egg nod at f180 (controlled clock)", () => {
    const requested = visitHome({ effectiveType: "4g" }, { pinnedClock: true });
    cy.get(LIVE, { timeout: 15000 });
    setHeroMs(msAtFrame(0)); // arm at f0, before all the foreign joins
    cy.get('.scene_hits--laptop [data-object="queen-poster"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.get('.scene_hits--laptop [data-object="headphones"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.wrap(requested).should("include", "nod.k180");
    // The headphones request (equal priority, newer) replaced the queued
    // glance before its clip was due: t6.k36 is fetched at f18, s1a.k36
    // never (change 3).
    cy.get(".hero").should("have.attr", "data-reaction", "speaker:t6.k36");
    due(36);
    cy.wrap(requested).should("include", "t6.k36");
    waitDecodable("t6.k36");
    cy.wrap(requested).should((r) =>
      expect(r.filter((id) => id.startsWith("s1a."))).to.deep.eq([]),
    );
    // Wait (real time, hero clock still at f12) until the nod clip can decode.
    waitDecodable("nod.k180");
    // Hold each foreign join long enough for a wrong cut-in to become
    // visible (holdAt: >= HOLD_MS real time and >= MIN_TICKS player ticks,
    // longer if the nod fires `playing`). The nod must never be on before
    // f180, the glance never (it was replaced), T6 only at f36.
    holdAt(0, /\/(nod\.k180|s1a\.k\d+|t6\.k\d+)\./, ["base"]);
    setHeroMs(msAtFrame(36)); // T6's own entry: it comes up
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "t6.k36",
    );
    for (const f of [72, 108, 144, 176, 179])
      holdAt(f, /\/(nod\.k180|s1a\.k\d+|t6\.k\d+)\./, ["base"]);
    // Hold the clock on f180 (nod i60, its own entry): the nod must come up.
    setHeroMs(msAtFrame(180));
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "nod.k180",
    );
    // f181 (i61, the last enter frame) keeps it; the clip ends at i131 (f35
    // of the next cycle) and the base takes over again.
    setHeroMs(msAtFrame(181));
    cy.get(".hero").should("have.attr", "data-shown", "nod.k180");
    setHeroMs(msAtFrame(40, 1));
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "base",
    );
  });

  it("S1a: poster focus at f40 fetches only s1a.k72 and it comes up exactly at f72 (controlled clock)", () => {
    const requested = visitHome({ effectiveType: "4g" }, { pinnedClock: true });
    cy.get(LIVE, { timeout: 15000 });
    setHeroMs(msAtFrame(40));
    cy.get('.scene_hits--laptop [data-object="queen-poster"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.get(".hero").should("have.attr", "data-reaction", "glance-up:s1a.k72");
    // Not fetched until it is due (f54, change 3).
    cy.wrap(requested).should((r) =>
      expect(r.filter((id) => id !== "typing")).to.deep.equal([]),
    );
    due(72);
    cy.wrap(requested).should((r) =>
      expect([...new Set(r.filter((id) => id !== "typing"))]).to.deep.equal([
        "s1a.k72",
      ]),
    );
    waitDecodable("s1a.k72");
    // Before its join nothing but the base shows (f68 is inside the lead,
    // the slot is locked but the clip is not due yet).
    for (const f of [41, 60, 68, 71]) holdAt(f, /\/s1a\.k\d+\./, ["base"]);
    // On its own entry it comes up.
    setHeroMs(msAtFrame(72));
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "s1a.k72",
    );
    setHeroMs(msAtFrame(90)); // core (i18): stays on
    cy.get(".hero").should("have.attr", "data-shown", "s1a.k72");
    setHeroMs(msAtFrame(105)); // exit window (i33): back to the base
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "base",
    );
    // The next join (f108) belongs to s1a.k108, which was never requested.
    holdAt(108, /\/s1a\.k\d+\./, ["base"]);
    cy.wrap(requested).should((r) =>
      expect([
        ...new Set(r.filter((id) => id.startsWith("s1a."))),
      ]).to.deep.equal(["s1a.k72"]),
    );
  });

  it("S1a: a glance scheduled for f36 never shows at a foreign join when the clock skips its entry", () => {
    const requested = visitHome({ effectiveType: "4g" }, { pinnedClock: true });
    cy.get(LIVE, { timeout: 15000 });
    setHeroMs(msAtFrame(0));
    cy.get('.scene_hits--laptop [data-object="queen-poster"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    due(36);
    cy.wrap(requested).should((r) =>
      expect([...new Set(r.filter((id) => id !== "typing"))]).to.deep.equal([
        "s1a.k36",
      ]),
    );
    waitDecodable("s1a.k36");
    // Jump straight past f36: s1a.k36 must not appear at f72/108/144/180 or
    // the next cycle's f0, and no other variant was ever fetched to show.
    for (const f of [72, 108, 144, 180]) holdAt(f, /\/s1a\.k\d+\./, ["base"]);
    holdAt(0, /\/s1a\.k\d+\./, ["base"], 1);
    cy.wrap(requested).should((r) =>
      expect([
        ...new Set(r.filter((id) => id.startsWith("s1a."))),
      ]).to.deep.equal(["s1a.k36"]),
    );
  });

  it("S1a (review N1): repeated poster hovers during the 30 s cooldown fetch no extra S1a clip, and the egg nod still fits after", () => {
    const requested = visitHome({ effectiveType: "4g" }, { pinnedClock: true });
    cy.get(LIVE, { timeout: 15000 });
    const poster = () =>
      cy.get('.scene_hits--laptop [data-object="queen-poster"]').first();
    setHeroMs(msAtFrame(40));
    poster().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    due(72);
    cy.wrap(requested).should((r) =>
      expect([...new Set(r.filter((id) => id !== "typing"))]).to.deep.equal([
        "s1a.k72",
      ]),
    );
    waitDecodable("s1a.k72");
    setHeroMs(msAtFrame(72)); // the glance starts (6 s): cooldown to 36 s
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "s1a.k72",
    );
    // Hover again and again inside the cooldown, over two cycles (up to
    // ~32 s), at frames whose next join is each of the other variants.
    const during: [number, number][] = [
      [96, 0],
      [130, 0],
      [170, 0],
      [20, 1],
      [60, 1],
      [100, 1],
      [140, 1],
      [175, 1],
    ];
    for (const [f, cycle] of during) {
      setHeroMs(msAtFrame(f, cycle));
      poster().blur();
      poster().focus();
      // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
      cy.wait(350);
      cy.get(".hero").should(
        "have.attr",
        "data-reaction",
        "glance-up:cooldown",
      );
    }
    cy.wrap(requested).should((r) =>
      expect([
        ...new Set(r.filter((id) => id.startsWith("s1a."))),
      ]).to.deep.equal(["s1a.k72"]),
    );
    // The last poster visit counts for the egg: the headphones now fetch the
    // nod, and the visit stays inside the per-visit budget. (Focus moves
    // straight on: a blur first would leave the hero and disarm the egg.)
    cy.get('.scene_hits--laptop [data-object="headphones"]').first().focus();
    cy.wrap(requested).should("include", "nod.k180");
    cy.get(".hero").should("not.have.attr", "data-budget");
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.lte", 970 * 1024);
    // ... plus the speaker groove for the next join (f175 + lead -> f180).
    cy.wrap(requested).should((r) => {
      const ids = [...new Set(r.filter((id) => id !== "typing"))].sort();
      expect(ids).to.deep.equal(["nod.k180", "s1a.k72", "t6.k180"]);
    });
  });

  it("T6: headphones HOVER at f40 fetches only t6.k72 and it comes up exactly at f72, then the loop (controlled clock)", () => {
    const requested = visitHome(
      { effectiveType: "4g" },
      { pinnedClock: true, hover: true },
    );
    cy.get(LIVE, { timeout: 15000 });
    setHeroMs(msAtFrame(40));
    hoverOver(HEADPHONES);
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.get(".hero").should("have.attr", "data-reaction", "speaker:t6.k72");
    due(72);
    cy.wrap(requested).should((r) =>
      expect([...new Set(r.filter((id) => id !== "typing"))]).to.deep.equal([
        "t6.k72",
      ]),
    );
    waitDecodable("t6.k72");
    // Before its join only the base shows (f68 is inside the lead).
    for (const f of [41, 60, 68, 71]) holdAt(f, /\/t6\.k\d+\./, ["base"]);
    setHeroMs(msAtFrame(72)); // own entry
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "t6.k72",
    );
    setHeroMs(msAtFrame(73)); // i1, still the enter window
    cy.get(".hero").should("have.attr", "data-shown", "t6.k72");
    setHeroMs(msAtFrame(90)); // core (i18): stays on
    cy.get(".hero").should("have.attr", "data-shown", "t6.k72");
    setHeroMs(msAtFrame(106)); // exit window (i34): back to the base
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "base",
    );
    // The next join belongs to t6.k108, which was never requested.
    holdAt(108, /\/t6\.k\d+\./, ["base"]);
    cy.wrap(requested).should((r) =>
      expect([
        ...new Set(r.filter((id) => id.startsWith("t6."))),
      ]).to.deep.equal(["t6.k72"]),
    );
  });

  it("T6: a headphones hover that leaves before the 250 ms dwell fetches nothing and queues nothing", () => {
    const requested = visitHome({ effectiveType: "4g" }, { hover: true });
    cy.get(LIVE, { timeout: 15000 });
    hoverOver(HEADPHONES);
    hoverOver(".scene_frame"); // straight off, onto the background
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(800);
    cy.wrap(requested).should((r) =>
      expect([...new Set(r)]).to.deep.equal(["typing"]),
    );
    cy.get(".hero").should("not.have.attr", "data-reaction");
  });

  it("T6: a groove planned for f144 never shows at a foreign join when the clock skips its entry (keyboard focus)", () => {
    const requested = visitHome({ effectiveType: "4g" }, { pinnedClock: true });
    cy.get(LIVE, { timeout: 15000 });
    setHeroMs(msAtFrame(110));
    cy.get(HEADPHONES).first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    due(144);
    cy.wrap(requested).should((r) =>
      expect([...new Set(r.filter((id) => id !== "typing"))]).to.deep.equal([
        "t6.k144",
      ]),
    );
    waitDecodable("t6.k144");
    // Jump straight past f144: t6.k144 must not appear at f180, the next
    // cycle's joins, and no other variant was fetched to show.
    holdAt(180, /\/t6\.k\d+\./, ["base"]);
    for (const f of [0, 36, 72, 108]) holdAt(f, /\/t6\.k\d+\./, ["base"], 1);
    cy.wrap(requested).should((r) =>
      expect([
        ...new Set(r.filter((id) => id.startsWith("t6."))),
      ]).to.deep.equal(["t6.k144"]),
    );
  });

  it("T6 + E2 by hover: poster at f60, headphones at f150 -> glance s1a.k72 at f72, t6.k180 at f180, the nod at the NEXT cycle's f180 (controlled clock)", () => {
    const requested = visitHome(
      { effectiveType: "4g" },
      { pinnedClock: true, hover: true },
    );
    cy.get(LIVE, { timeout: 15000 });
    setHeroMs(msAtFrame(60));
    hoverOver(POSTER);
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.wrap(requested).should("include", "s1a.k72");
    waitDecodable("s1a.k72");
    setHeroMs(msAtFrame(72));
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "s1a.k72",
    );
    // 7.5 s after the poster (inside the 10 s window). The 6 s gap after the
    // glance (f72) allows f144 at the earliest; f150 + lead -> f180.
    setHeroMs(msAtFrame(150));
    hoverOver(HEADPHONES);
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.get(".hero").should("have.attr", "data-reaction", "speaker:t6.k180");
    cy.wrap(requested).should("include", "nod.k180");
    due(180);
    waitDecodable("t6.k180");
    waitDecodable("nod.k180");
    // f180 belongs to T6 (the egg nod is armed for the f180 AFTER T6 ends).
    setHeroMs(msAtFrame(180));
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "t6.k180",
    );
    setHeroMs(msAtFrame(200));
    cy.get(".hero").should("have.attr", "data-shown", "t6.k180");
    // T6 returns to the loop; the nod must not cut in at any join before
    // the next cycle's f180, nor T6 again.
    for (const f of [0, 36, 72, 108, 144, 176])
      holdAt(f, /\/(nod\.k180|t6\.k\d+)\./, ["base"], 1);
    setHeroMs(msAtFrame(180, 1));
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "nod.k180",
    );
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.lte", 970 * 1024);
    cy.wrap(requested).should((r) => {
      const ids = [...new Set(r.filter((id) => id !== "typing"))].sort();
      expect(ids).to.deep.equal(["nod.k180", "s1a.k72", "t6.k180"]);
    });
  });

  it("change 1: the loop player chunk loads first, the reactions chunk only after the loop's first frame", () => {
    visitHome({ effectiveType: "4g" });
    cy.get(LIVE, { timeout: 15000 });
    cy.window().then((w) =>
      expect(heroChunks(w)).to.deep.eq(["player", "reactions"]),
    );
    cy.get(".hero video").should("have.length", 14);
    cy.get(".hero video[data-clip=base]")
      .should("have.attr", "src")
      .and("match", /^blob:/);
  });

  it("change 1: prefers-reduced-motion loads neither hero chunk and no media", () => {
    cy.then(() =>
      Cypress.automation("remote:debugger:protocol", {
        command: "Emulation.setEmulatedMedia",
        params: {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        },
      }),
    );
    const requested = visitHome({ effectiveType: "4g" });
    cy.get(".scene-still_img").should("be.visible");
    cy.window()
      .its("matchMedia")
      .then((mm) =>
        expect(mm("(prefers-reduced-motion: reduce)").matches).to.eq(true),
      );
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window
    cy.wait(2500);
    cy.get(".hero").should("not.exist");
    cy.window().then((w) => {
      expect(heroChunks(w)).to.deep.eq([]);
      expect(chunks).to.deep.eq([]);
      expect(requested).to.deep.eq([]);
    });
    cy.then(() =>
      Cypress.automation("remote:debugger:protocol", {
        command: "Emulation.setEmulatedMedia",
        params: { features: [] },
      }),
    );
  });

  it("change 2: with the HTTP cache disabled a re-used variant is NOT downloaded again (one request per clip, bytes = clips)", () => {
    cy.then(() =>
      Cypress.automation("remote:debugger:protocol", {
        command: "Network.setCacheDisabled",
        params: { cacheDisabled: true },
      }),
    );
    const requested = visitHome({ effectiveType: "4g" }, { pinnedClock: true });
    cy.get(LIVE, { timeout: 15000 });
    const poster = () =>
      cy.get('.scene_hits--laptop [data-object="queen-poster"]').first();
    for (const cycle of [0, 2]) {
      // cycle 2 starts at 36 s: past the glance's 30 s cooldown.
      setHeroMs(msAtFrame(40, cycle));
      if (cycle) poster().blur();
      poster().focus();
      // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
      cy.wait(400);
      cy.get(".hero").should("have.attr", "data-reaction", "glance-up:s1a.k72");
      due(72, cycle);
      waitDecodable("s1a.k72");
      setHeroMs(msAtFrame(72, cycle));
      cy.get(".hero", { timeout: 5000 }).should(
        "have.attr",
        "data-shown",
        "s1a.k72",
      );
      setHeroMs(msAtFrame(110, cycle));
      cy.get(".hero", { timeout: 5000 }).should(
        "have.attr",
        "data-shown",
        "base",
      );
    }
    // Every request, not the set: one per clip, even with the cache off.
    cy.wrap(requested).should("deep.eq", ["typing", "s1a.k72"]);
    cy.get(".hero").should("have.attr", "data-fetches", "2");
    cy.get(".hero").should("have.attr", "data-bytes", String(332_028 + 90_003));
    cy.then(() =>
      Cypress.automation("remote:debugger:protocol", {
        command: "Network.setCacheDisabled",
        params: { cacheDisabled: false },
      }),
    );
  });

  it("change 3: poster at f40 then headphones at f42: the replaced glance s1a.k72 is never fetched, nor counted", () => {
    const requested = visitHome({ effectiveType: "4g" }, { pinnedClock: true });
    cy.get(LIVE, { timeout: 15000 });
    setHeroMs(msAtFrame(40));
    cy.get(POSTER).first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.get(".hero").should("have.attr", "data-reaction", "glance-up:s1a.k72");
    setHeroMs(msAtFrame(42));
    cy.get(HEADPHONES).first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.get(".hero").should("have.attr", "data-reaction", "speaker:t6.k72");
    due(72);
    waitDecodable("t6.k72");
    setHeroMs(msAtFrame(72));
    cy.get(".hero", { timeout: 5000 }).should(
      "have.attr",
      "data-shown",
      "t6.k72",
    );
    cy.wrap(requested).should((r) =>
      expect([...r].sort()).to.deep.eq(["nod.k180", "t6.k72", "typing"]),
    );
    cy.get(".hero").should("not.have.attr", "data-aborted");
    // typing + nod + t6.k72 (AV1 registry sizes): nothing for the glance.
    cy.get(".hero").should(
      "have.attr",
      "data-bytes",
      String(332_028 + 115_975 + 93_644),
    );
  });

  it("Save-Data: still only, no player, no media", () => {
    const requested = visitHome({ effectiveType: "4g", saveData: true });
    cy.get(".scene-still_img").should("be.visible");
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(2500);
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
    // Change 1: neither lazy hero chunk is even requested.
    cy.window().then((w) => {
      expect(heroChunks(w)).to.deep.eq([]);
      expect(chunks).to.deep.eq([]);
    });
  });

  it("a reported 3G connection: still", () => {
    const requested = visitHome({ effectiveType: "3g" });
    gate().should("eq", "still:connection-slow");
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
  });

  it("no connection API and no Resource Timing: starts frozen, plays on activation", () => {
    const requested = visitHome(null, { noTiming: true });
    gate().should("eq", "frozen:inconclusive");
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null),
    );
    cy.get(".scene_frame[role=group]").focus();
    cy.focused().type("{enter}");
    cy.get(".hero", { timeout: 15000 }).should("exist");
    cy.wrap(requested).should("include", "typing");
  });

  it("no connection API, measured on a fast network: plays and remembers the verdict", () => {
    clearBrowserCache();
    visitHome(null);
    gate().should("eq", "play:throughput-ok");
    cy.window().then((w) =>
      expect(
        JSON.parse(w.localStorage.getItem("hero:net-verdict") ?? "{}"),
      ).to.have.property("verdict", "play"),
    );
  });

  it("no connection API, cached repeat visit: inconclusive, starts frozen and stores nothing", () => {
    clearBrowserCache();
    visitHome({ effectiveType: "4g" }); // warm the cache (no measured verdict)
    cy.get(LIVE, { timeout: 15000 });
    cy.get(".scene-still_img").should((imgs) =>
      expect((imgs[0] as HTMLImageElement).complete).to.eq(true),
    );
    visitHome(null); // same still URL; visitHome clears localStorage on load
    gate().should("eq", "frozen:inconclusive");
    cy.get(".hero").should("not.exist");
    cy.window().then((w) => {
      const url =
        w.document.querySelector<HTMLImageElement>(
          ".scene-still_img",
        )!.currentSrc;
      const still = w.performance.getEntriesByName(
        url,
      )[0] as PerformanceResourceTiming;
      // Check the actual browser timings, not a stubbed Resource Timing entry.
      expect(still, "cached still Resource Timing entry").to.exist;
      expect(
        still.transferSize === 0 ||
          still.encodedBodySize === 0 ||
          still.transferSize < still.encodedBodySize,
        `cached sizes transfer=${still.transferSize}, encoded=${still.encodedBodySize}`,
      ).to.eq(true);
      expect(w.localStorage.getItem("hero:net-verdict")).to.eq(null);
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null);
    });
  });

  it("Esc freezes instantly and the keyboard freeze persists (tagged v2:keyboard) across a reload", () => {
    visitHome({ effectiveType: "4g" });
    cy.get(LIVE, { timeout: 15000 });
    cy.get("body").type("{esc}");
    cy.get(".hero[data-frozen]");
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq("v2:keyboard"),
    );
    cy.reload();
    cy.get(".scene_frame[role=group]").should(
      "have.attr",
      "aria-label",
      "Animated scene, paused. Press Enter or Space to play",
    );
    cy.get(".scene_pause").should("have.attr", "aria-pressed", "true");
    cy.get(".hero").should("not.exist");
    // Enter on the focused scene plays again and clears the stored freeze.
    cy.get(".scene_frame[role=group]").focus();
    cy.focused().type("{enter}");
    cy.get(".hero", { timeout: 15000 }).should("exist");
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null),
    );
  });

  it("change 5: clicks anywhere on the live scene (background, character, video, frame) never pause", () => {
    visitHome({ effectiveType: "4g" });
    cy.get(LIVE, { timeout: 15000 });
    // Off-hotspot points of the 1440x900 composition: window, character
    // body (over the hero video), floor, wall, plus the frame's centre.
    for (const [x, y] of [
      [100, 100],
      [300, 650],
      [700, 850],
      [850, 150],
    ] as const)
      cy.get(".scene_frame").click(x, y, { force: true });
    cy.get(".scene_frame").click({ force: true });
    cy.get(".scene_frame").dblclick(120, 120, { force: true });
    cy.get(".hero").should("not.have.attr", "data-frozen");
    cy.get(".scene_pause").should("have.attr", "aria-pressed", "false");
    cy.get(".scene_freeze-hint").should("not.exist");
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null),
    );
  });

  it('change 5 migration: a legacy untagged click freeze ("1") is cleared and the scene plays', () => {
    const requested = visitHome({ effectiveType: "4g" }, { storedFreeze: "1" });
    cy.get(LIVE, { timeout: 15000 });
    cy.get(".scene_pause").should("have.attr", "aria-pressed", "false");
    cy.wrap(requested).should("include", "typing");
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null),
    );
  });

  it("change 5 migration: a stored keyboard freeze (v2:keyboard) is honoured: still, no chunks, no media", () => {
    const requested = visitHome(
      { effectiveType: "4g" },
      { storedFreeze: "v2:keyboard" },
    );
    cy.get(".scene_pause").should("have.attr", "aria-pressed", "true");
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window
    cy.wait(2000);
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
    cy.window().then((w) => {
      expect(heroChunks(w)).to.deep.eq([]);
      expect(w.localStorage.getItem("hero:frozen")).to.eq("v2:keyboard");
    });
  });
  /* N2 (Ari, Nov 22 2026, t1035s5644): a click or tap may START a scene
     the network gate left frozen; never pause, never override a keyboard
     freeze; nothing under reduced motion or Save-Data. */
  const offHotspot = [
    [100, 100],
    [300, 650],
    [700, 850],
    [850, 150],
  ] as const;

  it("N2: a click on the gate-frozen scene starts it (loop fetched once, charged per clip); further clicks never pause", () => {
    const requested = visitHome(null, { noTiming: true });
    gate().should("eq", "frozen:inconclusive");
    cy.get(".scene_pause").should("have.attr", "aria-pressed", "true");
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
    cy.get(".scene_frame").click(300, 650, { force: true });
    cy.get(LIVE, { timeout: 15000 });
    cy.get(".scene_pause").should("have.attr", "aria-pressed", "false");
    cy.get(".scene_frame[role=group]").should(
      "have.attr",
      "aria-label",
      "Animated scene. Press Enter or Space to pause, or Esc",
    );
    cy.wrap(requested).should("deep.equal", ["typing"]);
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.oneOf", [332_028, 442_525]); // the typing loop, AV1 or H.264
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null),
    );
    // The moving scene: every click is checked on its own.
    for (const [x, y] of offHotspot) {
      cy.get(".scene_frame").click(x, y, { force: true });
      cy.get(".hero").should("not.have.attr", "data-frozen");
      cy.get(".scene_pause").should("have.attr", "aria-pressed", "false");
    }
    cy.get(".scene_frame").dblclick(120, 120, { force: true });
    cy.get(".hero").should("not.have.attr", "data-frozen");
    cy.wrap(requested).should("deep.equal", ["typing"]);
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null),
    );
  });

  it("N2: a tap (touch pointer) on the gate-frozen scene starts it too", () => {
    const requested = visitHome(null, { noTiming: true });
    gate().should("eq", "frozen:inconclusive");
    const at = { pointerType: "touch", force: true };
    cy.get(".scene_frame").trigger("pointerdown", 700, 850, at);
    cy.get(".scene_frame").trigger("pointerup", 700, 850, at);
    cy.get(".scene_frame").click(700, 850, { force: true });
    cy.get(LIVE, { timeout: 15000 });
    cy.wrap(requested).should("deep.equal", ["typing"]);
  });

  it("N2: a stored keyboard freeze (v2:keyboard) stays frozen on click; only the keyboard plays it", () => {
    const requested = visitHome(null, {
      noTiming: true,
      storedFreeze: "v2:keyboard",
    });
    gate().should("eq", "frozen:inconclusive");
    for (const [x, y] of offHotspot) {
      cy.get(".scene_frame").click(x, y, { force: true });
      cy.get(".scene_pause").should("have.attr", "aria-pressed", "true");
    }
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window
    cy.wait(1500);
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
    cy.window().then((w) => {
      expect(heroChunks(w)).to.deep.eq([]);
      expect(w.localStorage.getItem("hero:frozen")).to.eq("v2:keyboard");
    });
    cy.get(".scene_frame[role=group]").focus();
    cy.focused().type("{enter}");
    cy.get(LIVE, { timeout: 15000 });
  });

  it("N2: Esc on a gate-frozen scene makes it a keyboard freeze; a click then does nothing", () => {
    const requested = visitHome(null, { noTiming: true });
    gate().should("eq", "frozen:inconclusive");
    cy.get("body").type("{esc}");
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq("v2:keyboard"),
    );
    cy.get(".scene_frame").click(300, 650, { force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window
    cy.wait(1500);
    cy.get(".scene_pause").should("have.attr", "aria-pressed", "true");
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
  });

  it("N2: reduced motion: a click does nothing (no player, no media)", () => {
    cy.then(() =>
      Cypress.automation("remote:debugger:protocol", {
        command: "Emulation.setEmulatedMedia",
        params: {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        },
      }),
    );
    const requested = visitHome(null, { noTiming: true });
    cy.get(".scene-still_img").should("be.visible");
    cy.get(".scene_frame[role=group]").should("not.exist");
    for (const [x, y] of offHotspot)
      cy.get(".scene_frame").click(x, y, { force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window
    cy.wait(2000);
    cy.get(".hero").should("not.exist");
    cy.window().then((w) => {
      expect(heroChunks(w)).to.deep.eq([]);
      expect(requested).to.deep.eq([]);
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null);
    });
  });

  it("N2: Save-Data: a click does nothing (no player, no media)", () => {
    const requested = visitHome({ effectiveType: "4g", saveData: true });
    cy.get(".scene-still_img").should("be.visible");
    for (const [x, y] of offHotspot)
      cy.get(".scene_frame").click(x, y, { force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window
    cy.wait(2000);
    cy.get(".hero").should("not.exist");
    cy.window().then((w) => {
      expect(heroChunks(w)).to.deep.eq([]);
      expect(requested).to.deep.eq([]);
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null);
    });
  });
});
