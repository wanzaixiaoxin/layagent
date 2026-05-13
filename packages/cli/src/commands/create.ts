import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { GamePlanner, createModel } from "@layagen/core";
import { getModelConfig } from "../config/index.js";

export const createCommand = new Command("create")
  .description("Create game design document from natural language description")
  .argument("<description>", "Game description (natural language) or use @<file-path> to read from file")
  .option("-o, --output <path>", "Output file path", "./output/game-design.json")
  .option("-g, --genre <genre>", "Game genre")
  .option("-c, --complexity <level>", "Complexity: simple, medium, complex", "medium")
  .option("--mock", "Use mock data (no AI call)")
  .action(async (description: string, options) => {
    const spinner = ora("Analyzing game description...").start();

    try {
      let gameDoc: any;

      if (options.mock) {
        // Mock mode
        gameDoc = createMockGameDoc(description, options);
        spinner.succeed("Game design document generated! (mock mode)");
      } else {
        // Real AI call
        const modelConfig = getModelConfig();
        const model = createModel(modelConfig);
        const planner = new GamePlanner({ model });

        spinner.text = "Calling AI to plan game...";

        // Read file description
        let input = description;
        if (description.startsWith("@")) {
          const filePath = description.slice(1);
          input = readFileSync(filePath, "utf-8");
        }

        gameDoc = await planner.plan(input, {
          genre: options.genre,
          complexity: options.complexity,
        });

        spinner.succeed("Game design document generated!");
      }

      mkdirSync(dirname(options.output), { recursive: true });
      writeFileSync(options.output, JSON.stringify(gameDoc, null, 2));

      console.log(chalk.green(`\nGame design document saved to: ${options.output}`));
      console.log(chalk.blue(`\nGame Summary:`));
      console.log(`  Name: ${gameDoc.name}`);
      console.log(`  Genre: ${gameDoc.genre}`);
      console.log(`  Complexity: ${gameDoc.estimatedComplexity}`);
      console.log(chalk.yellow(`\nNext step: layagen prompts ${options.output}`));
    } catch (error) {
      spinner.fail("Generation failed");
      console.error(chalk.red((error as Error).message));
      console.log(chalk.gray("\nTip: Use --mock flag for offline testing"));
      console.log(chalk.gray("      Or run layagen config to configure AI model"));
      process.exit(1);
    }
  });

function createMockGameDoc(description: string, options: any) {
  return {
    id: crypto.randomUUID(),
    name: description.slice(0, 20),
    description,
    genre: options.genre || "platformer",
    dimension: "2d" as const,
    targetPlatforms: ["h5"],
    coreMechanics: {
      input: "Click/touch control",
      winCondition: "Reach the finish or achieve target score",
      loseCondition: "Health reaches zero",
    },
    sceneHierarchy: [
      { name: "BackgroundLayer", type: "Sprite" },
      { name: "GameLayer", type: "Sprite" },
      { name: "UILayer", type: "Sprite" },
    ],
    resourceRequirements: {
      characters: [],
      backgrounds: [],
      items: [],
      effects: [],
      uiElements: [],
      audio: [],
    },
    estimatedComplexity: options.complexity,
  };
}
