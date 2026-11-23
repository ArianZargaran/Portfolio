import "@testing-library/jest-dom/vitest";

import { resetHeroVisitForTests } from "~/scene/hero/visit-media";

// Every test is a new page load for the hero media: the budget, the clip
// store and the chosen loop source live per visit (visit-media.ts).
beforeEach(() => {
  try {
    resetHeroVisitForTests();
  } catch {
    /* a previous test's URL mocks may be gone */
  }
});
