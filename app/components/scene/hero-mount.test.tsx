/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   The hero clips are aria-hidden <video>s with no role or text, so Testing
   Library queries cannot reach them; this test checks their markup. */
import { act, render } from "@testing-library/react";

import { HeroMount } from "./hero-mount";
import HeroPlayer from "./hero-player";

function mockMatchMedia(matches: Record<string, boolean>) {
  window.matchMedia = ((q: string) => ({
    matches: matches[q] ?? false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 400));
  });
};

describe("HeroMount", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("mounts the player after load + idle when motion is allowed (control)", async () => {
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new Error("no media"));
    HTMLMediaElement.prototype.pause = vi.fn();
    mockMatchMedia({ "(min-width: 1025px)": true });
    const { container } = render(<HeroMount />);
    await flush();
    await flush();
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("renders nothing (no media requested) under prefers-reduced-motion", async () => {
    mockMatchMedia({
      "(min-width: 1025px)": true,
      "(prefers-reduced-motion: reduce)": true,
    });
    const { container } = render(<HeroMount />);
    await flush();
    expect(container.querySelector("video")).toBeNull();
  });

  it("renders nothing on the tablet/mobile compositions", async () => {
    mockMatchMedia({ "(min-width: 1025px)": false });
    const { container } = render(<HeroMount />);
    await flush();
    expect(container.querySelector("video")).toBeNull();
  });
});

describe("HeroPlayer markup", () => {
  it("renders muted, hidden-from-AT clips with AV1 first and an H.264 fallback", () => {
    // happy-dom has no media playback; only check the markup.
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new Error("no media"));
    HTMLMediaElement.prototype.pause = vi.fn();
    const { container } = render(<HeroPlayer />);
    const root = container.querySelector(".hero")!;
    expect(root).toHaveAttribute("aria-hidden", "true");
    const videos = [...container.querySelectorAll("video")];
    expect(videos.map((v) => v.dataset.clip)).toEqual([
      "base",
      "nod",
      "bounce",
    ]);
    for (const v of videos) {
      expect(v.muted).toBe(true);
      expect(v).toHaveAttribute("playsinline");
    }
    expect(videos[0].loop).toBe(true);
    const types = [...videos[0].querySelectorAll("source")].map((s) =>
      s.getAttribute("type"),
    );
    expect(types[0]).toBe('video/mp4; codecs="av01.0.01M.08"');
    expect(types[types.length - 1]).toMatch(/^video\/mp4; codecs="avc1/);
  });
});
