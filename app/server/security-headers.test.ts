import {
  applySecurityHeaders,
  buildCsp,
  createNonce,
} from "./security-headers";

describe("security headers", () => {
  it("builds a nonce-based script policy without unsafe-inline scripts", () => {
    const csp = buildCsp("abc");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("allows the Vite HMR websocket only in dev", () => {
    expect(buildCsp("n", { dev: true })).toContain(
      "connect-src 'self' ws: wss:",
    );
    expect(buildCsp("n")).toContain("connect-src 'self';");
  });

  it("sets CSP and the helmet-equivalent headers", () => {
    const h = new Headers();
    applySecurityHeaders(h, "n");
    expect(h.get("Content-Security-Policy")).toContain("'nonce-n'");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Strict-Transport-Security")).toMatch(/max-age/);
  });

  it("creates unique nonces", () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});
