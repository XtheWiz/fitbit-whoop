import { expect, test, describe } from "bun:test";
import { app } from "../src/index.ts";

// HTTP smoke tests against the Elysia app (no DB needed for these routes).
describe("routes", () => {
  test("GET /health", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    const body = await res.json() as any;
    expect(body.ok).toBe(true);
  });

  test("POST /scores/sleep returns a performance", async () => {
    const input = {
      session: {
        startTs: "2026-06-27T23:00:00Z",
        endTs: "2026-06-28T07:00:00Z",
        segments: [
          { stage: "deep", startTs: "2026-06-27T23:00:00Z", endTs: "2026-06-28T03:00:00Z" },
          { stage: "rem", startTs: "2026-06-28T03:00:00Z", endTs: "2026-06-28T07:00:00Z" },
        ],
      },
      sleepNeedMs: 28800000,
      baselineBedtimeMinutes: 1380,
    };
    const res = await app.handle(
      new Request("http://localhost/scores/sleep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    const body = await res.json() as any;
    expect(body.performance).toBeGreaterThan(0);
    expect(body.performance).toBeLessThanOrEqual(1);
  });

  test("POST /summaries/generate uses the template provider", async () => {
    const res = await app.handle(
      new Request("http://localhost/summaries/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          window: "morning",
          context: { day: "2026-06-28", recovery: { value: 72, provisional: false, drivers: { hrv: 0.4, rhr: 0.15, rr: 0.08, sleep: 0.17 } } },
        }),
      }),
    );
    const body = await res.json() as any;
    expect(body.provider).toBe("template");
    expect(body.text).toContain("Recovery 72%");
  });
});
