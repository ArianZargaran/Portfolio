/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   The hero clips are aria-hidden <video>s with no role or text; this test
   checks which of them the player fetches and shows. */
import { act, render } from "@testing-library/react";

import { ACTIONS } from "~/scene/hero/actions";
import {
  heroHotspot,
  intentHeroReaction,
  requestHeroReaction,
} from "~/scene/hero/reaction-bus";
import { FETCH_LEAD_FRAMES } from "~/scene/hero/reactions";

import HeroPlayer from "./hero-player";
import {
  clipEl,
  installFakeNet,
  mountHero,
  settle,
  type FakeNet,
} from "./hero-player.harness";

const H264 = {
  typing: 442_525,
  nod: 147_578,
  s1aK36: 119_543,
  s1aK0: 117_692,
  t6K36: 126_461,
};

type Cb = () => void;
let net: FakeNet;
let frameCbs: { el: HTMLVideoElement; cb: Cb }[];
const originalRvfc = Object.getOwnPropertyDescriptor(
  HTMLVideoElement.prototype,
  "requestVideoFrameCallback",
);
const originalCanPlay = HTMLMediaElement.prototype.canPlayType;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "performance",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "setTimeout",
      "clearTimeout",
    ],
  });
  net = installFakeNet();
  frameCbs = [];
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.load = vi.fn();
  // happy-dom can't play AV1: "" -> the player picks H.264 (the last source).
  HTMLMediaElement.prototype.canPlayType = () => "";
});
afterEach(() => {
  if (originalRvfc)
    Object.defineProperty(
      HTMLVideoElement.prototype,
      "requestVideoFrameCallback",
      originalRvfc,
    );
  else
    delete (
      HTMLVideoElement.prototype as { requestVideoFrameCallback?: unknown }
    ).requestVideoFrameCallback;
  HTMLMediaElement.prototype.canPlayType = originalCanPlay;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Held first-frame callbacks: only a primed element (or a fired cb) is ready. */
const holdFrameCallbacks = () => {
  HTMLVideoElement.prototype.requestVideoFrameCallback = function (
    this: HTMLVideoElement,
    cb: VideoFrameRequestCallback,
  ) {
    frameCbs.push({
      el: this,
      cb: () => cb(0, {} as VideoFrameCallbackMetadata),
    });
    return frameCbs.length;
  };
};
/** Fires the base loop's held first-frame callback (mountHero option). */
const fireBase = (base: HTMLVideoElement) =>
  frameCbs.filter((f) => f.el === base).forEach((f) => f.cb());

const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
/** Advances in 20 ms steps, letting fetches settle in between. */
const run = async (ms: number) => {
  for (let t = 0; t < ms; t += 20) {
    tick(20);
    await settle(1);
  }
};
const glance = () => {
  act(() => intentHeroReaction("glance-up"));
  act(() => requestHeroReaction("glance-up"));
};
const headphones = () => {
  act(() => heroHotspot("headphones", "intent"));
  act(() => intentHeroReaction("speaker"));
  act(() => heroHotspot("headphones", "visit"));
  act(() => requestHeroReaction("speaker"));
};
const variants = () => net.fetched().filter((id) => /^(s1a|t6)\./.test(id));
const bytes = (root: HTMLElement) => Number(root.dataset.bytes);

describe("HeroPlayer code split (change 1)", () => {
  it("renders only the loop; the reactions chunk appends the 13 installed action clips after the first frame", async () => {
    const { container, root } = await mountHero(<HeroPlayer />);
    expect(root.dataset.state).toBe("live");
    expect(root.dataset.reactions).toBe("ready");
    const clips = [...container.querySelectorAll("video")].map(
      (v) => v.dataset.clip,
    );
    expect(clips).toEqual(["base", ...Object.keys(ACTIONS)]);
    // No S1b / T2 clip (not locked); no action clip has a source yet.
    expect(clips.some((c) => /^(s1b|t2)\./.test(c ?? ""))).toBe(false);
    for (const id of Object.keys(ACTIONS)) {
      const v = clipEl(container, id);
      expect(v.preload).toBe("none");
      expect(v).not.toHaveAttribute("src");
      expect(v.querySelector("source")).toBeNull();
      expect(v.muted).toBe(true);
      expect(v).toHaveAttribute("playsinline");
      expect(v).toHaveAttribute("aria-hidden", "true");
      expect(v.controls).toBe(false);
    }
  });

  it("doesn't load the reactions chunk before the loop shows a frame", async () => {
    holdFrameCallbacks();
    const { root } = await mountHero(<HeroPlayer />); // base cb never fired
    expect(root.dataset.state).toBe("loading");
    expect(root.dataset.reactions).toBeUndefined();
    expect(net.fetched()).toEqual(["typing"]);
  });

  it("doesn't load the reactions chunk while frozen (F3 mount), and loads it on play", async () => {
    const { root, rerender } = await mountHero(<HeroPlayer frozen />);
    expect(root.dataset.reactions).toBeUndefined();
    rerender(<HeroPlayer />);
    await settle(6);
    expect(root.dataset.reactions).toBe("ready");
  });
});

describe("HeroPlayer per-clip bytes (change 2)", () => {
  it("fetches the loop once, as a blob, in the codec the browser can play", async () => {
    HTMLMediaElement.prototype.canPlayType = (t: string) =>
      t.includes("av01") ? "probably" : "maybe";
    const { root, base } = await mountHero(<HeroPlayer />);
    expect(net.calls.map((c) => [c.id, c.codec])).toEqual([["typing", "av1"]]);
    expect(base).toHaveAttribute("src", expect.stringMatching(/^blob:/));
    expect(bytes(root)).toBe(332_028);
  });

  it("an AV1 loop that won't decode falls back to H.264; the AV1 bytes stay charged", async () => {
    HTMLMediaElement.prototype.canPlayType = () => "probably";
    const { root, base } = await mountHero(<HeroPlayer />);
    act(() => {
      base.dispatchEvent(new Event("error"));
    });
    await settle(3);
    expect(net.calls.map((c) => c.codec)).toEqual(["av1", "h264"]);
    expect(bytes(root)).toBe(332_028 + H264.typing);
    expect(root.dataset.state).not.toBe("failed");
  });

  /* Review B1: a browser that says it can play AV1 but can't decode the
     file rejects play() with NotSupportedError AND fires `error` on the
     element, in either order. The fallback must win, not the failure. */
  const undecodable = (urls: () => string[]) => {
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      const src = this.getAttribute("src") ?? "";
      if (!urls().includes(src)) return Promise.resolve();
      // The rejection is handled first; the element's `error` comes a
      // task later (the order a real browser may use). As in a browser,
      // load() / a new src drops that pending event of the old resource.
      setImmediate(() => {
        if (this.getAttribute("src") === src)
          this.dispatchEvent(new Event("error"));
      });
      return Promise.reject(
        new DOMException(
          "The element has no supported sources.",
          "NotSupportedError",
        ),
      );
    };
  };
  const firstUrl = () =>
    (
      URL.createObjectURL as unknown as {
        mock: { results: { value: string }[] };
      }
    ).mock.results.map((r) => r.value);

  it("B1: AV1 that won't decode (play() rejects NotSupportedError first, error a task later) ends live on H.264; AV1 bytes wasted, blob revoked", async () => {
    HTMLMediaElement.prototype.canPlayType = () => "probably";
    undecodable(() => firstUrl().slice(0, 1)); // the AV1 typing blob
    const { root, base } = await mountHero(<HeroPlayer />);
    await settle(3);
    expect(net.calls.map((c) => [c.id, c.codec])).toEqual([
      ["typing", "av1"],
      ["typing", "h264"],
    ]);
    expect(root.dataset.state).toBe("live");
    expect(root.dataset.reactions).toBe("ready");
    expect(base).toHaveAttribute("src", firstUrl()[1]);
    expect(bytes(root)).toBe(332_028 + H264.typing);
    expect(root.dataset.wasted).toBe("332028");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl()[0]);
  });

  it("B1: the same with `error` before the play() rejection: one fallback, live on H.264", async () => {
    HTMLMediaElement.prototype.canPlayType = () => "probably";
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      const src = this.getAttribute("src") ?? "";
      if (src !== firstUrl()[0]) return Promise.resolve();
      this.dispatchEvent(new Event("error"));
      return Promise.reject(new DOMException("no", "NotSupportedError"));
    };
    const { root } = await mountHero(<HeroPlayer />);
    await settle(3);
    expect(net.calls.map((c) => c.codec)).toEqual(["av1", "h264"]);
    expect(root.dataset.state).toBe("live");
    expect(bytes(root)).toBe(332_028 + H264.typing);
  });

  it("B1: when H.264 won't decode either, the player fails to the still (no third fetch)", async () => {
    HTMLMediaElement.prototype.canPlayType = () => "probably";
    undecodable(() => firstUrl());
    const { root } = await mountHero(<HeroPlayer />);
    await settle(3);
    expect(net.calls.map((c) => c.codec)).toEqual(["av1", "h264"]);
    expect(root.dataset.state).toBe("failed");
  });

  it("B1: a play() blocked for another reason (NotAllowedError, no media error) still fails as before", async () => {
    HTMLMediaElement.prototype.canPlayType = () => "probably";
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new DOMException("autoplay", "NotAllowedError"));
    const { root } = await mountHero(<HeroPlayer />);
    await settle(3);
    expect(net.calls.map((c) => c.codec)).toEqual(["av1"]);
    expect(root.dataset.state).toBe("failed");
  });

  it("a re-used variant replays from its blob: one fetch per clip per visit, charged once", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    glance(); // ~f0 -> s1a.k36
    await run(3_500);
    expect(variants()).toEqual(["s1a.k36"]);
    // 36.0 s = cycle 2 f0: the next join is f36 again, past the cooldown.
    await run(36_000 - 3_500);
    glance();
    expect(root.dataset.reaction).toBe("glance-up:s1a.k36");
    await run(3_500);
    expect(variants()).toEqual(["s1a.k36"]);
    expect(bytes(root)).toBe(H264.typing + H264.s1aK36);
    expect(net.sent()).toBe(bytes(root));
  });

  it("the budget equals the bytes the network sent, across glances, the groove and the egg", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    act(() => heroHotspot("queen-poster", "visit"));
    headphones();
    await run(4_000);
    for (let i = 0; i < 5; i++) {
      glance();
      await run(31_000);
    }
    expect(net.sent()).toBe(bytes(root));
    expect(bytes(root)).toBeLessThanOrEqual(993_280);
    // Never two fetches of one clip.
    expect(new Set(net.fetched()).size).toBe(net.fetched().length);
  });
});

describe("HeroPlayer replaced reaction is never fetched (change 3)", () => {
  it(`a queued glance is fetched only ${FETCH_LEAD_FRAMES} frames before its join`, async () => {
    const { root } = await mountHero(<HeroPlayer />);
    glance(); // ~f0 -> s1a.k36 at 3 s
    expect(root.dataset.reaction).toBe("glance-up:s1a.k36");
    expect(variants()).toEqual([]);
    await run(1_400); // f16.8: 19 frames out, not due
    expect(variants()).toEqual([]);
    await run(200); // f19: due
    expect(variants()).toEqual(["s1a.k36"]);
    expect(bytes(root)).toBe(H264.typing + H264.s1aK36);
  });

  it("poster then headphones: the replaced glance is never fetched; only the nod and T6", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    act(() => heroHotspot("queen-poster", "intent"));
    glance(); // s1a.k36 queued, not fetched
    act(() => heroHotspot("queen-poster", "visit"));
    await run(100);
    headphones(); // replaces the glance with t6.k36 (newest wins)
    expect(root.dataset.reaction).toBe("speaker:t6.k36");
    await run(3_200);
    expect(net.fetched()).toEqual(["typing", "nod.k180", "t6.k36"]);
    expect(root.dataset.aborted).toBeUndefined();
    expect(bytes(root)).toBe(H264.typing + H264.nod + H264.t6K36);
  });

  it("a replaced glance whose fetch is in flight is aborted and costs only what arrived", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    net.hold = true;
    await run(1_700); // f20.4: the f36 join is due
    glance();
    expect(variants()).toEqual(["s1a.k36"]);
    const s1a = net.calls.find((c) => c.id === "s1a.k36")!;
    headphones(); // f20, before the J-4 lock: replaces the glance
    expect(root.dataset.reaction).toBe("speaker:t6.k36");
    expect(s1a.aborted).toBe(true);
    expect(root.dataset.aborted).toBe("1");
    net.calls.filter((c) => !c.aborted).forEach((c) => c.resolve());
    await settle(3);
    // Nothing of the glance arrived: charged 0; only T6 is charged.
    expect(bytes(root)).toBe(H264.typing + H264.t6K36);
    expect(net.sent()).toBe(H264.typing + H264.t6K36);
    expect(root.dataset.wasted).toBe("0");
  });

  it("the replaced glance doesn't count against the 3-variant limit", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    act(() => heroHotspot("queen-poster", "visit"));
    glance();
    headphones(); // glance replaced; t6.k36 + the nod
    await run(34_000);
    glance(); // variant 2
    await run(34_000);
    glance(); // variant 3: still affordable beside the egg nod
    expect(root.dataset.reaction).not.toMatch(/budget/);
    await run(4_000);
    expect(variants()).toHaveLength(3);
    expect(variants()[0]).toBe("t6.k36");
    expect(bytes(root)).toBeLessThanOrEqual(993_280);
  });

  it("keeps the lock window: headphones within 4 frames of the glance's join get no groove", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    await run(1_700);
    glance(); // s1a.k36, fetched (due)
    await run(1_100); // f33 >= J-4
    headphones();
    expect(root.dataset.reaction).toBe("speaker:locked");
    await run(500);
    expect(variants()).toEqual(["s1a.k36"]);
  });

  it("keeps the 6 s spacing: a groove right after a glance waits for f108", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    glance(); // plays at f36 (3 s)
    await run(3_400); // f40.8
    act(() => intentHeroReaction("speaker"));
    act(() => requestHeroReaction("speaker"));
    expect(root.dataset.reaction).toBe("speaker:t6.k108");
    await run(4_000); // f88.8: 19 frames out, not due yet
    expect(variants()).toEqual(["s1a.k36"]);
    await run(200);
    expect(variants()).toEqual(["s1a.k36", "t6.k108"]);
  });
});

describe("HeroPlayer intents and requests (M3)", () => {
  it("fetches only the typing loop until a reaction is due", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    await run(100);
    expect(net.fetched()).toEqual(["typing"]);
    for (const id of ["phone", "sip"] as const) {
      act(() => intentHeroReaction(id));
      act(() => requestHeroReaction(id));
    }
    await run(2_000);
    expect(net.fetched()).toEqual(["typing"]);
    expect(bytes(root)).toBe(H264.typing);
  });

  it("design A: a headphones request fetches ONLY the T6 variant for its join, once", async () => {
    const { root } = await mountHero(<HeroPlayer />);
    headphones();
    expect(root).toHaveAttribute("data-reaction", "speaker:t6.k36");
    await run(2_000);
    act(() => requestHeroReaction("speaker")); // already queued: no refetch
    await run(500);
    expect(variants()).toEqual(["t6.k36"]);
    expect(bytes(root)).toBe(H264.typing + H264.t6K36);
  });

  it("while frozen, intents and requests fetch nothing", async () => {
    const { rerender } = await mountHero(<HeroPlayer />);
    rerender(<HeroPlayer frozen />);
    glance();
    headphones();
    act(() => intentHeroReaction("phone"));
    await settle(2);
    expect(net.fetched()).toEqual(["typing"]);
  });
});

describe("HeroPlayer E2 egg (M4)", () => {
  it("fetches the nod only once the poster -> headphones sequence is under way", async () => {
    await mountHero(<HeroPlayer />);
    act(() => heroHotspot("headphones", "intent")); // no poster visit yet
    expect(net.fetched()).toEqual(["typing"]);
    act(() => heroHotspot("queen-poster", "visit"));
    expect(net.fetched()).toEqual(["typing"]);
    act(() => heroHotspot("headphones", "intent"));
    expect(net.fetched()).toEqual(["typing", "nod.k180"]);
  });

  it("does nothing after leaving the hero", async () => {
    await mountHero(<HeroPlayer />);
    act(() => heroHotspot("queen-poster", "visit"));
    act(() => heroHotspot("", "leave"));
    act(() => heroHotspot("headphones", "intent"));
    act(() => heroHotspot("headphones", "visit"));
    expect(net.fetched()).toEqual(["typing"]);
  });

  it("poster then headphones plays T6 at its join and the nod at the next f180 after it", async () => {
    const { root, container } = await mountHero(<HeroPlayer />);
    // Every clip comes up at once (no held frame callbacks in happy-dom).
    for (const id of Object.keys(ACTIONS))
      Object.defineProperty(clipEl(container, id), "readyState", {
        get: () => 4,
      });
    act(() => heroHotspot("queen-poster", "visit"));
    headphones();
    const seen = new Set<string>();
    for (let ms = 0; ms < 16_000; ms += 20) {
      tick(20);
      await settle(1);
      seen.add(root.dataset.shown ?? "");
    }
    expect(seen).toEqual(new Set(["base", "t6.k36", "nod.k180"]));
  });
});

describe("HeroPlayer rotation prefetch flag (FEATURE_HERO_ROTATION_PREFETCH)", () => {
  // Draft rotation [null, "nod.k180", null, null]: the nod's clip starts at
  // 33 s (cycle 1, f180), so the 6 s look-ahead fetches it from 27 s.
  it("off (default): the rotation never fetches or plays an unfetched clip", async () => {
    const play = vi.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.play = play as () => Promise<void>;
    const { container } = await mountHero(<HeroPlayer />);
    tick(40_000);
    expect(net.fetched()).toEqual(["typing"]);
    expect(play.mock.contexts).not.toContain(clipEl(container, "nod.k180"));
  });

  it("on, with the nod slot (FEATURE_HERO_ROTATION_NOD): the rotation buffers the nod 6 s ahead", async () => {
    await mountHero(<HeroPlayer rotationPrefetch rotationNod />);
    tick(25_000);
    expect(net.fetched()).toEqual(["typing"]);
    tick(3_000);
    expect(net.fetched()).toEqual(["typing", "nod.k180"]);
  });

  it("on, default rotation (no nod, review N1): nothing but typing is ever buffered", async () => {
    await mountHero(<HeroPlayer rotationPrefetch />);
    tick(80_000);
    expect(net.fetched()).toEqual(["typing"]);
  });
});

describe("HeroPlayer stale first-frame callback (review finding 5)", () => {
  let hidden = false;
  beforeEach(() => {
    hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    holdFrameCallbacks();
  });
  const hideShow = () => {
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
  };
  const mountNod = async () => {
    const r = await mountHero(<HeroPlayer rotationPrefetch rotationNod />, {
      firstFrame: fireBase,
    });
    return { ...r, nod: clipEl(r.container, "nod.k180") };
  };

  // Rotation nod slot (both flags on) cuts in at cycle 1 f180 = 33 s. The
  // clip is prepared at i60 (prepare #1, its first-frame callback pending),
  // the tab is hidden (release) and shown again inside the enter window, so
  // the same clip is prepared again (#2). Prepare #1's late callback must not
  // mark #2 ready: only #2's own first frame may show the nod.
  it("an old prepare's callback cannot mark a newer prepare ready", async () => {
    const { root, nod } = await mountNod();
    const nodCbs = () => frameCbs.filter((f) => f.el === nod);
    tick(27_100);
    await settle(2); // the nod's blob is attached
    tick(32_900 - 27_100);
    for (let i = 0; i < 40 && nodCbs().length === 0; i++) {
      tick(20);
      await settle(1);
    }
    expect(nodCbs()).toHaveLength(1);
    expect(root.dataset.shown).toBe("base");
    hideShow();
    tick(20);
    await settle(1);
    expect(nodCbs()).toHaveLength(2);
    act(() => nodCbs()[0].cb()); // stale
    tick(20);
    expect(root.dataset.shown).toBe("base");
    act(() => nodCbs()[1].cb());
    tick(20);
    expect(root.dataset.shown).toBe("nod.k180");
  });

  it("a stale prepare play() rejection cannot release a newer prepare", async () => {
    const { root, nod } = await mountNod();
    tick(27_100);
    await settle(2);
    let rejectOld!: (e: Error) => void;
    const play = vi.spyOn(nod, "play").mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectOld = reject;
        }),
    );
    tick(33_020 - 27_100);
    await settle(1);
    expect(play).toHaveBeenCalledTimes(1);
    hideShow();
    tick(20);
    await settle(1);
    const cb = frameCbs.filter((f) => f.el === nod);
    expect(cb).toHaveLength(1);
    act(() => cb[0].cb());
    tick(20);
    expect(root.dataset.shown).toBe("nod.k180");
    await act(async () => rejectOld(new Error("old prepare failed late")));
    tick(40);
    expect(play).toHaveBeenCalledTimes(2);
    expect(root.dataset.shown).toBe("nod.k180");
  });

  it("a stale unpause play() rejection cannot release a newer prepare", async () => {
    const { root, nod, rerender } = await mountNod();
    tick(27_100);
    await settle(2);
    tick(33_020 - 27_100);
    await settle(1);
    const cb = frameCbs.filter((f) => f.el === nod);
    expect(cb).toHaveLength(1);
    act(() => cb[0].cb());
    tick(20);
    expect(root.dataset.shown).toBe("nod.k180");
    let rejectResume!: (e: Error) => void;
    const play = vi.spyOn(nod, "play").mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectResume = reject;
        }),
    );
    rerender(<HeroPlayer rotationPrefetch rotationNod frozen />);
    rerender(<HeroPlayer rotationPrefetch rotationNod />);
    expect(play).toHaveBeenCalledTimes(1);
    hideShow();
    tick(20);
    await settle(1);
    const newer = frameCbs.filter((f) => f.el === nod);
    expect(newer).toHaveLength(2);
    act(() => newer[1].cb());
    tick(20);
    expect(root.dataset.shown).toBe("nod.k180");
    await act(async () => rejectResume(new Error("old resume failed late")));
    tick(40);
    expect(play).toHaveBeenCalledTimes(2);
    expect(root.dataset.shown).toBe("nod.k180");
  });
});

describe("HeroPlayer glance: plan before fetch (review N1)", () => {
  beforeEach(holdFrameCallbacks);
  const mount = () => mountHero(<HeroPlayer />, { firstFrame: fireBase });

  it("hovers during the 30 s cooldown fetch nothing; after it, the next variant", async () => {
    const { root } = await mount();
    glance(); // ~f0 -> s1a.k36, starts at f36 (3 s)
    await run(4_000);
    expect(variants()).toEqual(["s1a.k36"]);
    for (let i = 0; i < 12; i++) {
      glance(); // every ~2.4 s until ~32 s: all inside the cooldown
      expect(root.dataset.reaction).toBe("glance-up:cooldown");
      tick(2_400);
    }
    expect(variants()).toEqual(["s1a.k36"]);
    tick(1_500); // ~34.3 s > 3 s + 30 s
    glance();
    await run(3_000);
    expect(variants()).toHaveLength(2);
  });

  it("a request in the last tick of frame J-4 locks the planned join: exactly one clip (review R1)", async () => {
    const { root } = await mount();
    tick(2_740); // abs 32.88: frame 32 = J-4 for the f36 join
    glance();
    expect(root.dataset.reaction).toBe("glance-up:s1a.k36");
    expect(variants()).toEqual(["s1a.k36"]); // due: fetched at once
    for (let i = 0; i < 10; i++) tick(20);
    await run(2_000);
    expect(variants()).toEqual(["s1a.k36"]);
  });

  it("repeated glances stop at 3 variants (H.264 sizes) and the egg nod still fits", async () => {
    const { root } = await mount();
    for (let i = 0; i < 6; i++) {
      glance();
      await run(33_500); // past each glance's cooldown
    }
    expect(variants()).toHaveLength(3);
    expect(root.dataset.reaction).toBe("glance-up:budget");
    const b = bytes(root);
    expect(b).toBeLessThanOrEqual(993_280 - H264.nod);
    act(() => heroHotspot("queen-poster", "visit"));
    act(() => heroHotspot("headphones", "intent"));
    expect(net.fetched()).toContain("nod.k180");
    expect(bytes(root)).toBe(b + H264.nod);
    expect(bytes(root)).toBeLessThanOrEqual(993_280);
  });

  it("a warmed S1a element paused on its first frame cuts in on its join with no new decode", async () => {
    const { root, container } = await mount();
    const k36 = clipEl(container, "s1a.k36");
    Object.defineProperty(k36, "readyState", { get: () => 2 });
    Object.defineProperty(k36, "seeking", { get: () => false });
    Object.defineProperty(k36, "paused", { get: () => true });
    let t = 0;
    let seeks = 0;
    Object.defineProperty(k36, "currentTime", {
      get: () => t,
      set: (v: number) => {
        t = v;
        seeks++;
      },
    });
    glance();
    let shownAt = -1;
    for (let ms = 0; ms < 3_400 && shownAt < 0; ms += 20) {
      tick(20);
      await settle(1);
      if (root.dataset.shown === "s1a.k36") shownAt = ms;
    }
    expect(root.dataset.primed).toBe("s1a.k36");
    expect(shownAt).toBeGreaterThan(2_900); // on the f36 join (3 s) ...
    expect(shownAt).toBeLessThan(3_100);
    // ... with no re-seek: the only seek is the warm pool's, to frame 0.
    expect(t).toBeCloseTo(0.5 / 12);
    expect(seeks).toBe(1);
  });

  it("not primed (nothing decoded yet): waits for its own first frame", async () => {
    const { root } = await mount();
    glance();
    await run(3_100);
    expect(root.dataset.primed).toBe("");
    expect(root.dataset.shown).toBe("base");
  });
});

/* Review R1: an AV1 base loop that fails to LOAD (404, network error)
   falls back to H.264 like a decode failure, as base 7c6ea46 did natively
   with <source>. A reaction clip that fails to load is refunded and
   skipped; the loop keeps playing. */
describe("HeroPlayer load failures (review R1)", () => {
  const av1Typing = (c: { id: string; codec: string }) =>
    c.id === "typing" && c.codec === "av1";

  it.each([404, "network"] as const)(
    "AV1 loop answered with %s -> live on H.264, nothing wasted",
    async (failure) => {
      HTMLMediaElement.prototype.canPlayType = () => "probably";
      net.fail = (c) => (av1Typing(c) ? failure : undefined);
      const { root, base } = await mountHero(<HeroPlayer />);
      await settle(3);
      expect(net.calls.map((c) => [c.id, c.codec])).toEqual([
        ["typing", "av1"],
        ["typing", "h264"],
      ]);
      expect(root.dataset.state).toBe("live");
      expect(root.dataset.reactions).toBe("ready");
      expect(base).toHaveAttribute("src", expect.stringMatching(/^blob:/));
      expect(root.dataset.wasted).toBe("0");
      expect(bytes(root)).toBe(H264.typing);
    },
  );

  it("both loop files fail to load -> the still (failed), no third fetch", async () => {
    HTMLMediaElement.prototype.canPlayType = () => "probably";
    net.fail = (c) => (c.id === "typing" ? 404 : undefined);
    const { root } = await mountHero(<HeroPlayer />);
    await settle(3);
    expect(net.calls.map((c) => c.codec)).toEqual(["av1", "h264"]);
    expect(root.dataset.state).toBe("failed");
  });

  it("a reaction clip that fails to load is refunded and never shown; the loop keeps playing", async () => {
    net.fail = (c) => (c.id.startsWith("s1a.") ? 404 : undefined);
    const { root } = await mountHero(<HeroPlayer />);
    glance();
    await run(4_000);
    expect(variants()).toEqual(["s1a.k36"]);
    expect(root.dataset.state).toBe("live");
    expect(root.dataset.shown).toBe("base");
    expect(bytes(root)).toBe(H264.typing);
  });
});

/* Review R3: the adaptive lead's wiring (N1). The clip store times each
   download; the harness simulates the link per clip. */
describe("HeroPlayer adaptive fetch lead wiring (review N1/R3)", () => {
  const slow = { bps: 700_000, ttfbMs: 270 };
  const fast = { bps: 20_000_000, ttfbMs: 10 };
  const setConnection = (c: object | undefined) =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      get: () => c,
    });
  afterEach(() => setConnection(undefined));

  it("a slow base-loop download lengthens the lead (host.link feeds the engine)", async () => {
    net.timeLinks((c) => (c.id === "typing" ? slow : fast));
    const { root } = await mountHero(<HeroPlayer />);
    headphones();
    expect(root.dataset.linkKbps).toBe("700");
    expect(Number(root.dataset.fetchLead)).toBeGreaterThan(FETCH_LEAD_FRAMES);
  });

  it("takes the SLOWEST estimate: a fast NetInfo downlink doesn't hide a slow loop download", async () => {
    setConnection({ effectiveType: "4g", downlink: 10, rtt: 50 });
    net.timeLinks((c) => (c.id === "typing" ? slow : fast));
    const { root } = await mountHero(<HeroPlayer />);
    headphones();
    expect(root.dataset.linkKbps).toBe("700");
    expect(Number(root.dataset.fetchLead)).toBeGreaterThan(FETCH_LEAD_FRAMES);
  });

  it("a slow NetInfo downlink wins over a fast loop download", async () => {
    setConnection({ effectiveType: "4g", downlink: 0.7, rtt: 270 });
    net.timeLinks(() => fast);
    const { root } = await mountHero(<HeroPlayer />);
    headphones();
    expect(root.dataset.linkKbps).toBe("700");
    expect(Number(root.dataset.fetchLead)).toBeGreaterThan(FETCH_LEAD_FRAMES);
  });

  it("a fast loop and no other estimate keep the 18-frame minimum", async () => {
    net.timeLinks(() => fast);
    const { root } = await mountHero(<HeroPlayer />);
    headphones();
    expect(root.dataset.fetchLead).toBe(String(FETCH_LEAD_FRAMES));
  });

  it("a downloaded reaction clip updates the estimate: a slow first clip lengthens the next clip's lead", async () => {
    net.timeLinks((c) => (c.id.startsWith("s1a.") ? slow : fast));
    const { root } = await mountHero(<HeroPlayer />);
    glance();
    expect(root.dataset.fetchLead).toBe(String(FETCH_LEAD_FRAMES));
    await run(8_000);
    expect(variants()).toEqual(["s1a.k36"]);
    headphones();
    expect(root.dataset.linkKbps).toBe("700");
    expect(Number(root.dataset.fetchLead)).toBeGreaterThan(FETCH_LEAD_FRAMES);
  });
});

/* Review R3 (optional): the two defensive guards of the fallback path. */
describe("HeroPlayer fallback guards (review R3)", () => {
  it("an `error` on the detached base (no src, H.264 still loading) is not a second failure", async () => {
    HTMLMediaElement.prototype.canPlayType = () => "probably";
    net.fail = (c) =>
      c.id === "typing" && c.codec === "av1" ? 404 : undefined;
    net.hold = true;
    const view = render(<HeroPlayer />);
    const root = view.container.querySelector<HTMLElement>(".hero")!;
    const base = view.container.querySelector<HTMLVideoElement>(
      'video[data-clip="base"]',
    )!;
    await settle(3);
    expect(net.calls.map((c) => c.codec)).toEqual(["av1", "h264"]);
    expect(base).not.toHaveAttribute("src");
    act(() => {
      base.dispatchEvent(new Event("error"));
    });
    expect(root.dataset.state).not.toBe("failed");
    act(() => net.calls[1].resolve());
    await settle(3);
    expect(base).toHaveAttribute("src", expect.stringMatching(/^blob:/));
    expect(root.dataset.state).not.toBe("failed");
  });

  it("a late non-media play() rejection for the replaced AV1 source doesn't kill the H.264 loop", async () => {
    HTMLMediaElement.prototype.canPlayType = () => "probably";
    let rejectOld: ((e: unknown) => void) | undefined;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (rejectOld === undefined) {
        // First play() = the AV1 blob: the element errors at once, the
        // promise rejects later with a non-media error.
        this.dispatchEvent(new Event("error"));
        return new Promise((_, rej) => (rejectOld = rej));
      }
      return Promise.resolve();
    };
    const { root } = await mountHero(<HeroPlayer />);
    await settle(3);
    expect(root.dataset.state).toBe("live");
    rejectOld!(new DOMException("late", "NotAllowedError"));
    await settle(3);
    expect(root.dataset.state).toBe("live");
  });
});
