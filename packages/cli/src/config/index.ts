/**
 * CLI configuration management - manages model configuration and user preferences
 */
import { homedir } from "node:os";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ModelConfig, ModelProvider } from "@layagen/core";

export const CONFIG_DIR = join(homedir(), ".layagen");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface UserConfig {
  model?: ModelConfig;
  defaultOutputDir?: string;
  defaultLanguage?: "zh" | "en";
  theme?: string;
}

/**
 * Read user configuration
 */
export function loadUserConfig(): UserConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Config file read failed, return empty config
  }
  return {};
}

/**
 * Save user configuration
 */
export function saveUserConfig(config: UserConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get model configuration (priority: env vars > config file > default)
 */
export function getModelConfig(): ModelConfig {
  // 1. Try loading from environment variables
  const { loadConfigFromEnv, DEFAULT_MODELS } = require("@layagen/core") as {
    loadConfigFromEnv: () => Partial<ModelConfig> | null;
    DEFAULT_MODELS: Record<ModelProvider, { model: string; baseUrl?: string }>;
  };
  const envConfig = loadConfigFromEnv();

  if (envConfig?.provider && envConfig?.apiKey) {
    return {
      ...DEFAULT_MODELS[envConfig.provider as ModelProvider],
      ...envConfig,
    } as ModelConfig;
  }

  // 2. Try loading from config file
  const userConfig = loadUserConfig();
  if (userConfig.model?.provider) {
    return {
      ...DEFAULT_MODELS[userConfig.model.provider as ModelProvider],
      ...userConfig.model,
    };
  }

  // 3. Throw error prompting user to configure
  throw new Error(
    "AI model configuration not found. Please configure via one of the following methods:\n" +
    "  1. Set environment variable (e.g. OPENAI_API_KEY=sk-xxx)\n" +
    "  2. Run `layagen config` for interactive configuration\n" +
    "  3. Manually configure in ~/.layagen/config.json"
  );
}

/**
 * Set model configuration
 */
export function setModelConfig(config: ModelConfig): void {
  const userConfig = loadUserConfig();
  userConfig.model = config;
  saveUserConfig(userConfig);
}
