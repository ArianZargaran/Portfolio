describe("smoke tests", () => {
  it("deep links server-render each route's content (no JS needed)", () => {
    [
      ["/resume", "Resume"],
      ["/about", "About me"],
      ["/articles", "Notebook"],
      ["/podcast", "Podcast"],
      ["/case-studies", "Case studies"],
      ["/contact", "<h1"],
      ["/work", "Work"],
    ].forEach(([url, text]) =>
      cy.request(url).its("body").should("include", text),
    );
  });

  it("renders the still-frame scene with a hit area for every route", () => {
    cy.visitAndCheck("/");
    cy.findByRole("heading", { level: 1 }).should(
      "contain.text",
      "Arian Zargaran",
    );
    cy.findByRole("navigation", { name: "Scene" }).within(() => {
      [
        ["Work", "/work"],
        ["Resume", "/resume"],
        ["Contact", "/contact"],
        ["About me", "/about"],
        ["Case studies", "/case-studies"],
        ["Podcast (headphones)", "/podcast"],
        ["Notebook", "/articles"],
      ].forEach(([name, href]) =>
        cy.findByRole("link", { name }).should("have.attr", "href", href),
      );
    });
  });

  it("renders the resume and contact pages from typed data", () => {
    cy.visitAndCheck("/resume");
    cy.findByRole("heading", { level: 1, name: "Resume" }).should("exist");
    cy.findByRole("link", { name: /download the resume/i }).should("exist");
    cy.visitAndCheck("/contact");
    cy.findByRole("link", { name: "Email hello@ari.soy" }).should(
      "have.attr",
      "href",
      "mailto:hello@ari.soy",
    );
  });

  it("renders the about page and the static notebook", () => {
    cy.visitAndCheck("/about");
    cy.findByRole("heading", { level: 1, name: /about me/i }).should("exist");
    cy.visitAndCheck("/articles");
    cy.findByRole("heading", { level: 1, name: /notebook/i }).should("exist");
  });

  it("renders the work page with the grid", () => {
    cy.visitAndCheck("/work");
    cy.findByRole("heading", { name: /^work$/i }).should("exist");
  });

  it("301s old /work/diagrams URLs to /case-studies", () => {
    cy.request({
      url: "/work/diagrams/brandkit-theming",
      followRedirect: false,
    }).then((response) => {
      expect(response.status).to.eq(301);
      expect(response.redirectedToUrl).to.match(
        /\/case-studies\/brandkit\/theming$/,
      );
    });
    cy.visitAndCheck("/case-studies");
    cy.findByRole("heading", { level: 1, name: /case studies/i }).should(
      "exist",
    );
    cy.request("/case-studies/marshal").its("status").should("eq", 200);
  });

  it("redirects the old /projects URL to /work", () => {
    cy.request({ url: "/projects", followRedirect: false }).then((response) => {
      expect(response.status).to.eq(301);
      expect(response.redirectedToUrl).to.match(/\/work$/);
    });
  });

  it("hides the paused skills chat (feature flag off by default)", () => {
    // /resume exists, so /skills is a temporary 302 there (launch checklist:
    // decide 301 vs drop).
    cy.request({ url: "/skills", followRedirect: false }).then((res) => {
      expect(res.status).to.eq(302);
      expect(res.redirectedToUrl).to.match(/\/resume$/);
    });
    cy.request({
      url: "/api/chat",
      method: "POST",
      body: { question: "hi" },
      failOnStatusCode: false,
    })
      .its("status")
      .should("eq", 404);
  });

  it("/blog 301s to /articles and contact resolves", () => {
    cy.request({ url: "/blog", followRedirect: false }).then((response) => {
      expect(response.status).to.eq(301);
      expect(response.redirectedToUrl).to.match(/\/articles$/);
    });
    cy.request("/contact").its("status").should("eq", 200);
  });

  it("healthcheck returns OK", () => {
    cy.request("/healthcheck").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.eq("OK");
    });
  });

  it("returns a 404 for unknown routes", () => {
    cy.request({ url: "/nope-not-here", failOnStatusCode: false })
      .its("status")
      .should("eq", 404);
  });

  // Trailing-slash redirects are now handled by Vercel (vercel.json
  // "trailingSlash": false), not by the app, so they are not tested here.
  it("redirects the old /about-me URL to /about", () => {
    cy.request({ url: "/about-me", followRedirect: false }).then((response) => {
      expect(response.status).to.eq(301);
      expect(response.redirectedToUrl).to.match(/\/about$/);
    });
  });
});
