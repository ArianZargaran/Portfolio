describe("smoke tests", () => {
  it("renders the home page with hero copy and CTAs", () => {
    cy.visitAndCheck("/");
    cy.findByRole("heading", { level: 1 }).should("contain.text", "Arian Zargaran");
    cy.findByRole("link", { name: /my projects/i })
      .should("have.attr", "href")
      .and("include", "/projects");
    cy.findByRole("link", { name: /resume/i })
      .should("have.attr", "rel")
      .and("include", "noopener");
  });

  it("renders the about page", () => {
    cy.visitAndCheck("/about-me");
    // The headline is position: fixed under the timeline; assert presence,
    // not visibility, since layering is a layout choice.
    cy.findByRole("heading", { name: /about me/i }).should("exist");
  });

  it("renders the projects page with the grid", () => {
    cy.visitAndCheck("/projects");
    cy.findByRole("heading", { name: /^projects$/i }).should("exist");
  });

  it("renders the skills page with a working search input", () => {
    cy.visitAndCheck("/skills");
    cy.findByPlaceholderText(/ask me something/i).type("react");
    cy.findByPlaceholderText(/ask me something/i).should(
      "have.value",
      "react",
    );
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

  it("redirects trailing slashes", () => {
    cy.request({ url: "/about-me/", followRedirect: false }).then((response) => {
      expect(response.status).to.eq(301);
      expect(response.redirectedToUrl).to.match(/\/about-me$/);
    });
  });
});
