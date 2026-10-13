// @ts-check
/* Plain ESM, not TypeScript: with "type": "module" in package.json, Cypress
   13 loads a .ts config through Node's ESM loader without transpiling it, so
   any type annotation fails with "SyntaxError: Missing initializer in const
   declaration". Editor type hints come from the JSDoc + @ts-check below. */
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents: (on, config) => {
      const isDev = config.watchForFileChanges;
      const port = process.env.PORT ?? (isDev ? "3000" : "8811");
      /** @type {Partial<Cypress.PluginConfigOptions>} */
      const configOverrides = {
        baseUrl: `http://localhost:${port}`,
        screenshotOnRunFailure: !process.env.CI,
      };

      // To use this:
      // cy.task('log', whateverYouWantInTheTerminal)
      on("task", {
        log: (message) => {
          console.log(message);

          return null;
        },
      });

      return { ...config, ...configOverrides };
    },
  },
});
