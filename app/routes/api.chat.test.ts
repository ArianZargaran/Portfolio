import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const retrieveRelevantMock = vi.fn();
const generateAnswerMock = vi.fn();

vi.mock("~/utils/rag/embeddings.server", () => ({
  retrieveRelevant: (...args: unknown[]) => retrieveRelevantMock(...args),
}));
vi.mock("~/utils/rag/generate.server", () => ({
  generateAnswer: (...args: unknown[]) => generateAnswerMock(...args),
}));

// The route's rate limiter is a module-level singleton keyed by client IP —
// giving each test its own IP keeps them from sharing (and exhausting) one
// bucket, regardless of test order.
let ipCounter = 0;
const post = (question: unknown, ip = `10.0.0.${++ipCounter}`) => {
  const req = new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
  req.headers.set("x-forwarded-for", ip);
  return req;
};

const ORIGINAL_ENV = { ...process.env };

describe("api.chat action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.VOYAGE_API_KEY = "test-voyage-key";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects non-POST methods", async () => {
    const { action } = await import("./api.chat");
    const response = await action({
      request: new Request("http://localhost/api/chat", { method: "GET" }),
      params: {},
      context: {},
    });
    expect(response.status).toBe(405);
  });

  it("rejects a request with no question", async () => {
    const { action } = await import("./api.chat");
    const response = await action({
      request: post(undefined),
      params: {},
      context: {},
    });
    expect(response.status).toBe(400);
  });

  it("falls back to the static reply when API keys aren't configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.VOYAGE_API_KEY;
    const { action } = await import("./api.chat");

    const response = await action({
      request: post("What languages do you know best?"),
      params: {},
      context: {},
    });
    const data = (await response.json()) as { reply: string; source: string };

    expect(data.source).toBe("fallback");
    expect(data.reply).toMatch(/TypeScript/);
    expect(retrieveRelevantMock).not.toHaveBeenCalled();
  });

  it("uses the RAG pipeline when keys are configured and within rate limit", async () => {
    retrieveRelevantMock.mockResolvedValue([{ id: "x", text: "some fact" }]);
    generateAnswerMock.mockResolvedValue("A generated, grounded answer.");
    const { action } = await import("./api.chat");

    const response = await action({
      request: post("What languages do you know best?"),
      params: {},
      context: {},
    });
    const data = (await response.json()) as { reply: string; source: string };

    expect(data.source).toBe("rag");
    expect(data.reply).toBe("A generated, grounded answer.");
  });

  it("falls back to the static reply when the RAG pipeline throws", async () => {
    retrieveRelevantMock.mockRejectedValue(new Error("embeddings API down"));
    const { action } = await import("./api.chat");

    const response = await action({
      request: post("What languages do you know best?"),
      params: {},
      context: {},
    });
    const data = (await response.json()) as { reply: string; source: string };

    expect(data.source).toBe("fallback");
    expect(data.reply).toMatch(/TypeScript/);
  });

  it("falls back once the rate limit is exceeded for a client", async () => {
    generateAnswerMock.mockResolvedValue("ok");
    retrieveRelevantMock.mockResolvedValue([]);
    const { action } = await import("./api.chat");

    let lastData: { reply: string; source: string } | undefined;
    for (let i = 0; i < 11; i++) {
      const response = await action({
        request: post("What languages do you know best?", "1.2.3.4"),
        params: {},
        context: {},
      });
      lastData = (await response.json()) as { reply: string; source: string };
    }

    expect(lastData?.source).toBe("fallback");
  });
});
