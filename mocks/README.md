# Mocks

Use this to mock any third party HTTP resources that you don't have running locally and want to have mocked for local development as well as tests.

Learn more about how to use this at [mswjs.io](https://mswjs.io/)

For an extensive example, see the [source code for kentcdodds.com](https://github.com/kentcdodds/kentcdodds.com/blob/main/mocks/index.ts)

## Not loaded in `npm run dev`

`dev:remix` (see `package.json`) intentionally does **not** `--require ./mocks`.
MSW's Node interceptor — even for a "bypassed"/unhandled or explicitly
`passthrough()`'d request — was mangling the outgoing `Content-Length` on
real POST requests to external APIs (specifically api.voyageai.com and
api.anthropic.com, used by `app/utils/rag/`), causing those hosts to reject
the request with a `411 Length Required`. The exact same request succeeds
every time outside a process with MSW's server listening. Removing the
`--require ./mocks` flag from `dev:remix` was the fix — this file is still
used by `start:mocks` for Cypress e2e runs, which don't exercise the RAG
endpoints.
