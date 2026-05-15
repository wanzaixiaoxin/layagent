/**
 * Model configuration module - supports multiple AI providers
 * Priority: Environment variables > Config file > Interactive input
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "qwen"
  | "deepseek"
  | "glm"
  | "kimi"
  | "ollama"
  | "custom";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_MODELS: Record<ModelProvider, { model: string; baseUrl?: string }> = {
  openai: { model: "gpt-4o-mini" },
  anthropic: { model: "claude-3-5-sonnet-latest" },
  qwen: { model: "qwen-max", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  deepseek: { model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com/v1" },
  glm: { model: "glm-4-plus", baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  kimi: { model: "kimi-latest", baseUrl: "https://api.moonshot.cn/v1" },
  ollama: { model: "llama3.1", baseUrl: "http://localhost:11434/api" },
  custom: { model: "custom-model" },
};

export const PROVIDER_ENV_KEYS: Record<ModelProvider, { key: string; url?: string }> = {
  openai: { key: "OPENAI_API_KEY" },
  anthropic: { key: "ANTHROPIC_API_KEY" },
  qwen: { key: "DASHSCOPE_API_KEY", url: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  deepseek: { key: "DEEPSEEK_API_KEY", url: "https://api.deepseek.com/v1" },
  glm: { key: "GLM_API_KEY", url: "https://open.bigmodel.cn/api/paas/v4" },
  kimi: { key: "KIMI_API_KEY", url: "https://api.moonshot.cn/v1" },
  ollama: { key: "", url: "http://localhost:11434/api" },
  custom: { key: "CUSTOM_API_KEY", url: "" },
};

/**
 * Read model configuration from environment variables
 *
 * Priority:
 * 1. AI_PROVIDER + corresponding API_KEY (explicit selection)
 * 2. First provider with API_KEY detected (auto-detection)
 */
export function loadConfigFromEnv(): Partial<ModelConfig> | null {
  const providers: ModelProvider[] = ["openai", "anthropic", "qwen", "deepseek", "glm", "kimi", "ollama", "custom"];

  const explicitProvider = process.env.AI_PROVIDER as ModelProvider | undefined;

  // If AI_PROVIDER is explicitly set, use it directly
  if (explicitProvider && providers.includes(explicitProvider)) {
    const env = PROVIDER_ENV_KEYS[explicitProvider];
    const apiKey = env.key ? process.env[env.key] : undefined;

    if (explicitProvider === "ollama" || apiKey) {
      const modelEnv = process.env[`${explicitProvider.toUpperCase()}_MODEL`];
      const baseUrlEnv = process.env[`${explicitProvider.toUpperCase()}_BASE_URL`] || process.env.AI_BASE_URL || env.url;

      return {
        provider: explicitProvider,
        model: modelEnv || DEFAULT_MODELS[explicitProvider].model,
        apiKey,
        baseUrl: baseUrlEnv,
        temperature: Number(process.env.AI_TEMPERATURE) || undefined,
        maxTokens: Number(process.env.AI_MAX_TOKENS) || undefined,
      };
    }
  }

  // Auto-detect: iterate through providers and use the first one with API key
  for (const provider of providers) {
    const env = PROVIDER_ENV_KEYS[provider];
    const apiKey = env.key ? process.env[env.key] : undefined;

    if (provider === "ollama" || apiKey) {
      const modelEnv = process.env[`${provider.toUpperCase()}_MODEL`];
      const baseUrlEnv = process.env[`${provider.toUpperCase()}_BASE_URL`] || env.url;

      return {
        provider,
        model: modelEnv || DEFAULT_MODELS[provider].model,
        apiKey,
        baseUrl: baseUrlEnv,
        temperature: Number(process.env.AI_TEMPERATURE) || undefined,
        maxTokens: Number(process.env.AI_MAX_TOKENS) || undefined,
      };
    }
  }

  return null;
}

/**
 * Create AI model instance
 */
export function createModel(config: ModelConfig): LanguageModel {
  const { provider, model, apiKey, baseUrl } = config;

  switch (provider) {
    case "openai": {
      if (!apiKey) throw new Error("OpenAI API Key not configured. Set OPENAI_API_KEY environment variable");
      const openai = createOpenAI({ apiKey, baseURL: baseUrl });
      return openai(model) as unknown as unknown as LanguageModel;
    }

    case "anthropic": {
      if (!apiKey) throw new Error("Anthropic API Key not configured. Set ANTHROPIC_API_KEY environment variable");
      const anthropic = createAnthropic({ apiKey, baseURL: baseUrl });
      return anthropic(model) as unknown as unknown as LanguageModel;
    }

    case "qwen":
    case "deepseek":
    case "glm":
    case "kimi":
    case "ollama":
    case "custom": {
      if (!apiKey && provider !== "ollama") {
        throw new Error(`${provider} API Key not configured.`);
      }
      if (!baseUrl && provider === "custom") {
        throw new Error("Custom model Base URL not configured.");
      }
      const client = createOpenAI({
        apiKey: provider === "ollama" ? "ollama" : apiKey,
        baseURL: baseUrl || DEFAULT_MODELS[provider].baseUrl,
      });
      return client(model) as unknown as LanguageModel;
    }

    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

/**
 * Get available model providers list
 */
export function getAvailableProviders(): { provider: ModelProvider; configured: boolean }[] {
  const providers: ModelProvider[] = ["openai", "anthropic", "qwen", "deepseek", "glm", "kimi", "ollama", "custom"];

  return providers.map((p) => {
    const env = PROVIDER_ENV_KEYS[p];
    const configured = p === "ollama" ? true : !!process.env[env.key];
    return { provider: p, configured };
  });
}

/**
 * Test model connection
 */
export async function testModel(config: ModelConfig): Promise<{ success: boolean; latency: number; error?: string }> {
  const start = Date.now();
  try {
    const { generateText } = await import("ai");
    const model = createModel(config);
    await generateText({
      model,
      prompt: 'Reply "OK", only these two characters.',
      maxTokens: 10,
    });
    return { success: true, latency: Date.now() - start };
  } catch (error) {
    return { success: false, latency: Date.now() - start, error: (error as Error).message };
  }
}
