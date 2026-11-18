/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   The hero clips are aria-hidden <video>s with no role or text; this test
   checks which of them the player asks the browser to fetch. */
import { act, render } from "@testing-library/react";

import { ACTIONS, BASE_LOOP } from "~/scene/hero/actions";
import { intentHeroReaction } from "~/scene/hero/reaction-bus";

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
