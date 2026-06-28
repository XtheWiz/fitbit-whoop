import type { AssistantProvider, AssistantContext, ChatMessage } from "./provider.ts";
import { buildSummaryPrompt } from "./prompts/summary.ts";
import type { SummaryWindow } from "@recover/shared-types";

export interface ZaiOptions {
  apiKey: string;
  baseUrl?: string; // default https://api.z.ai/api/paas/v4
  model?: string; // default glm-4.6
  fetchFn?: typeof fetch; // injectable for tests
}

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
}

/**
 * z.ai (Zhipu GLM) assistant provider. OpenAI-compatible chat/completions.
 * Selected via AI_PROVIDER=zai. See https://docs.z.ai/api-reference/introduction
 */
export class ZaiProvider implements AssistantProvider {
  readonly name = "zai";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(opts: ZaiOptions) {
    if (!opts.apiKey) throw new Error("ZaiProvider requires an apiKey (ZAI_API_KEY).");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.z.ai/api/paas/v4").replace(/\/$/, "");
    this.model = opts.model ?? "glm-4.6";
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  async generateSummary(ctx: AssistantContext, window: SummaryWindow): Promise<string> {
    const { system, user } = buildSummaryPrompt(ctx, window);
    return this.complete([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
  }

  async chat(messages: ChatMessage[], ctx: AssistantContext): Promise<string> {
    const system =
      "You are a concise, evidence-based health coach. Ground every answer in the " +
      "provided metrics; never invent data. These are wellness estimates, not medical advice.\n\n" +
      `Today's data (JSON):\n${JSON.stringify(ctx)}`;
    return this.complete([{ role: "system", content: system }, ...messages]);
  }

  private async complete(
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const res = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.6 }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`z.ai ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as ChatCompletion;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("z.ai returned no content");
    return text;
  }
}
