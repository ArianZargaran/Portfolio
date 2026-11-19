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

    // No reaction clip is installed (S1a/S1b/T2 wait for their locks), so
    // no reaction intent fetches anything.
    for (const id of ["speaker", "phone", "sip"] as const)
      act(() => intentHeroReaction(id));
    expect(fetched(container)).toEqual(["typing"]);
    expect(load).not.toHaveBeenCalled();
  });

  it("mounts only the installed clips: typing and nod.k180", () => {
    const { container } = render(<HeroPlayer />);
    expect(
      videos(container)
        .map((v) => NAMES.get(v.src))
        .sort(),
    ).toEqual(["nod.k180", "typing"].sort());
  });

  it("ignores intents for reactions without clips, and while frozen", () => {
    const { container, rerender } = render(<HeroPlayer />);
    act(() => intentHeroReaction("speaker")); // no clip yet
    expect(fetched(container)).toEqual(["typing"]);
    rerender(<HeroPlayer frozen />);
    act(() => intentHeroReaction("phone"));
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
