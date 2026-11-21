/**
 * Change 4 (Ari, Nov 21 2026, t1034u): the T6 groove / podcast hotspot is
 * Ari's on-head headphones. Its bounding rects must stay inside the
 * viewport and clear of the poster and every other hit rect at every laptop
 * width (>= 1025 px), including the 1440x900 composition itself.
 */
interface Box { id: string; l: number; t: number; r: number; b: number }

const overlaps = (a: Box, b: Box) =>
  a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

const boxes = (doc: Document): Box[] =>
  [
    ...doc.querySelectorAll<HTMLElement>(".scene_hits--laptop [data-object]"),
  ].flatMap((el) => {
    const id = el.dataset.object!;
    // A hit object is one focusable link plus pointer-only extra rects.
    return [...el.getClientRects()].map((c) => ({
      id,
      l: c.left,
      t: c.top,
      r: c.right,
      b: c.bottom,
    }));
  });

describe("headphones hotspot geometry (change 4)", () => {
  beforeEach(() => {
    cy.intercept({ method: "GET", url: /\.mp4($|\?)/ }, { statusCode: 204 });
  });

  for (const [w, h] of [
    [1440, 900],
    [1025, 900],
    [1280, 900],
    [1920, 900],
    [1280, 800],
    [1920, 1080],
  ] as const)
    it(`${w}x${h}: headphones inside the viewport, clear of the poster and every other hotspot`, () => {
      cy.viewport(w, h);
      cy.visit("/", {
        onBeforeLoad(win) {
          win.localStorage.clear();
        },
      });
      cy.get('.scene_hits--laptop [data-object="headphones"]')
        .should("be.visible")
        .find(".scene_hit-label")
        .should("have.text", "Podcast (headphones)");
      cy.document().then((doc) => {
        const all = boxes(doc);
        const hp = all.filter((b) => b.id === "headphones");
        const others = all.filter((b) => b.id !== "headphones");
        expect(hp, "headphones rects").to.have.length(1);
        expect(
          others.some((b) => b.id === "queen-poster"),
          "poster present",
        ).to.equal(true);
        expect(others.some((b) => b.id === "speakers")).to.equal(false);
        const [p] = hp;
        cy.log(`headphones ${[p.l, p.t, p.r, p.b].map(Math.round).join(",")}`);
        // Inside the viewport (edges), and at least 44 CSS px each way
        // at 1440 (scaled with the composition elsewhere).
        expect(p.l).to.be.gte(0);
        expect(p.t).to.be.gte(0);
        expect(p.r).to.be.lte(w);
        expect(p.b).to.be.lte(h);
        if (w === 1440 && h === 900) {
          expect(p.r - p.l).to.be.gte(44);
          expect(p.b - p.t).to.be.gte(44);
        }
        for (const o of others)
          expect(overlaps(p, o), `headphones vs ${o.id}`).to.equal(false);
      });
    });

  it("1440x900: the headphones are the last tab stop and open /podcast", () => {
    cy.viewport(1440, 900);
    cy.visit("/");
    cy.get(".scene_hits--laptop a[data-object]")
      .last()
      .should("have.attr", "data-object", "headphones")
      .and("have.attr", "href", "/podcast");
  });
});
