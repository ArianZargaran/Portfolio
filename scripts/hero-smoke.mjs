// Headless smoke test of the hero motion against a running local build.
// Usage: BASE_URL=http://localhost:3000 OUT=/path node scripts/hero-smoke.mjs
// Uses system Chrome when present (H.264 + AV1); set CHROME= to override.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "hero-smoke";
const CHROME = process.env.CHROME ?? "/usr/bin/google-chrome";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(
  existsSync(CHROME) ? { executablePath: CHROME } : {},
);
const report = { base: BASE, browser: browser.version(), runs: {} };
const fail = [];

async function run(name, ctxOpts, fn) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...ctxOpts,
  });
  const page = await ctx.newPage();
  const csp = [];
  const media = [];
  page.on(
    "console",
    (m) => /Content Security Policy/i.test(m.text()) && csp.push(m.text()),
  );
  const cache = {};
  page.on(
    "request",
    (r) => /\.mp4(\?|$)/.test(r.url()) && media.push(r.url().replace(BASE, "")),
  );
  page.on("response", (res) => {
    if (/\.mp4(\?|$)/.test(res.url()))
      cache[res.url().replace(BASE, "")] = res.headers()["cache-control"];
  });
  const r = { csp, media, cache };
  try {
    await fn(page, r);
  } catch (e) {
    fail.push(`${name}: ${e.message}`);
    r.error = e.message;
  }
  if (csp.length) fail.push(`${name}: CSP violations ${csp.join(" | ")}`);
  report.runs[name] = r;
  await ctx.close();
}

const heroState = (page) =>
  page.evaluate(() => {
    const h = document.querySelector(".hero");
    if (!h) return null;
    const v = [...h.querySelectorAll("video")].map((x) => ({
      clip: x.dataset.clip,
      on: x.hasAttribute("data-on"),
      src: x.currentSrc.replace(location.origin, ""),
      t: +x.currentTime.toFixed(3),
      paused: x.paused,
      readyState: x.readyState,
    }));
    return { state: h.dataset.state, shown: h.dataset.shown, videos: v };
  });

await run("normal", {}, async (page, r) => {
  // Pause the reveal transition the moment it starts (see the fade crops below).
  await page.addInitScript(() => {
    new MutationObserver((recs, obs) => {
      const h = document.querySelector(".hero");
      if (h?.dataset.state !== "live") return;
      getComputedStyle(h).opacity; // flush style so the transition starts now
      const a = h.getAnimations()[0];
      if (a) a.pause();
      window.__heroFade = {
        duration_ms: a ? a.effect.getComputedTiming().duration : 0,
      };
      obs.disconnect();
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  });
  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  // SSR still is in the HTML (first paint) before any media.
  r.still_src = await page.locator(".scene-still_img").getAttribute("src");
  r.media_before_load = r.media.length;
  await page.screenshot({ path: `${OUT}/01_first_paint_still.png` });
  await page.waitForSelector('.hero[data-state="live"]', { timeout: 20000 });
  r.live_after_ms = Date.now() - t0;
  // The reveal: still -> live clip. Freeze the opacity transition and step
  // through it so any double exposure (ghosted hands) shows in the crops.
  r.fade = await page.evaluate(() => window.__heroFade ?? { duration_ms: 0 });
  for (const f of r.fade.duration_ms ? [0, 0.25, 0.5, 0.75, 1] : []) {
    await page.evaluate((x) => {
      const a = document.querySelector(".hero").getAnimations()[0];
      a.currentTime = x * a.effect.getComputedTiming().duration;
    }, f);
    await page.waitForTimeout(50);
    await page.screenshot({
      path: `${OUT}/01b_fade_${String(Math.round(f * 100)).padStart(3, "0")}pct.png`,
      clip: { x: 176, y: 272, width: 464, height: 576 },
    });
  }
  await page.evaluate(() =>
    document
      .querySelector(".hero")
      .getAnimations()
      .forEach((a) => a.finish()),
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const m0 = Object.fromEntries(
    (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
      m.name,
      m.value,
    ]),
  );
  await page.waitForTimeout(10000);
  const m1 = Object.fromEntries(
    (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
      m.name,
      m.value,
    ]),
  );
  r.cpu_10s = {
    task_ms: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000),
    script_ms: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000),
    layout_ms: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000),
    style_ms: Math.round(
      (m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000,
    ),
    js_heap_mb: +(m1.JSHeapUsedSize / 1048576).toFixed(1),
  };
  r.at_typing = await heroState(page);
  // Hero clips are content-hashed build assets served as immutable.
  if (!/\/assets\/typing\.av1-[\w-]+\.mp4$/.test(r.at_typing.videos[0].src))
    throw new Error(`unhashed clip URL ${r.at_typing.videos[0].src}`);
  for (const [u, cc] of Object.entries(r.cache))
    if (!/immutable/.test(cc ?? "") || !/max-age=31536000/.test(cc ?? ""))
      throw new Error(`clip ${u} not immutable: ${cc}`);
  await page.screenshot({ path: `${OUT}/02_live_typing.png` });
  await page
    .locator(".scene_hits--laptop")
    .screenshot({ path: `${OUT}/02b_live_typing_scene.png` });
  // Nod core runs t = 33.1-37.1 s after the clock starts (cycle 1, base f120 + i 61..109).
  const clockStart = await page.evaluate(() => performance.timeOrigin);
  void clockStart;
  const waitUntilShown = async (id, timeout) => {
    await page.waitForFunction(
      (x) => document.querySelector(".hero")?.dataset.shown === x,
      id,
      { timeout, polling: 100 },
    );
  };
  await waitUntilShown("nod", 45000);
  await page.waitForTimeout(1500);
  r.at_nod = await heroState(page);
  await page.screenshot({ path: `${OUT}/03_live_nod.png` });
  await page.screenshot({
    path: `${OUT}/03b_live_nod_hero_crop.png`,
    clip: { x: 176, y: 272, width: 464, height: 576 },
  });
  await waitUntilShown("base", 10000);
  r.nod_returned_to_base = true;
  await waitUntilShown("bounce", 20000);
  await page.waitForTimeout(700);
  r.at_bounce = await heroState(page);
  await page.screenshot({ path: `${OUT}/04_live_bounce.png` });
  await waitUntilShown("base", 10000);
  // Hit areas still work on top of the clip: click the laptop (Work).
  await page.mouse.click(540, 500);
  await page.waitForURL("**/work", { timeout: 10000 });
  r.click_laptop_navigates_to = new URL(page.url()).pathname;
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.mouse.click(718, 250); // Queen poster
  await page.waitForURL("**/about", { timeout: 10000 });
  r.click_poster_navigates_to = new URL(page.url()).pathname;
});

await run("h264_fallback", {}, async (page, r) => {
  // A browser without AV1 (or a failed AV1 fetch) must fall through to H.264.
  await page.route(/\.av1-[\w-]+\.mp4$/, (route) => route.abort());
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('.hero[data-state="live"]', { timeout: 20000 });
  await page.waitForTimeout(1500);
  r.at_typing = await heroState(page);
  if (!/\/assets\/typing\.h264-[\w-]+\.mp4$/.test(r.at_typing.videos[0].src))
    throw new Error("no H.264 fallback");
  await page.screenshot({ path: `${OUT}/07_h264_fallback.png` });
});

await run("reduced_motion", { reducedMotion: "reduce" }, async (page, r) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  r.hero_present = (await page.locator(".hero").count()) > 0;
  r.videos = await page.locator("video").count();
  r.still_src = await page.locator(".scene-still_img").getAttribute("src");
  await page.screenshot({ path: `${OUT}/05_reduced_motion_still.png` });
  if (r.hero_present || r.videos || r.media.length)
    throw new Error("motion loaded under reduced motion");
});

await run(
  "tablet",
  { viewport: { width: 820, height: 1180 } },
  async (page, r) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    r.videos = await page.locator("video").count();
    await page.screenshot({ path: `${OUT}/06_tablet_still_only.png` });
    if (r.videos || r.media.length) throw new Error("motion loaded on tablet");
  },
);

await browser.close();
report.failures = fail;
writeFileSync(`${OUT}/smoke-report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
process.exit(fail.length ? 1 : 0);
