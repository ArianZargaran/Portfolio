/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   The hero clips are aria-hidden <video>s with no role or text, so Testing
   Library queries cannot reach them; this test checks their markup. */
import { act, render } from "@testing-library/react";

import { ACTIONS } from "~/scene/hero/actions";
import {
  FREEZE_STORAGE_KEY,
  heroFreeze,
  resetHeroFreezeForTests,
} from "~/scene/hero/freeze";
import { resetHeroGateForTests } from "~/scene/hero/net-gate-store";

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
  beforeEach(() => {
    resetHeroGateForTests();
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { effectiveType: "4g" },
    });
  });
  afterEach(() => {
    window.matchMedia = original;
    Reflect.deleteProperty(navigator, "connection");
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
    // Design A: one element per baked clip (the locked install has
    // nod.k180 and s1a.k0..k180), none fetched up front (intent/trigger
    // fetch, M3).
    expect(videos.map((v) => v.dataset.clip)).toEqual([
      "base",
      ...Object.keys(ACTIONS),
    ]);
    expect(videos).toHaveLength(8);
    for (const v of videos.slice(1)) expect(v.preload).toBe("none");
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

describe("HeroMount network gate (M7)", () => {
  const original = window.matchMedia;
  beforeEach(() => {
    resetHeroGateForTests();
    resetHeroFreezeForTests();
    window.localStorage.clear();
    delete document.documentElement.dataset.heroGate;
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = vi.fn();
    mockMatchMedia({ "(min-width: 1025px)": true });
  });
  afterEach(() => {
    window.matchMedia = original;
    Reflect.deleteProperty(navigator, "connection");
  });
  const withConnection = (value: object) =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value,
    });

  it("Save-Data: no player, no media", async () => {
    withConnection({ effectiveType: "4g", saveData: true });
    const { container } = render(<HeroMount />);
    await flush();
    await flush();
    expect(container.querySelector("video")).toBeNull();
    // Save-Data is caught before the gate even runs (motionAllowed).
    expect(document.documentElement.dataset.heroGate).toBeUndefined();
  });

  it("a reported 3G connection: still", async () => {
    withConnection({ effectiveType: "3g" });
    const { container } = render(<HeroMount />);
    await flush();
    await flush();
    expect(container.querySelector("video")).toBeNull();
    expect(document.documentElement.dataset.heroGate).toBe(
      "still:connection-slow",
    );
  });

  it("no connection API and nothing measurable: starts frozen for this page only", async () => {
    const { container } = render(<HeroMount />);
    await flush();
    await flush();
    expect(document.documentElement.dataset.heroGate).toBe(
      "frozen:inconclusive",
    );
    expect(heroFreeze().get()).toBe(true);
    expect(container.querySelector("video")).toBeNull(); // still only
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
    act(() => heroFreeze().set(false)); // the visitor presses play
    await flush();
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("no connection API: a remembered verdict (<= 7 days) is reused", async () => {
    window.localStorage.setItem(
      "hero:net-verdict",
      JSON.stringify({ verdict: "play", at: Date.now() - 1000 }),
    );
    const { container } = render(<HeroMount />);
    await flush();
    await flush();
    expect(document.documentElement.dataset.heroGate).toBe("play:stored");
    expect(container.querySelector("video")).not.toBeNull();
  });
});
