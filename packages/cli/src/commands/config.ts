import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import {
  loadUserConfig,
  saveUserConfig,
  setModelConfig,
  getModelConfig,
  CONFIG_FILE,
} from "../config/index.js";
import { getAvailableProviders, testModel, DEFAULT_MODELS, type ModelProvider } from "@layagen/core";

export const configCommand = new Command("config")
  .description("Configure AI model parameters")
  .option("-s, --show", "Show current configuration")
  .option("-r, --reset", "Reset all configurations")
  .option("--test", "Test model connection")
  .action(async (options) => {
    // Show current configuration
    if (options.show) {
      showCurrentConfig();
      return;
    }

    // Reset configuration
    if (options.reset) {
      saveUserConfig({});
      console.log(chalk.green("Configuration reset"));
      return;
    }

    // Test model connection
    if (options.test) {
      await testModelConnection();
      return;
    }

    // Interactive configuration
    await interactiveConfig();
  });

async function interactiveConfig(): Promise<void> {
  console.log(chalk.bold.cyan("\n━━━ AI Model Configuration ━━━\n"));

  // Show available providers
  const providers = getAvailableProviders();
  console.log(chalk.gray("Environment variable detection:"));
  for (const p of providers) {
    const status = p.configured ? chalk.green("configured") : chalk.gray("not configured");
    console.log(`  ${p.provider}: ${status}`);
  }
  console.log();

  // Select provider
  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Select AI model provider:",
      choices: [
        { name: "OpenAI (GPT-4o / GPT-4o-mini)", value: "openai" },
        { name: "Anthropic (Claude 3.5 Sonnet)", value: "anthropic" },
        { name: "Tongyi Qwen (Qwen-Max / Qwen-Turbo)", value: "qwen" },
        { name: "DeepSeek (DeepSeek-V3)", value: "deepseek" },
        { name: "Zhipu GLM (GLM-4-Plus)", value: "glm" },
        { name: "Moonshot Kimi (Kimi-Latest)", value: "kimi" },
        { name: "Ollama (Local deployment)", value: "ollama" },
        { name: "Custom OpenAI-compatible API", value: "custom" },
      ],
    },
  ]);

  const defaults = DEFAULT_MODELS[provider as ModelProvider];

  // Ask configuration based on provider
  const answers: Record<string, any> = { provider };

  if (provider !== "ollama") {
    const { apiKey } = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Enter API Key:",
        mask: "*",
        validate: (input: string) => input.length > 0 || "API Key cannot be empty",
      },
    ]);
    answers.apiKey = apiKey;
  }

  const { model } = await inquirer.prompt([
    {
      type: "input",
      name: "model",
      message: "Model name (optional, leave empty for default):",
      default: defaults.model,
    },
  ]);
  answers.model = model || defaults.model;

  // Base URL: all providers support custom base URL (with default suggestion)
  const { baseUrl } = await inquirer.prompt([
    {
      type: "input",
      name: "baseUrl",
      message: "Base URL (optional, leave empty for default):",
      default: defaults.baseUrl || "",
    },
  ]);
  answers.baseUrl = baseUrl || defaults.baseUrl;

  const { temperature } = await inquirer.prompt([
    {
      type: "input",
      name: "temperature",
      message: "Temperature (0-2, default 0.7):",
      default: "0.7",
      validate: (input: string) => {
        const n = Number(input);
        return (n >= 0 && n <= 2) || "Please enter a number between 0 and 2";
      },
    },
  ]);
  answers.temperature = Number(temperature);

  // Save configuration
  setModelConfig(answers as ModelConfig);

  console.log(chalk.green(`\nConfiguration saved to ${CONFIG_FILE}`));

  // Test connection
  const { testNow } = await inquirer.prompt([
    {
      type: "confirm",
      name: "testNow",
      message: "Test model connection?",
      default: true,
    },
  ]);

  if (testNow) {
    await testModelConnection();
  }
}

function showCurrentConfig(): void {
  console.log(chalk.bold.cyan("\n━━━ Current Configuration ━━━\n"));

  try {
    const config = getModelConfig();
    console.log(`  Provider: ${chalk.bold(config.provider)}`);
    console.log(`  Model: ${chalk.bold(config.model)}`);
    console.log(`  API Key: ${config.apiKey ? chalk.green("set") : chalk.red("not set")}`);
    if (config.baseUrl) console.log(`  Base URL: ${config.baseUrl}`);
    if (config.temperature) console.log(`  Temperature: ${config.temperature}`);
  } catch (error) {
    console.log(chalk.yellow(`  No model configured`));
    console.log(chalk.gray(`  ${(error as Error).message}`));
  }

  const userConfig = loadUserConfig();
  console.log(chalk.gray(`\n  Config file: ${CONFIG_FILE}`));
  if (userConfig.model) {
    console.log(chalk.gray(`  Saved configuration:`));
    console.log(chalk.gray(`    Provider: ${userConfig.model.provider}`));
    console.log(chalk.gray(`    Model: ${userConfig.model.model}`));
  }
}

async function testModelConnection(): Promise<void> {
  console.log(chalk.blue("\nTesting model connection...\n"));

  try {
    const config = getModelConfig();
    const spinner = ora("Connecting...").start();

    const result = await testModel(config);

    if (result.success) {
      spinner.succeed(chalk.green(`Connection successful! Latency: ${result.latency}ms`));
    } else {
      spinner.fail(chalk.red(`Connection failed: ${result.error}`));
      console.log(chalk.yellow("\nTroubleshooting suggestions:"));
      console.log("  1. Check if API Key is correct");
      console.log("  2. Check network connection");
      console.log("  3. For local models, ensure Ollama service is running");
      console.log("  4. Check provider status page");
    }
  } catch (error) {
    console.log(chalk.red(`\nTest failed: ${(error as Error).message}`));
  }
}
