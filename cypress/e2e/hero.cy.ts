/* Hero motion end to end with stub clips (M10a). Every .mp4 is answered with
   a tiny solid-colour AV1 stub (cypress/fixtures/hero-stub.av1.mp4), so the
   test checks behaviour and requests, never the art. Laptop composition. */

type Conn = { effectiveType?: string; saveData?: boolean } | null;

// Registry ids: the base "typing" and the per-entry actions (<family>.k<join>;
// installed today: nod.k180); built names are <id>.<codec>-<hash>.mp4.
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

function visitHome(
  conn: Conn,
  opts: { noTiming?: boolean; pinnedClock?: boolean } = {},
) {
  const requested: string[] = [];
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
      Object.defineProperty(win.navigator, "connection", {
        configurable: true,
        get: () => (conn === null ? undefined : conn),
      });
      if (opts.noTiming) win.performance.getEntries = () => [];
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

describe("hero motion (stub clips)", () => {
  it("4G: plays, and fetches only the typing loop before any intent", () => {
    const requested = visitHome({ effectiveType: "4g" });
    gate().should("eq", "play:connection-4g");
    cy.get(".hero[data-state=live]", { timeout: 15000 });
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(1500).then(() =>
      expect([...new Set(requested)]).to.deep.eq(["typing"]),
    );
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.gt", 0);
  });

  it("E2 intent (poster visit, then focus on the speakers) fetches only the nod, within the budget", () => {
    const requested = visitHome({ effectiveType: "4g" });
    cy.get(".hero[data-state=live]", { timeout: 15000 });
    cy.get('.scene_hits--laptop [data-object="queen-poster"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(400);
    // No poster reaction on the locked install (S1a is not locked): the
    // poster's dwell fetches nothing, it only counts as the egg's first visit.
    // (A media element may issue several range requests per clip, so compare
    // the set of clips requested, not the request count.)
    cy.wrap(requested).should((r) =>
      expect([...new Set(r)]).to.deep.equal(["typing"]),
    );
    cy.get('.scene_hits--laptop [data-object="speakers"]').first().focus();
    cy.wrap(requested).should("include", "nod.k180");
    cy.wrap(requested).should((r) =>
      expect([...new Set(r.filter((id) => id !== "typing"))]).to.deep.equal([
        "nod.k180",
      ]),
    );
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.lte", 970 * 1024);
  });

  it("M10b: the egg nod actually comes up at f180 (controlled clock)", () => {
    const requested = visitHome({ effectiveType: "4g" }, { pinnedClock: true });
    cy.get(".hero[data-state=live]", { timeout: 15000 });
    setHeroMs(msAtFrame(0)); // arm at f0, before all the foreign joins
    cy.get('.scene_hits--laptop [data-object="queen-poster"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.get('.scene_hits--laptop [data-object="speakers"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the 250 ms dwell runs on real timers
    cy.wait(400);
    cy.wrap(requested).should("include", "nod.k180");
    // Wait (real time, hero clock still at f12) until the nod clip can decode.
    cy.get("video")
      .filter((_, v) =>
        /nod\.k180/.test(v.querySelector("source")?.getAttribute("src") ?? ""),
      )
      .should("have.length", 1)
      .should((v) =>
        expect((v[0] as HTMLVideoElement).readyState).to.be.gte(2),
      );
    // Hold each foreign join long enough for a wrong cut-in to become
    // visible (review p2 M1: 4 rAFs, ~65 ms, was shorter than play() + first
    // frame). The hero clock stays pinned on the join while real decode runs.
    // A hold ends only after HOLD_MS of real time AND MIN_TICKS animation
    // frames (the player ticks on rAF too, so that's player ticks). At normal
    // speed 500 ms is ~30 frames. Headless Electron sometimes throttles rAF to
    // ~3 fps (seen in p3), and then the tick floor still gives the player time
    // to prepare -> first frame -> show. If the nod <video> fires `playing`
    // during a hold, it continues for AFTER_PLAYING_TICKS more frames and
    // AFTER_PLAYING_MS more real time, so its first-frame callback can land.
    // Every frame asserts that the base is shown and the nod is not on.
    const HOLD_MS = 500;
    const MIN_TICKS = 8;
    const AFTER_PLAYING_TICKS = 4;
    const AFTER_PLAYING_MS = 250;
    for (const f of [0, 36, 72, 108, 144, 176, 179]) {
      setHeroMs(msAtFrame(f));
      cy.window().then(
        { timeout: 20_000 },
        (w) =>
          new Cypress.Promise<void>((resolve, reject) => {
            const nod = [...w.document.querySelectorAll("video")].find((v) =>
              /nod\.k180/.test(
                v.querySelector("source")?.getAttribute("src") ?? "",
              ),
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
            nod?.addEventListener("playing", onPlaying);
            const done = (err?: unknown) => {
              nod?.removeEventListener("playing", onPlaying);
              if (err) reject(err as Error);
              else resolve();
            };
            const frame = () => {
              try {
                expect(
                  w.document.querySelector(".hero")?.getAttribute("data-shown"),
                  `f${f} (hold frame ${frames})`,
                ).to.eq("base");
                expect(nod?.hasAttribute("data-on"), `f${f} nod data-on`).to.eq(
                  false,
                );
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

  it("Save-Data: still only, no player, no media", () => {
    const requested = visitHome({ effectiveType: "4g", saveData: true });
    cy.get(".scene-still_img").should("be.visible");
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(2500);
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
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
    cy.get(".hero[data-state=live]", { timeout: 15000 });
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

  it("Esc freezes instantly and the freeze persists", () => {
    visitHome({ effectiveType: "4g" });
    cy.get(".hero[data-state=live]", { timeout: 15000 });
    cy.get("body").type("{esc}");
    cy.get(".hero[data-frozen]");
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq("1"),
    );
  });
});
