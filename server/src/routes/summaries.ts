import { Elysia, t } from "elysia";
import { makeAssistant } from "../ai/index.ts";
import type { AssistantContext, ChatMessage } from "../ai/index.ts";
import type { SummaryWindow } from "@recover/shared-types";

const assistant = makeAssistant();

// AI assistant endpoints. Stateless for now (context passed in by caller).
export const summariesRoutes = new Elysia({ prefix: "/summaries" })
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
