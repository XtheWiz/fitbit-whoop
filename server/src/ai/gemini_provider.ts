import { OpenAICompatibleProvider, type OpenAICompatOptions } from "./openai_compatible.ts";

export type GeminiOptions = OpenAICompatOptions;

/**
 * Google Gemini via its OpenAI-compatible endpoint (Bearer auth).
 * Selected via AI_PROVIDER=gemini.
 * https://ai.google.dev/gemini-api/docs/openai
 */
export class GeminiProvider extends OpenAICompatibleProvider {
  constructor(opts: GeminiOptions) {
    super(opts, {
      name: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.5-flash",
    });
  }
}
