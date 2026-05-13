/**
 * Model configuration module - supports multiple AI providers
 * Priority: Environment variables > Config file > Interactive input
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "qwen"
  | "deepseek"
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
  deepseek: { model: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1" },
  ollama: { model: "llama3.1", baseUrl: "http://localhost:11434/api" },
  custom: { model: "custom-model" },
};

export const PROVIDER_ENV_KEYS: Record<ModelProvider, { key: string; url?: string }> = {
  openai: { key: "OPENAI_API_KEY" },
  anthropic: { key: "ANTHROPIC_API_KEY" },
  qwen: { key: "DASHSCOPE_API_KEY", url: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  deepseek: { key: "DEEPSEEK_API_KEY", url: "https://api.deepseek.com/v1" },
  ollama: { key: "", url: "http://localhost:11434/api" },
  custom: { key: "CUSTOM_API_KEY", url: "" },
};

/**
 * Read model configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<ModelConfig> | null {
  const providers: ModelProvider[] = ["openai", "anthropic", "qwen", "deepseek", "ollama", "custom"];

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
      const openai = createOpenAI({ apiKey, baseUrl });
      return openai(model);
    }

    case "anthropic": {
      if (!apiKey) throw new Error("Anthropic API Key not configured. Set ANTHROPIC_API_KEY environment variable");
      const anthropic = createAnthropic({ apiKey, baseUrl });
      return anthropic(model);
    }

    case "qwen": {
      if (!apiKey) throw new Error("Qwen API Key not configured. Set DASHSCOPE_API_KEY environment variable");
      const qwen = createOpenAICompatible({
        name: "qwen",
        apiKey,
        baseURL: baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      });
      return qwen(model);
    }

    case "deepseek": {
      if (!apiKey) throw new Error("DeepSeek API Key not configured. Set DEEPSEEK_API_KEY environment variable");
      const deepseek = createOpenAICompatible({
        name: "deepseek",
        apiKey,
        baseURL: baseUrl || "https://api.deepseek.com/v1",
      });
      return deepseek(model);
    }

    case "ollama": {
      const ollama = createOpenAICompatible({
        name: "ollama",
        apiKey: "ollama",
        baseURL: baseUrl || "http://localhost:11434/api",
      });
      return ollama(model);
    }

    case "custom": {
      if (!apiKey) throw new Error("Custom model API Key not configured. Set CUSTOM_API_KEY environment variable");
      if (!baseUrl) throw new Error("Custom model Base URL not configured. Set CUSTOM_BASE_URL environment variable");
      const custom = createOpenAICompatible({
        name: "custom",
        apiKey,
        baseURL: baseUrl,
      });
      return custom(model);
    }

    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

/**
 * Get available model providers list
 */
export function getAvailableProviders(): { provider: ModelProvider; configured: boolean }[] {
  const providers: ModelProvider[] = ["openai", "anthropic", "qwen", "deepseek", "ollama", "custom"];

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
