describe("smoke tests", () => {
  afterEach(() => {
    cy.cleanupUser();
  });

  it("should allow you to visit the home page", () => {
    cy.visitAndCheck("/");
  });
});
