import type { AssistantContext } from "../provider.ts";
import type { SummaryWindow } from "@recover/shared-types";

const TONE: Record<SummaryWindow, string> = {
  morning:
    "Write a short morning briefing: how recovered they are today and how hard to train.",
  midday:
    "Write a short midday note: how their accumulated strain is pacing vs. their recovery.",
  evening:
    "Write a short evening wind-down: sleep target tonight and one recovery tip.",
};

/** Versioned prompt template. v1. Keep deterministic & grounded in ctx only. */
export function buildSummaryPrompt(
  ctx: AssistantContext,
  window: SummaryWindow,
): { system: string; user: string } {
  const system =
    "You are a concise, evidence-based health coach. Use ONLY the provided metrics. " +
    "Cite the actual numbers/drivers. Never invent data. 2-4 sentences. " +
    "Make clear these are wellness estimates, not medical advice.";
  const user = `${TONE[window]}\n\nData (JSON):\n${JSON.stringify(ctx, null, 2)}`;
  return { system, user };
}
