import { Elysia, t } from "elysia";
import type { AssistantContext, ChatMessage } from "../ai/index.ts";
import type { SummaryWindow } from "@recover/shared-types";
import { assistant, generateAndStoreSummary, getSummaries } from "../services/summary_service.ts";

// AI assistant endpoints. /day generates from stored scores + persists; /generate
// is stateless (caller supplies context); /chat is conversational.
export const summariesRoutes = new Elysia({ prefix: "/summaries" })
  .post(
    "/day",
    async ({ body }) => {
      const { userId, day, window } = body as {
        userId: string;
        day: string;
        window: SummaryWindow;
      };
      return generateAndStoreSummary(userId, day, window);
    },
    { body: t.Any() },
  )
  .get("/", ({ query }) =>
    getSummaries(String(query.userId), query.day ? String(query.day) : undefined),
  )
  .post(
    "/generate",
    async ({ body }) => {
      const { context, window } = body as {
        context: AssistantContext;
        window: SummaryWindow;
      };
      const text = await assistant.generateSummary(context, window);
      return { provider: assistant.name, window, text };
    },
    { body: t.Any() },
  )
  .post(
    "/chat",
    async ({ body }) => {
      const { messages, context } = body as {
        messages: ChatMessage[];
        context: AssistantContext;
      };
      const text = await assistant.chat(messages, context);
      return { provider: assistant.name, text };
    },
    { body: t.Any() },
  );
