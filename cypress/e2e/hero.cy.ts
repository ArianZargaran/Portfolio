/* Hero motion end to end with stub clips (M10a). Every .mp4 is answered with
   a tiny solid-colour AV1 stub (cypress/fixtures/hero-stub.av1.mp4), so the
   test checks behaviour and requests, never the art. Laptop composition. */

type Conn = { effectiveType?: string; saveData?: boolean } | null;

const clipOf = (url: string) =>
  (url.match(/\/(typing|nod|bounce)\.[^/]*\.mp4/) ?? [])[1] ?? url;

function visitHome(conn: Conn, opts: { noTiming?: boolean } = {}) {
  const requested: string[] = [];
  cy.intercept({ method: "GET", url: /\.mp4($|\?)/ }, (req) => {
    requested.push(clipOf(req.url));
    req.reply({
      fixture: "hero-stub.av1.mp4,null",
      headers: { "content-type": "video/mp4" },
    });
  });
  cy.viewport(1440, 900);
  cy.visit("/", {
    onBeforeLoad(win) {
      win.localStorage.clear();
      Object.defineProperty(win.navigator, "connection", {
        configurable: true,
        get: () => (conn === null ? undefined : conn),
      });
      if (opts.noTiming) win.performance.getEntries = () => [];
    },
  });
  return requested;
}

const gate = () => cy.get("html").invoke("attr", "data-hero-gate");

describe("hero motion (stub clips)", () => {
  it("4G: plays, and fetches only the typing loop before any intent", () => {
    const requested = visitHome({ effectiveType: "4g" });
    gate().should("eq", "play:connection-4g");
    cy.get(".hero[data-state=live]", { timeout: 15000 });
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(1500).then(() =>
      expect([...new Set(requested)]).to.deep.eq(["typing"]),
    );
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.gt", 0);
  });

  it("E2 intent (poster visit, then focus on the speakers) fetches the nod, within the budget", () => {
    const requested = visitHome({ effectiveType: "4g" });
    cy.get(".hero[data-state=live]", { timeout: 15000 });
    cy.get('.scene_hits--laptop [data-object="queen-poster"]').first().focus();
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(400);
    cy.get('.scene_hits--laptop [data-object="speakers"]').first().focus();
    cy.wrap(requested).should("include", "nod");
    cy.get(".hero")
      .invoke("attr", "data-bytes")
      .then(Number)
      .should("be.lte", 970 * 1024);
  });

  it("Save-Data: still only, no player, no media", () => {
    const requested = visitHome({ effectiveType: "4g", saveData: true });
    cy.get(".scene-still_img").should("be.visible");
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- asserting that nothing is requested over a window (or the 250 ms dwell)
    cy.wait(2500);
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
  });

  it("a reported 3G connection: still", () => {
    const requested = visitHome({ effectiveType: "3g" });
    gate().should("eq", "still:connection-slow");
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
  });

  it("no connection API and no Resource Timing: starts frozen, plays on activation", () => {
    const requested = visitHome(null, { noTiming: true });
    gate().should("eq", "frozen:inconclusive");
    cy.get(".hero").should("not.exist");
    cy.wrap(requested).should("have.length", 0);
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq(null),
    );
    cy.get(".scene_frame[role=group]").focus();
    cy.focused().type("{enter}");
    cy.get(".hero", { timeout: 15000 }).should("exist");
    cy.wrap(requested).should("include", "typing");
  });

  it("no connection API, measured on a fast network: plays and remembers the verdict", () => {
    visitHome(null);
    gate().should("eq", "play:throughput-ok");
    cy.window().then((w) =>
      expect(
        JSON.parse(w.localStorage.getItem("hero:net-verdict") ?? "{}"),
      ).to.have.property("verdict", "play"),
    );
  });

  it("Esc freezes instantly and the freeze persists", () => {
    visitHome({ effectiveType: "4g" });
    cy.get(".hero[data-state=live]", { timeout: 15000 });
    cy.get("body").type("{esc}");
    cy.get(".hero[data-frozen]");
    cy.window().then((w) =>
      expect(w.localStorage.getItem("hero:frozen")).to.eq("1"),
    );
  });
});
