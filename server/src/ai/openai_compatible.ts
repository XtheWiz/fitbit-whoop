import type { AssistantProvider, AssistantContext, ChatMessage } from "./provider.ts";
import { buildSummaryPrompt } from "./prompts/summary.ts";
import type { SummaryWindow } from "@recover/shared-types";

export interface OpenAICompatOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchFn?: typeof fetch; // injectable for tests
}

interface ProviderDefaults {
  name: string;
  baseUrl: string;
  model: string;
}

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
}

/**
 * Shared base for OpenAI-compatible chat APIs (POST /chat/completions, Bearer auth).
 * Both z.ai (GLM) and Gemini's OpenAI endpoint speak this; subclasses just supply
 * a name + default baseUrl/model.
 */
export class OpenAICompatibleProvider implements AssistantProvider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(opts: OpenAICompatOptions, defaults: ProviderDefaults) {
    if (!opts.apiKey) throw new Error(`${defaults.name} requires an apiKey.`);
    this.name = defaults.name;
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? defaults.baseUrl).replace(/\/$/, "");
    this.model = opts.model ?? defaults.model;
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

  private async complete(messages: { role: string; content: string }[]): Promise<string> {
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
      throw new Error(`${this.name} ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as ChatCompletion;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(`${this.name} returned no content`);
    return text;
  }
}
