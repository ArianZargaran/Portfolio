// Routes every quality check (CSP, axe, Lighthouse, uptime) runs against.
// Keep in sync with app/routes; redirects and resource routes are excluded.
export const PAGE_ROUTES = [
  "/",
  "/work",
  "/about",
  "/contact",
  "/resume",
  "/blog",
  "/work/diagrams/marshal",
  "/work/diagrams/murmuration",
];
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
