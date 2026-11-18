/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   The hero clips are aria-hidden <video>s with no role or text; this test
   checks which of them the player asks the browser to fetch. */
import { act, render } from "@testing-library/react";

import { ACTIONS, BASE_LOOP } from "~/scene/hero/actions";
import { heroHotspot, intentHeroReaction } from "~/scene/hero/reaction-bus";

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
const NAMES = new Map([
  [BASE_LOOP.clip.sources[0].src, "typing"],
  [ACTIONS.nod.clip.sources[0].src, "nod"],
  [ACTIONS.bounce.clip.sources[0].src, "bounce"],
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

    act(() => intentHeroReaction("bounce"));
    expect(fetched(container)).toEqual(["typing", "bounce"]);
    expect(load).toHaveBeenCalledTimes(1);
    // typing + bounce, charged at H.264 sizes until the codec is known
    expect(container.querySelector(".hero")?.getAttribute("data-bytes")).toBe(
      String(445_269 + 115_915),
    );

    act(() => intentHeroReaction("bounce")); // already buffered: no refetch
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("ignores intents for reactions without clips, and while frozen", () => {
    const { container, rerender } = render(<HeroPlayer />);
    act(() => intentHeroReaction("speaker")); // no clip yet
    expect(fetched(container)).toEqual(["typing"]);
    rerender(<HeroPlayer frozen />);
    act(() => intentHeroReaction("bounce"));
    expect(fetched(container)).toEqual(["typing"]);
    expect(load).not.toHaveBeenCalled();
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
    expect(fetched(container)).toEqual(["typing", "nod"]);
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

  // Draft rotation [null, "nod", "bounce", null]: the nod's clip starts at
  // about 32 s, so the 6 s look-ahead would fetch it from about 26 s.
  it("off (default): the rotation never fetches or plays an unfetched clip", () => {
    const { container } = render(<HeroPlayer />);
    act(() => vi.advanceTimersByTime(40_000));
    expect(fetched(container)).toEqual(["typing"]);
    const nod = [...container.querySelectorAll("video")].find(
      (v) =>
        NAMES.get(v.querySelector("source")?.getAttribute("src") ?? "") ===
        "nod",
    )!;
    expect(play.mock.contexts).not.toContain(nod);
  });

  it("on, with the nod slot (FEATURE_HERO_ROTATION_NOD): the rotation buffers the nod 6 s ahead", () => {
    const { container } = render(<HeroPlayer rotationPrefetch rotationNod />);
    act(() => vi.advanceTimersByTime(25_000));
    expect(fetched(container)).toEqual(["typing"]);
    act(() => vi.advanceTimersByTime(3_000));
    expect(fetched(container)).toEqual(["typing", "nod"]);
  });

  it("on, default rotation (no nod, review N1): only the bounce is ever buffered", () => {
    const { container } = render(<HeroPlayer rotationPrefetch />);
    act(() => vi.advanceTimersByTime(34_000));
    expect(fetched(container)).toEqual(["typing"]);
    act(() => vi.advanceTimersByTime(8_000));
    expect(fetched(container)).toEqual(["typing", "bounce"]);
  });
});
