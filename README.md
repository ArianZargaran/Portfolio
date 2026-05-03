# Arian Zargaran — Portfolio

Personal portfolio site for Arian Zargaran. Showcases work, an interactive
about page, a projects grid with per-project case studies in modal dialogs,
and a downloadable resume.

Deployed to Vercel from `main`.

## Stack

- [Remix](https://remix.run) on an Express server
- React 18, [motion](https://motion.dev) for animation
- TypeScript, vanilla CSS modules
- [Vitest](https://vitest.dev) (unit) + [Cypress](https://cypress.io) (e2e)
- [helmet](https://helmetjs.github.io) for baseline security headers,
  [compression](https://github.com/expressjs/compression) for gzip
- [MSW](https://mswjs.io) for local network mocking
- ESLint + Prettier; esbuild for the server bundle

## Project layout

```
app/
  components/      UI building blocks (grid, icons, illustrations, nav, …)
  hooks/           useMediaQuery, useElementSize, useModal
  routes/          Remix file-based routes
  stylesheets/     Reset, fonts, colors, themes, per-page styles
  root.tsx         App shell, document head, top-level nav
  entry.server.tsx SSR entry
public/            Static assets (favicons, project previews, resume.pdf)
cypress/           E2E specs and support
test/              Vitest setup
server.ts          Express + Remix request handler
```

## Local development

Requirements: Node 18+.

```sh
npm install
npm run dev
```

The dev server runs on port 3000 by default; set `PORT` to override.

## Scripts

| Command                 | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev`           | Watch-mode Remix + esbuild server bundle                  |
| `npm run build`         | Production Remix + server build                           |
| `npm start`             | Run the production build (`build/server.js`)              |
| `npm test`              | Vitest in watch mode (`app/**/*.test.{ts,tsx}`)           |
| `npm run test:e2e:dev`  | Cypress against `npm run dev`                             |
| `npm run test:e2e:run`  | Cypress against a fresh production build                  |
| `npm run lint`          | ESLint with cache                                         |
| `npm run typecheck`     | `tsc --noEmit` for app and Cypress projects               |
| `npm run format`        | Prettier across the repo                                  |
| `npm run validate`      | `test --run`, `lint`, `typecheck`, `test:e2e:run` in parallel |
| `npm run storybook`     | Storybook dev server (port 6006)                          |

## Testing

- **Unit**: `app/**/*.test.{ts,tsx}` runs under Vitest with happy-dom and
  `@testing-library/react`. Covers the three custom hooks (`useMediaQuery`,
  `useElementSize`, `useModal`).
- **E2E**: `cypress/e2e/smoke.cy.ts` covers each route, the healthcheck, the
  trailing-slash redirect, and the 404 path. Runs against the production
  build via `start-server-and-test`.

## Deployment

Deployed to Vercel from `main`. The Express server (`server.ts`) is bundled
to `build/server.js` and started with `node ./build/server.js`. Set `PORT`
to override the default (3000).

## License

[MIT](./LICENSE.md)
