import type { AssistantProvider } from "./provider.ts";
import { buildSummaryPrompt } from "./prompts/summary.ts";
import type { AssistantContext, ChatMessage } from "./provider.ts";
import type { SummaryWindow } from "@recover/shared-types";
import { ZaiProvider } from "./zai_provider.ts";
import { GeminiProvider } from "./gemini_provider.ts";

export type { AssistantProvider, AssistantContext, ChatMessage } from "./provider.ts";

/**
 * Deterministic, no-network provider used as the default until a real LLM adapter
 * (Claude / Gemini / local) is wired in Phase 5. Lets the server + tests run keyless.
 */
class TemplateProvider implements AssistantProvider {
  readonly name = "template";

  async generateSummary(ctx: AssistantContext, window: SummaryWindow): Promise<string> {
    const r = ctx.recovery ? `Recovery ${Math.round(ctx.recovery.value)}%` : "";
    const s = ctx.strain ? `Strain ${ctx.strain.value.toFixed(1)}` : "";
    const sl = ctx.sleep
      ? `Sleep ${(ctx.sleep.performance * 100).toFixed(0)}%`
      : "";
    const head = [r, s, sl].filter(Boolean).join(" · ");
    return `[${window}] ${head}. (Template provider — wire a real AI provider via AI_PROVIDER.)`;
  }

  async chat(messages: ChatMessage[], _ctx: AssistantContext): Promise<string> {
    const last = messages.at(-1)?.content ?? "";
    return `Template provider received: "${last}". Configure AI_PROVIDER for real answers.`;
  }
}

/** Provider factory, selected by AI_PROVIDER. Falls back to the keyless template. */
export function makeAssistant(): AssistantProvider {
  const provider = process.env.AI_PROVIDER ?? "template";
  switch (provider) {
    case "zai": {
      const apiKey = process.env.ZAI_API_KEY;
      if (!apiKey) {
        console.warn("AI_PROVIDER=zai but ZAI_API_KEY is unset — using template provider.");
        return new TemplateProvider();
      }
      return new ZaiProvider({
        apiKey,
        baseUrl: process.env.ZAI_BASE_URL,
        model: process.env.ZAI_MODEL,
      });
    }
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("AI_PROVIDER=gemini but GEMINI_API_KEY is unset — using template provider.");
        return new TemplateProvider();
      }
      return new GeminiProvider({
        apiKey,
        baseUrl: process.env.GEMINI_BASE_URL,
        model: process.env.GEMINI_MODEL,
      });
    }
    // case "claude": return new ClaudeProvider(...)
    default:
      return new TemplateProvider();
  }
}

export { buildSummaryPrompt };
