import { expect, test, describe } from "bun:test";
import { ZaiProvider } from "../src/ai/zai_provider.ts";
import { GeminiProvider } from "../src/ai/gemini_provider.ts";
import { buildContext, type ScoreRow } from "../src/ai/context.ts";
import type { AssistantContext } from "../src/ai/provider.ts";

function fakeFetch(capture: { req?: Request; body?: any }, content = "Recovery looks solid.") {
  return (async (input: any, init?: any) => {
    capture.req = new Request(input, init);
    capture.body = init?.body ? JSON.parse(init.body as string) : undefined;
    return new Response(
      JSON.stringify({ choices: [{ message: { content } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as unknown as typeof fetch;
}

describe("ZaiProvider", () => {
  const ctx: AssistantContext = {
    day: "2026-06-28",
    recovery: { value: 72, provisional: false, drivers: { hrv: 0.4, rhr: 0.15, rr: 0.08, sleep: 0.17 } },
  };

  test("posts OpenAI-compatible request with auth + model and parses content", async () => {
    const cap: { req?: Request; body?: any } = {};
    const p = new ZaiProvider({ apiKey: "secret-key", model: "glm-4.6", fetchFn: fakeFetch(cap) });
    const text = await p.generateSummary(ctx, "morning");

    expect(text).toBe("Recovery looks solid.");
    expect(cap.req!.url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
    expect(cap.req!.headers.get("authorization")).toBe("Bearer secret-key");
    expect(cap.body.model).toBe("glm-4.6");
    expect(cap.body.messages[0].role).toBe("system");
    expect(cap.body.messages[1].content).toContain("2026-06-28");
  });

  test("custom base url is honored and trailing slash trimmed", async () => {
    const cap: { req?: Request; body?: any } = {};
    const p = new ZaiProvider({ apiKey: "k", baseUrl: "https://api.z.ai/api/coding/paas/v4/", fetchFn: fakeFetch(cap) });
    await p.chat([{ role: "user", content: "why low?" }], ctx);
    expect(cap.req!.url).toBe("https://api.z.ai/api/coding/paas/v4/chat/completions");
  });

  test("throws on missing apiKey", () => {
    expect(() => new ZaiProvider({ apiKey: "" })).toThrow();
  });

  test("GeminiProvider hits the OpenAI-compatible endpoint with its default model", async () => {
    const cap: { req?: Request; body?: any } = {};
    const p = new GeminiProvider({ apiKey: "g-key", fetchFn: fakeFetch(cap, "Solid recovery.") });
    const text = await p.generateSummary(ctx, "morning");
    expect(text).toBe("Solid recovery.");
    expect(p.name).toBe("gemini");
    expect(cap.req!.url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(cap.req!.headers.get("authorization")).toBe("Bearer g-key");
    expect(cap.body.model).toBe("gemini-2.5-flash");
  });

  test("GeminiProvider posts to the Gemini OpenAI endpoint with its default model", async () => {
    const cap: { req?: Request; body?: any } = {};
    const p = new GeminiProvider({ apiKey: "gkey", fetchFn: fakeFetch(cap, "Good recovery.") });
    const text = await p.generateSummary(ctx, "morning");
    expect(text).toBe("Good recovery.");
    expect(p.name).toBe("gemini");
    expect(cap.req!.url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(cap.req!.headers.get("authorization")).toBe("Bearer gkey");
    expect(cap.body.model).toBe("gemini-2.5-flash");
  });

  test("throws on non-OK response", async () => {
    const fetchFn = (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
    const p = new ZaiProvider({ apiKey: "k", fetchFn });
    await expect(p.generateSummary(ctx, "morning")).rejects.toThrow(/401/);
  });
});

describe("buildContext", () => {
  const rows: ScoreRow[] = [
    { day: "2026-06-28", kind: "recovery", value: 72, inputs: { result: { value: 72, provisional: false } } },
    { day: "2026-06-28", kind: "sleep", value: 80, inputs: { result: { performance: 0.8 } } },
    { day: "2026-06-27", kind: "recovery", value: 50, inputs: { result: { value: 50 } } },
  ];

  test("selects the target day and maps kinds", () => {
    const ctx = buildContext("2026-06-28", rows);
    expect(ctx.recovery?.value).toBe(72);
    expect(ctx.sleep?.performance).toBe(0.8);
    expect(ctx.strain).toBeUndefined();
  });

  test("attaches profile when given", () => {
    const ctx = buildContext("2026-06-28", rows, { name: "Owner", goals: ["recover"] });
    expect(ctx.profile?.name).toBe("Owner");
  });
});
