import type { AssistantProvider } from "./provider.ts";
import { buildSummaryPrompt } from "./prompts/summary.ts";
import type { AssistantContext, ChatMessage } from "./provider.ts";
import type { SummaryWindow } from "@recover/shared-types";

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

/** Provider factory. Real adapters added behind this in Phase 5. */
export function makeAssistant(): AssistantProvider {
  const provider = process.env.AI_PROVIDER ?? "local";
  switch (provider) {
    // case "claude": return new ClaudeProvider(...)   // Phase 5
    // case "gemini": return new GeminiProvider(...)   // Phase 5
    default:
      return new TemplateProvider();
  }
}

export { buildSummaryPrompt };
