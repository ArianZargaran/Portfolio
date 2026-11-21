/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   Checks that no hero <video> is rendered. */
/**
 * Change 1 (code split): reduced motion and Save-Data load NEITHER lazy hero
 * chunk (the loop player nor the reactions chunk), while the allowed case
 * loads the player. The module factories below count real imports.
 */
import { act, render } from "@testing-library/react";

import { resetHeroFreezeForTests } from "~/scene/hero/freeze";
import { resetHeroGateForTests } from "~/scene/hero/net-gate-store";

import { HeroMount } from "./hero-mount";

const loaded = vi.hoisted(() => ({ player: 0, reactions: 0 }));
vi.mock("./hero-player", async (importOriginal) => {
  loaded.player++;
  return importOriginal();
});
vi.mock("~/scene/hero/hero-reactions", async (importOriginal) => {
  loaded.reactions++;
  return importOriginal();
});

function mockMatchMedia(matches: Record<string, boolean>) {
  window.matchMedia = ((q: string) => ({
    matches: matches[q] ?? false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 400));
  });

describe("HeroMount loads no player script without motion (change 1)", () => {
  const original = window.matchMedia;
  beforeEach(() => {
    resetHeroGateForTests();
    resetHeroFreezeForTests();
    window.localStorage.clear();
    HTMLMediaElement.prototype.play = () => new Promise<void>(() => undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
    globalThis.fetch = vi.fn(() => new Promise<Response>(() => undefined));
  });
  afterEach(() => {
    window.matchMedia = original;
    Reflect.deleteProperty(navigator, "connection");
  });

  it("prefers-reduced-motion: neither chunk, no video, no fetch", async () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { effectiveType: "4g" },
    });
    mockMatchMedia({
      "(min-width: 1025px)": true,
      "(prefers-reduced-motion: reduce)": true,
    });
    const { container } = render(<HeroMount />);
    await flush();
    await flush();
    expect(loaded).toEqual({ player: 0, reactions: 0 });
    expect(container.querySelector("video")).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("Save-Data: neither chunk, no video, no fetch", async () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { effectiveType: "4g", saveData: true },
    });
    mockMatchMedia({ "(min-width: 1025px)": true });
    const { container } = render(<HeroMount />);
    await flush();
    await flush();
    expect(loaded).toEqual({ player: 0, reactions: 0 });
    expect(container.querySelector("video")).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("control: motion allowed loads the loop player (the reactions chunk waits for the first frame)", async () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { effectiveType: "4g" },
    });
    mockMatchMedia({ "(min-width: 1025px)": true });
    const { container } = render(<HeroMount />);
    await flush();
    await flush();
    expect(loaded.player).toBe(1);
    expect(loaded.reactions).toBe(0); // play() never resolves here
    expect(container.querySelector("video")).not.toBeNull();
  });
});
