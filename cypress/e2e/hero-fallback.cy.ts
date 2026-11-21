/**
 * Review B1: the base loop's AV1 -> H.264 fallback in a real browser. The
 * browser says it can play AV1, but the typing AV1 response is undecodable
 * bytes (200, video/mp4). The player must end up live on H.264, with the
 * AV1 bytes counted as wasted and its blob freed.
 */
describe("hero codec fallback (real browser, undecodable AV1)", () => {
  it("AV1 that won't decode -> live on H.264, AV1 bytes wasted, one request per file", () => {
    const requested: string[] = [];
    // Same size as the real AV1 typing file, filled with 0x07: not a video
    // (the reviewer's repro). Every other clip is the real file.
    const junk = new Uint8Array(332_028).fill(7);
    cy.intercept({ method: "GET", url: /\.mp4($|\?)/ }, (req) => {
      const file = req.url.split("/").pop()!.split("?")[0];
      requested.push(file.replace(/-[\w-]+\.mp4$/, ""));
      if (/^typing\.av1-/.test(file))
        req.reply({
          statusCode: 200,
          body: junk.buffer,
          headers: { "content-type": "video/mp4" },
        });
      else req.continue();
    });
    cy.viewport(1440, 900);
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        Object.defineProperty(win.navigator, "connection", {
          configurable: true,
          get: () => ({ effectiveType: "4g" }),
        });
        // Whatever this Electron build says natively, claim AV1 support so
        // the player picks AV1 first.
        const cp = win.HTMLMediaElement.prototype.canPlayType;
        win.HTMLMediaElement.prototype.canPlayType = function (t: string) {
          return /av01/.test(t) ? "probably" : cp.call(this, t);
        };
      },
    });
    cy.get(".hero[data-state=live][data-reactions=ready]", {
      timeout: 20000,
    }).should((h) => {
      expect(h.attr("data-wasted")).to.eq("332028");
      expect(h.attr("data-fetches")).to.eq("2");
      expect(h.attr("data-bytes")).to.eq(String(332_028 + 442_525));
    });
    cy.get('.hero video[data-clip="base"]').should((v) => {
      const el = v[0] as HTMLVideoElement;
      expect(el.currentSrc).to.match(/^blob:/);
      expect(el.error).to.eq(null);
      expect(el.readyState).to.be.gte(2);
    });
    cy.wrap(requested).should("deep.eq", ["typing.av1", "typing.h264"]);
  });
});

/**
 * Review R1: the AV1 typing file fails to LOAD (404 or a dropped
 * connection). As on base 7c6ea46 (native <source> selection), the player
 * falls back to H.264 and goes live; nothing was received, so nothing is
 * wasted.
 */
describe("hero codec fallback (real browser, AV1 loop fails to load)", () => {
  const visit = (failure: "404" | "network") => {
    const requested: string[] = [];
    cy.intercept({ method: "GET", url: /\.mp4($|\?)/ }, (req) => {
      const file = req.url.split("/").pop()!.split("?")[0];
      requested.push(file.replace(/-[\w-]+\.mp4$/, ""));
      if (!/^typing\.av1-/.test(file)) return req.continue();
      if (failure === "404") req.reply({ statusCode: 404, body: "" });
      else req.destroy();
    });
    cy.viewport(1440, 900);
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        Object.defineProperty(win.navigator, "connection", {
          configurable: true,
          get: () => ({ effectiveType: "4g" }),
        });
        const cp = win.HTMLMediaElement.prototype.canPlayType;
        win.HTMLMediaElement.prototype.canPlayType = function (t: string) {
          return /av01/.test(t) ? "probably" : cp.call(this, t);
        };
      },
    });
    cy.get(".hero[data-state=live][data-reactions=ready]", {
      timeout: 20000,
    }).should((h) => {
      expect(h.attr("data-wasted")).to.eq("0");
      expect(h.attr("data-fetches")).to.eq("2");
      expect(h.attr("data-bytes")).to.eq("442525");
    });
    cy.get('.hero video[data-clip="base"]').should((v) => {
      const el = v[0] as HTMLVideoElement;
      expect(el.currentSrc).to.match(/^blob:/);
      expect(el.error).to.eq(null);
    });
    // The H.264 file may come from the HTTP cache (an earlier test loaded
    // it), which cy.intercept doesn't see, and Chromium retries a dropped
    // connection once: check the AV1 attempt here, the H.264 fetch through
    // data-fetches / data-bytes above.
    cy.wrap(requested).should((r) =>
      expect([...new Set(r)].filter((f) => f !== "typing.h264")).to.deep.eq([
        "typing.av1",
      ]),
    );
  };
  it("AV1 loop answered 404 -> live on H.264", () => visit("404"));
  it("AV1 loop connection dropped -> live on H.264", () => visit("network"));
});
