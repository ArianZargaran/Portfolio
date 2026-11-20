/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   The hero clips are aria-hidden <video>s with no role or text; this test
   checks which of them the player asks the browser to fetch. */
import { act, render } from "@testing-library/react";

import { ACTIONS, BASE_LOOP } from "~/scene/hero/actions";
import {
  heroHotspot,
  intentHeroReaction,
  requestHeroReaction,
} from "~/scene/hero/reaction-bus";

import HeroPlayer from "./hero-player";

const videos = (c: HTMLElement) =>
  [...c.querySelectorAll("video")].map((v) => ({
    src: v.querySelector("source")?.getAttribute("src") ?? "",
    preload: v.preload,
  }));
const fetched = (c: HTMLElement) =>
  videos(c)
    .filter((v) => v.preload === "auto")
    .map((v) => NAMES.get(v.src));
const NAMES = new Map<string, string>([
  [BASE_LOOP.clip.sources[0].src, "typing"],
  ...Object.values(ACTIONS).map((a) => [a.clip.sources[0].src, a.id] as const),
]);

describe("HeroPlayer intent fetch (M3)", () => {
  let load: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = vi.fn();
    load = vi.fn();
    HTMLMediaElement.prototype.load = load as () => void;
  });

  it("fetches only the typing loop until an intent arrives", async () => {
    const { container } = render(<HeroPlayer />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(fetched(container)).toEqual(["typing"]);
    expect(load).not.toHaveBeenCalled();

    // Reactions without a clip (S1b/T2 wait for their locks; phone and sip
    // have no art) fetch nothing.
    for (const id of ["phone", "sip"] as const)
      act(() => intentHeroReaction(id));
    expect(fetched(container)).toEqual(["typing"]);
    expect(load).not.toHaveBeenCalled();

    // Design A: the S1a intent fetches ONLY the variant for the next
    // reachable join (clock ~f0 -> f36), never the other five.
    act(() => intentHeroReaction("glance-up"));
    expect(fetched(container)).toEqual(["typing", "s1a.k36"]);
    expect(load).toHaveBeenCalledTimes(1);
    // typing + s1a.k36, charged at H.264 sizes until the codec is known
    expect(container.querySelector(".hero")?.getAttribute("data-bytes")).toBe(
      String(442_525 + 119_543),
    );
    act(() => intentHeroReaction("glance-up")); // already buffered: no refetch
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("mounts only the installed clips: typing, nod.k180, the six S1a and the six T6 variants", () => {
    const { container } = render(<HeroPlayer />);
    expect(
      videos(container)
        .map((v) => NAMES.get(v.src))
        .sort(),
    ).toEqual(
      [
        "nod.k180",
        "typing",
        ...[0, 36, 72, 108, 144, 180].map((k) => `s1a.k${k}`),
        ...[0, 36, 72, 108, 144, 180].map((k) => `t6.k${k}`),
      ].sort(),
    );
    // No S1b / T2 clip is mounted (not locked).
    expect(videos(container).some((v) => /\/(s1b|t2)\./.test(v.src))).toBe(
      false,
    );
  });

  it("ignores intents for reactions without clips, and while frozen", () => {
    const { container, rerender } = render(<HeroPlayer />);
    act(() => intentHeroReaction("phone")); // no clip yet
    expect(fetched(container)).toEqual(["typing"]);
    rerender(<HeroPlayer frozen />);
    act(() => intentHeroReaction("phone"));
    act(() => intentHeroReaction("glance-up")); // frozen: nothing
    act(() => intentHeroReaction("speaker")); // frozen: nothing
    expect(fetched(container)).toEqual(["typing"]);
    expect(fetched(container)).toEqual(["typing"]);
    expect(load).not.toHaveBeenCalled();
  });
});

describe("HeroPlayer speaker groove (T6 v3)", () => {
  let load: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = vi.fn();
    load = vi.fn();
    HTMLMediaElement.prototype.load = load as () => void;
  });

  it("a speakers intent fetches ONLY the T6 variant for the next reachable join (clock ~f0 -> t6.k36)", () => {
    const { container } = render(<HeroPlayer />);
    act(() => intentHeroReaction("speaker"));
    expect(fetched(container)).toEqual(["typing", "t6.k36"]);
    expect(load).toHaveBeenCalledTimes(1);
    const root = container.querySelector(".hero")!;
    expect(root).toHaveAttribute("data-reaction", "speaker:t6.k36");
    // typing + t6.k36 at H.264 sizes until the codec is known
    expect(root).toHaveAttribute("data-bytes", String(442_525 + 126_461));
    act(() => requestHeroReaction("speaker")); // already buffered: no refetch
    expect(load).toHaveBeenCalledTimes(1);
    expect(fetched(container)).toEqual(["typing", "t6.k36"]);
  });

  it("poster then speakers (the E2 sequence): the speakers fetch the nod and one T6 variant, nothing else", () => {
    const { container } = render(<HeroPlayer />);
    act(() => heroHotspot("queen-poster", "visit"));
    act(() => heroHotspot("speakers", "intent"));
    act(() => intentHeroReaction("speaker"));
    act(() => heroHotspot("speakers", "visit"));
    act(() => requestHeroReaction("speaker"));
    expect(fetched(container)).toEqual(["typing", "nod.k180", "t6.k36"]);
    expect(
      Number(container.querySelector(".hero")!.getAttribute("data-bytes")),
    ).toBe(442_525 + 147_578 + 126_461);
  });

  it("while frozen a speakers intent or request fetches nothing", () => {
    const { container } = render(<HeroPlayer frozen />);
    act(() => intentHeroReaction("speaker"));
    act(() => requestHeroReaction("speaker"));
    expect(fetched(container)).toEqual(["typing"]);
    expect(load).not.toHaveBeenCalled();
  });
});

describe("HeroPlayer requests without clips", () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = vi.fn();
    HTMLMediaElement.prototype.load = vi.fn();
  });

  it("a request for a reaction without a clip fetches nothing", () => {
    const { container } = render(<HeroPlayer />);
    act(() => requestHeroReaction("sip"));
    expect(fetched(container)).toEqual(["typing"]);
  });
});

describe("HeroPlayer E2 egg (M4)", () => {
  let load: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = vi.fn();
    load = vi.fn();
    HTMLMediaElement.prototype.load = load as () => void;
  });

  it("fetches the nod only once the poster -> speakers sequence is under way", () => {
    const { container } = render(<HeroPlayer />);
    act(() => heroHotspot("speakers", "intent")); // no poster visit yet
    expect(fetched(container)).toEqual(["typing"]);
    act(() => heroHotspot("queen-poster", "visit"));
    expect(fetched(container)).toEqual(["typing"]);
    act(() => heroHotspot("speakers", "intent"));
    expect(fetched(container)).toEqual(["typing", "nod.k180"]);
  });

  it("does nothing after leaving the hero", () => {
    const { container } = render(<HeroPlayer />);
    act(() => heroHotspot("queen-poster", "visit"));
    act(() => heroHotspot("", "leave"));
    act(() => heroHotspot("speakers", "intent"));
    act(() => heroHotspot("speakers", "visit"));
    expect(fetched(container)).toEqual(["typing"]);
  });
});

describe("HeroPlayer rotation prefetch flag (FEATURE_HERO_ROTATION_PREFETCH)", () => {
  let play: ReturnType<typeof vi.fn>;
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
    play = vi.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.play = play as () => Promise<void>;
    HTMLMediaElement.prototype.pause = vi.fn();
    HTMLMediaElement.prototype.load = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  // Draft rotation [null, "nod.k180", null, null]: the nod's clip starts at
  // 33 s (cycle 1, f180), so the 6 s look-ahead fetches it from 27 s. The
  // cycle-2 bounce slot is empty until S1b locks.
  it("off (default): the rotation never fetches or plays an unfetched clip", () => {
    const { container } = render(<HeroPlayer />);
    act(() => vi.advanceTimersByTime(40_000));
    expect(fetched(container)).toEqual(["typing"]);
    const nod = [...container.querySelectorAll("video")].find(
      (v) =>
        NAMES.get(v.querySelector("source")?.getAttribute("src") ?? "") ===
        "nod.k180",
    )!;
    expect(play.mock.contexts).not.toContain(nod);
  });

  it("on, with the nod slot (FEATURE_HERO_ROTATION_NOD): the rotation buffers the nod 6 s ahead", () => {
    const { container } = render(<HeroPlayer rotationPrefetch rotationNod />);
    act(() => vi.advanceTimersByTime(25_000));
    expect(fetched(container)).toEqual(["typing"]);
    act(() => vi.advanceTimersByTime(3_000));
    expect(fetched(container)).toEqual(["typing", "nod.k180"]);
  });

  it("on, default rotation (no nod, review N1): nothing but typing is ever buffered", () => {
    const { container } = render(<HeroPlayer rotationPrefetch />);
    act(() => vi.advanceTimersByTime(80_000));
    expect(fetched(container)).toEqual(["typing"]);
  });
});

describe("HeroPlayer stale first-frame callback (review finding 5)", () => {
  type Cb = () => void;
  let frameCbs: { el: HTMLVideoElement; cb: Cb }[];
  let hidden = false;
  const original = Object.getOwnPropertyDescriptor(
    HTMLVideoElement.prototype,
    "requestVideoFrameCallback",
  );
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
    frameCbs = [];
    hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = vi.fn();
    HTMLMediaElement.prototype.load = vi.fn();
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
  });
  afterEach(() => {
    if (original)
      Object.defineProperty(
        HTMLVideoElement.prototype,
        "requestVideoFrameCallback",
        original,
      );
    else
      delete (
        HTMLVideoElement.prototype as { requestVideoFrameCallback?: unknown }
      ).requestVideoFrameCallback;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const flush = () =>
    act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  // Rotation nod slot (both flags on) cuts in at cycle 1 f180 = 33 s. The
  // clip is prepared at i60 (prepare #1, its first-frame callback pending),
  // the tab is hidden (release) and shown again inside the enter window, so
  // the same clip is prepared again (#2). Prepare #1's late callback must not
  // mark #2 ready: only #2's own first frame may show the nod.
  it("an old prepare's callback cannot mark a newer prepare ready", async () => {
    const { container } = render(<HeroPlayer rotationPrefetch rotationNod />);
    const root = container.querySelector<HTMLElement>("[data-shown]")!;
    const nod = [...container.querySelectorAll("video")].find(
      (v) =>
        NAMES.get(v.querySelector("source")?.getAttribute("src") ?? "") ===
        "nod.k180",
    )!;
    const nodCbs = () => frameCbs.filter((f) => f.el === nod);

    tick(32_900); // just before i60; then step frame by frame to the prepare
    for (let i = 0; i < 40 && nodCbs().length === 0; i++) {
      tick(20);
      await flush();
    }
    expect(nodCbs()).toHaveLength(1); // prepare #1, first frame not yet up
    expect(root.dataset.shown).toBe("base");

    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    tick(20);
    await flush();
    expect(nodCbs()).toHaveLength(2); // prepare #2 of the same clip

    act(() => nodCbs()[0].cb()); // stale: prepare #1's first frame
    tick(20);
    expect(root.dataset.shown).toBe("base");

    act(() => nodCbs()[1].cb()); // prepare #2's own first frame
    tick(20);
    expect(root.dataset.shown).toBe("nod.k180");
  });

  const hideShow = () => {
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
  };

  it("a stale prepare play() rejection cannot release a newer prepare", async () => {
    const { container } = render(<HeroPlayer rotationPrefetch rotationNod />);
    const root = container.querySelector<HTMLElement>("[data-shown]")!;
    const nod = container.querySelector<HTMLVideoElement>(
      '[data-clip="nod.k180"]',
    )!;
    let rejectOld!: (e: Error) => void;
    const play = vi.spyOn(nod, "play").mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectOld = reject;
        }),
    );
    tick(33_020);
    await flush();
    expect(play).toHaveBeenCalledTimes(1); // prepare #1: play still pending
    hideShow();
    tick(20);
    await flush();
    const cb = frameCbs.filter((f) => f.el === nod);
    expect(cb).toHaveLength(1); // only prepare #2 got a first-frame callback
    act(() => cb[0].cb());
    tick(20);
    expect(root.dataset.shown).toBe("nod.k180");

    await act(async () => rejectOld(new Error("old prepare failed late")));
    tick(40);
    expect(play).toHaveBeenCalledTimes(2); // no third prepare after a stale release
    expect(root.dataset.shown).toBe("nod.k180");
  });

  it("a stale unpause play() rejection cannot release a newer prepare", async () => {
    const { container, rerender } = render(
      <HeroPlayer rotationPrefetch rotationNod />,
    );
    const root = container.querySelector<HTMLElement>("[data-shown]")!;
    const nod = container.querySelector<HTMLVideoElement>(
      '[data-clip="nod.k180"]',
    )!;
    tick(33_020);
    await flush();
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
    expect(play).toHaveBeenCalledTimes(1); // unpause #1: play still pending
    hideShow(); // release, then prepare #2 at the same enter window
    tick(20);
    await flush();
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
  type Cb = () => void;
  let frameCbs: { el: HTMLVideoElement; cb: Cb }[];
  let load: ReturnType<typeof vi.fn>;
  const original = Object.getOwnPropertyDescriptor(
    HTMLVideoElement.prototype,
    "requestVideoFrameCallback",
  );
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
    frameCbs = [];
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = vi.fn();
    load = vi.fn();
    HTMLMediaElement.prototype.load = load as () => void;
    // First-frame callbacks are held: only a primed element can be ready.
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
  });
  afterEach(() => {
    if (original)
      Object.defineProperty(
        HTMLVideoElement.prototype,
        "requestVideoFrameCallback",
        original,
      );
    else
      delete (
        HTMLVideoElement.prototype as { requestVideoFrameCallback?: unknown }
      ).requestVideoFrameCallback;
    vi.useRealTimers();
  });
  const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const flush = () =>
    act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  const glance = () => {
    act(() => intentHeroReaction("glance-up"));
    act(() => requestHeroReaction("glance-up"));
  };
  const s1a = (c: HTMLElement) =>
    (fetched(c) as string[]).filter((id) => id.startsWith("s1a."));

  it("hovers during the 30 s cooldown fetch nothing; after it, the next variant", () => {
    const { container } = render(<HeroPlayer />);
    const root = container.querySelector<HTMLElement>(".hero")!;
    glance(); // ~f0 -> s1a.k36, starts at f36 (3 s)
    expect(s1a(container)).toEqual(["s1a.k36"]);
    expect(load).toHaveBeenCalledTimes(1);
    tick(4_000); // the glance is playing / has started
    for (let i = 0; i < 12; i++) {
      glance(); // every ~2.4 s until ~32 s: all inside the cooldown
      expect(root.dataset.reaction).toBe("glance-up:cooldown");
      tick(2_400);
    }
    expect(s1a(container)).toEqual(["s1a.k36"]);
    expect(load).toHaveBeenCalledTimes(1);
    tick(1_500); // ~34.3 s > 3 s + 30 s
    glance();
    expect(s1a(container)).toHaveLength(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("a request in the last tick of frame J-4 locks the planned join: exactly one clip (review R1)", () => {
    const { container } = render(<HeroPlayer />);
    const root = container.querySelector<HTMLElement>(".hero")!;
    tick(2_740); // abs 32.88: frame 32 = J-4 for the f36 join
    glance();
    expect(root.dataset.reaction).toBe("glance-up:s1a.k36");
    expect(s1a(container)).toEqual(["s1a.k36"]);
    // The next ticks cross into frame 33 (J-3): the slot must stay on f36,
    // not be re-planned onto f72 with a second fetch.
    for (let i = 0; i < 10; i++) tick(20);
    expect(s1a(container)).toEqual(["s1a.k36"]);
    expect(load).toHaveBeenCalledTimes(1);
    tick(2_000);
    expect(s1a(container)).toEqual(["s1a.k36"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("repeated glances stop at 3 variants (H.264 sizes) and the egg nod still fits", () => {
    const { container } = render(<HeroPlayer />);
    const root = container.querySelector<HTMLElement>(".hero")!;
    for (let i = 0; i < 6; i++) {
      glance();
      tick(33_500); // past each glance's cooldown
    }
    expect(s1a(container)).toHaveLength(3);
    expect(root.dataset.reaction).toBe("glance-up:budget");
    const bytes = Number(root.dataset.bytes);
    expect(bytes).toBeLessThanOrEqual(993_280 - 147_578);
    act(() => heroHotspot("queen-poster", "visit"));
    act(() => heroHotspot("speakers", "intent"));
    expect(fetched(container)).toContain("nod.k180");
    expect(Number(root.dataset.bytes)).toBe(bytes + 147_578);
    expect(Number(root.dataset.bytes)).toBeLessThanOrEqual(993_280);
  });

  it("a warmed S1a element paused on its first frame cuts in on its join with no new decode", async () => {
    const { container } = render(<HeroPlayer />);
    const root = container.querySelector<HTMLElement>(".hero")!;
    const k36 = container.querySelector<HTMLVideoElement>(
      '[data-clip="s1a.k36"]',
    )!;
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
      await flush();
      if (root.dataset.shown === "s1a.k36") shownAt = ms;
    }
    expect(root.dataset.primed).toBe("s1a.k36");
    expect(shownAt).toBeGreaterThan(2_900); // on the f36 join (3 s) ...
    expect(shownAt).toBeLessThan(3_100);
    // ... without a first-frame callback (none is ever fired here) and with
    // no re-seek: the only seek is the warm pool's, to frame 0.
    expect(t).toBeCloseTo(0.5 / 12);
    expect(seeks).toBe(1);
  });

  it("not primed (nothing decoded yet): waits for its own first frame", async () => {
    const { container } = render(<HeroPlayer />);
    const root = container.querySelector<HTMLElement>(".hero")!;
    glance();
    for (let ms = 0; ms < 3_100; ms += 20) {
      tick(20);
      await flush();
    }
    expect(root.dataset.primed).toBe("");
    expect(root.dataset.shown).toBe("base");
  });
});
