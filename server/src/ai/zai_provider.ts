import { OpenAICompatibleProvider, type OpenAICompatOptions } from "./openai_compatible.ts";

export type ZaiOptions = OpenAICompatOptions;

/**
 * z.ai (Zhipu GLM) assistant provider. OpenAI-compatible chat/completions.
 * Selected via AI_PROVIDER=zai. See https://docs.z.ai/api-reference/introduction
 */
export class ZaiProvider extends OpenAICompatibleProvider {
  constructor(opts: ZaiOptions) {
    super(opts, {
      name: "zai",
      baseUrl: "https://api.z.ai/api/paas/v4",
      model: "glm-4.6",
    });
  }
}
