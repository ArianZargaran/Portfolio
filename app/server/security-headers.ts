/**
 * Security headers for document responses. Replaces the helmet() middleware
 * from the old Express server. The CSP is nonce-based for scripts:
 * React Router's inline hydration scripts get the per-request nonce
 * (see entry.server.tsx + root.tsx). Styles allow 'unsafe-inline' because
 * motion/react animates through inline style attributes.
 */
export function buildCsp(nonce: string, { dev = false } = {}): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": ["'self'", "data:", "blob:"],
    "media-src": ["'self'"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": dev ? ["'self'", "ws:", "wss:"] : ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const csp = Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
  return dev ? csp : `${csp}; upgrade-insecure-requests`;
}

export function applySecurityHeaders(
  headers: Headers,
  nonce: string,
  { dev = false } = {},
): void {
  headers.set("Content-Security-Policy", buildCsp(nonce, { dev }));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  if (!dev) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
