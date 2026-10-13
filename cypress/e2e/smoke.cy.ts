describe("smoke tests", () => {
  it("renders the home page with hero copy and CTAs", () => {
    cy.visitAndCheck("/");
    cy.findByRole("heading", { level: 1 }).should(
      "contain.text",
      "Arian Zargaran",
    );
    cy.findByRole("link", { name: /my work/i })
      .should("have.attr", "href")
      .and("include", "/work");
    cy.findByRole("link", { name: /resume/i })
      .should("have.attr", "rel")
      .and("include", "noopener");
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

  it("renders the about page", () => {
    cy.visitAndCheck("/about");
    // The headline is position: fixed under the timeline; assert presence,
    // not visibility, since layering is a layout choice.
    cy.findByRole("heading", { name: /about me/i }).should("exist");
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

  it("blog and contact still resolve at their direct URLs", () => {
    cy.request("/blog").its("status").should("eq", 200);
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
