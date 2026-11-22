/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   Checks that no hero player is rendered. */
/**
 * Live-review N1 (preview 2c3acaf): in about 1 of 10 gate-frozen loads the
 * player mounted, frozen, before any tap and could fetch the loop. The gate
 * result reached React one render before `freezeForPage()` (an effect), so
 * a render saw "motion allowed" and "not frozen" together; if the idle slot
 * had already fired, HeroMount mounted the player and kept it mounted.
 *
 * These tests make every ordering deterministic: the gate resolves when the
 * test resolves navigator.getBattery(), the idle slot fires when the test
 * runs requestIdleCallback's callback, and the media queries change when
 * the test fires their listeners. The player module is a stub that records
 * each render (its `frozen` prop) and counts its import (the lazy chunk).
 */
import { act, render } from "@testing-library/react";

import {
  FREEZE_STORAGE_KEY,
  heroFreeze,
  resetHeroFreezeForTests,
} from "~/scene/hero/freeze";
import {
  evaluateHeroGate,
  heroGate,
  resetHeroGateForTests,
} from "~/scene/hero/net-gate-store";

import { HeroMount } from "./hero-mount";

const spy = vi.hoisted(() => ({
  imports: 0,
  renders: [] as boolean[],
}));
vi.mock("./hero-player", () => {
  spy.imports++;
  return {
    default: ({ frozen }: { frozen?: boolean }) => {
      spy.renders.push(!!frozen);
      return <div className="hero" data-frozen={frozen ? "" : undefined} />;
    },
  };
});

type Listener = () => void;
let mq: Record<string, boolean>;
let mqListeners: Record<string, Listener[]>;
function mockMatchMedia() {
  window.matchMedia = ((q: string) => ({
    get matches() {
      return mq[q] ?? false;
    },
    media: q,
    addEventListener: (_: string, l: Listener) =>
      (mqListeners[q] ??= []).push(l),
    removeEventListener: (_: string, l: Listener) =>
      (mqListeners[q] = (mqListeners[q] ?? []).filter((x) => x !== l)),
  })) as unknown as typeof window.matchMedia;
}
const setMq = (q: string, v: boolean) =>
  act(() => {
    mq[q] = v;
    (mqListeners[q] ?? []).forEach((l) => l());
  });

let idle: (() => void)[];
let battery: { resolve: () => void };
const settle = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  });
const fireIdle = async () => {
  await act(async () => {
    idle.splice(0).forEach((cb) => cb());
  });
  await settle();
};
const resolveGate = async () => {
  await act(async () => battery.resolve());
  await settle();
};
const LAPTOP = "(min-width: 1025px)";
const hero = (c: HTMLElement) => c.querySelector(".hero");

const originalMatchMedia = window.matchMedia;
const originalRic = window.requestIdleCallback;
beforeEach(() => {
  resetHeroGateForTests();
  resetHeroFreezeForTests();
  window.localStorage.clear();
  delete document.documentElement.dataset.heroGate;
  spy.renders = [];
  mq = { [LAPTOP]: true };
  mqListeners = {};
  mockMatchMedia();
  idle = [];
  window.requestIdleCallback = ((cb: () => void) => {
    idle.push(cb);
    return idle.length;
  }) as typeof window.requestIdleCallback;
  // The gate awaits getBattery(): it resolves only when the test says so.
  Object.defineProperty(navigator, "getBattery", {
    configurable: true,
    value: () =>
      new Promise((resolve) => {
        battery = {
          resolve: () => resolve({ level: 1, charging: true }),
        };
      }),
  });
  // No Network Information API and nothing measurable: "frozen:inconclusive".
  Reflect.deleteProperty(navigator, "connection");
});
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  window.requestIdleCallback = originalRic;
  Reflect.deleteProperty(navigator, "getBattery");
  Reflect.deleteProperty(navigator, "connection");
});

describe("HeroMount: no player before the gate decides (live-review N1)", () => {
  it("idle fires first, then the gate says frozen: no player import or render, until a tap", async () => {
    const { container } = render(<HeroMount />);
    await settle();
    await fireIdle(); // ready: only the gate is missing
    expect(hero(container)).toBeNull();
    await resolveGate();
    expect(document.documentElement.dataset.heroGate).toBe(
      "frozen:inconclusive",
    );
    expect(heroFreeze().get()).toBe(true);
    expect(spy.renders).toEqual([]); // never mounted, not even frozen
    expect(spy.imports).toBe(0); // the player chunk was never requested
    expect(hero(container)).toBeNull();
    await settle();
    expect(spy.renders).toEqual([]);
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
    // A tap (or Enter/Space) starts it: only now the player loads, playing.
    act(() => void heroFreeze().startFromTap());
    await settle();
    expect(hero(container)).not.toBeNull();
    expect(spy.renders.length).toBeGreaterThan(0);
    expect(spy.renders.every((f) => f === false)).toBe(true);
  });

  it("the gate says frozen first, then idle fires: no player render", async () => {
    const { container } = render(<HeroMount />);
    await settle();
    await resolveGate();
    expect(heroFreeze().get()).toBe(true);
    await fireIdle();
    await settle();
    expect(spy.renders).toEqual([]);
    expect(hero(container)).toBeNull();
    act(() => heroFreeze().set(false, "keyboard")); // Enter/Space plays
    await settle();
    expect(hero(container)).not.toBeNull();
    expect(spy.renders.every((f) => f === false)).toBe(true);
  });

  it("the gate resolves inside the idle slot's own task: no player render", async () => {
    const { container } = render(<HeroMount />);
    await settle();
    await act(async () => {
      battery.resolve();
      idle.splice(0).forEach((cb) => cb());
    });
    await settle();
    expect(heroFreeze().get()).toBe(true);
    expect(spy.renders).toEqual([]);
    expect(hero(container)).toBeNull();
  });

  it("the gate already said frozen and the laptop layout comes back later: no player render", async () => {
    // The gate decided "frozen" earlier this page (it runs once per page)...
    const decided = evaluateHeroGate();
    await settle();
    await act(async () => battery.resolve());
    await decided;
    expect(heroGate()?.verdict).toBe("frozen");
    // ...then a fresh page store (not frozen yet) and a narrow window.
    resetHeroFreezeForTests();
    mq[LAPTOP] = false;
    const { container } = render(<HeroMount />);
    await settle();
    await fireIdle(); // ready, but not the laptop layout
    expect(spy.renders).toEqual([]);
    await setMq(LAPTOP, true); // widen past 1025 px
    await settle();
    expect(heroFreeze().get()).toBe(true);
    expect(spy.renders).toEqual([]);
    expect(hero(container)).toBeNull();
  });

  it("control: a 'play' gate after idle mounts the player, playing", async () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { effectiveType: "4g" },
    });
    const { container } = render(<HeroMount />);
    await settle();
    await fireIdle();
    expect(spy.renders).toEqual([]);
    await resolveGate();
    expect(document.documentElement.dataset.heroGate).toMatch(/^play:/);
    expect(hero(container)).not.toBeNull();
    expect(spy.renders.every((f) => f === false)).toBe(true);
  });
});
