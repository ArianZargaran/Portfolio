// Routes every quality check (CSP, axe, Lighthouse, uptime) runs against.
// Keep in sync with app/routes; redirects and resource routes are excluded.
export const PAGE_ROUTES = [
  "/",
  "/work",
  "/about",
  "/contact",
  "/resume",
  "/articles",
  "/case-studies",
  "/case-studies/brandkit",
  "/case-studies/marshal",
  "/case-studies/murmuration",
];
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
