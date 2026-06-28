import type {
  RecoveryResult,
  StrainResult,
  SleepResult,
  SummaryWindow,
} from "@recover/shared-types";

/** Structured context handed to the assistant. Never raw sample dumps. */
export interface AssistantContext {
  day: string; // YYYY-MM-DD
  recovery?: RecoveryResult;
  strain?: StrainResult;
  sleep?: SleepResult;
  trend?: { metric: string; direction: "up" | "down" | "flat"; note: string }[];
  profile?: { name?: string; goals?: string[] };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** All AI backends implement this. Selected by AI_PROVIDER env. */
export interface AssistantProvider {
  readonly name: string;
  generateSummary(ctx: AssistantContext, window: SummaryWindow): Promise<string>;
  chat(messages: ChatMessage[], ctx: AssistantContext): Promise<string>;
}
