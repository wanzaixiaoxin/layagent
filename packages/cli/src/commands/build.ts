import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { CodeGenerator, createModel } from "@layagen/core";
import { getModelConfig } from "../config/index.js";

export const buildCommand = new Command("build")
  .description("Generate LayaAir project code from game design document")
  .argument("<game-doc>", "Game design document JSON file path")
  .option("-o, --output <path>", "Output directory", "./output/game-project")
  .option("--mock", "Use mock data (no AI call)")
  .action(async (gameDocPath: string, options) => {
    const spinner = ora("Reading game design document...").start();

    try {
      const docContent = readFileSync(gameDocPath, "utf-8");
      const gameDoc = JSON.parse(docContent);

      let project: any;

      if (options.mock) {
        // Mock mode
        spinner.text = "Generating project (mock mode)...";
        await new Promise((r) => setTimeout(r, 1000));
        project = createMockProject(gameDoc);
        spinner.succeed("LayaAir project generated! (mock mode)");
      } else {
        // Real AI call
        const modelConfig = getModelConfig();
        const model = createModel(modelConfig);
        const generator = new CodeGenerator({ model });

        spinner.text = "Generating LayaAir project...";
        project = await generator.generateProject(gameDoc);
        spinner.succeed("LayaAir project generated!");
      }

      const outputDir = options.output;

      // Create project structure
      mkdirSync(join(outputDir, "src", "scripts"), { recursive: true });
      mkdirSync(join(outputDir, "src", "scenes"), { recursive: true });
      mkdirSync(join(outputDir, "res", "characters"), { recursive: true });
      mkdirSync(join(outputDir, "res", "backgrounds"), { recursive: true });
      mkdirSync(join(outputDir, "res", "items"), { recursive: true });
      mkdirSync(join(outputDir, "res", "ui"), { recursive: true });
      mkdirSync(join(outputDir, "res", "audio"), { recursive: true });

      // Write generated files
      if (project.config) {
        writeFileSync(join(outputDir, "project.json"), JSON.stringify(project.config, null, 2));
      }
      if (project.scripts) {
        for (const script of project.scripts) {
          writeFileSync(join(outputDir, "src", "scripts", script.filename), script.content);
        }
      }
      if (project.scenes) {
        for (const scene of project.scenes) {
          writeFileSync(join(outputDir, "src", "scenes", scene.filename), scene.content);
        }
      }
      if (project.indexHtml) {
        writeFileSync(join(outputDir, "index.html"), project.indexHtml);
      }

      // Write a placeholder resource list
      if (project.resources) {
        writeFileSync(join(outputDir, "resources.json"), JSON.stringify(project.resources, null, 2));
      }

      spinner.succeed("LayaAir project generated!");

      console.log(chalk.green(`\nProject saved to: ${outputDir}`));
      console.log(chalk.blue("\nGenerated files:"));
      console.log("  project.json - Project configuration");
      if (project.scripts) {
        for (const script of project.scripts) {
          console.log(`  src/scripts/${script.filename}`);
        }
      }
      console.log("  index.html - Entry page");
      console.log(chalk.yellow("\nTip: Place AI-generated images into res/ directories to run the game"));
    } catch (error) {
      spinner.fail("Generation failed");
      console.error(chalk.red((error as Error).message));
      console.log(chalk.gray("\nTip: Use --mock flag for offline testing"));
      console.log(chalk.gray("      Or run layagen config to configure AI model"));
      process.exit(1);
    }
  });

function createMockProject(gameDoc: any) {
  return {
    config: {
      name: gameDoc.name || "my-game",
      version: "1.0.0",
      engineVersion: "3.2.0",
      screenOrientation: "landscape",
      resolution: { width: 1080, height: 1920 },
      physics: { enabled: true, engine: "box2d", gravity: { x: 0, y: 9.8 } },
      scenes: gameDoc.sceneHierarchy?.map((s: any) => ({ name: s.name, type: gameDoc.dimension || "2d" })),
    },
    scripts: [
      {
        filename: "player-controller.ts",
        content: `import { Laya } from "Laya";
import { Script } from "laya/components/Script";

export class PlayerController extends Script {
  onAwake(): void {
    console.log("[PlayerController] Loaded");
  }

  onUpdate(): void {
    // Player update logic
  }
}`,
      },
    ],
    scenes: [],
    indexHtml: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${gameDoc.name || "Game"}</title>
  <style>body{margin:0;padding:0;overflow:hidden;background:#000;}canvas{display:block;}</style>
</head>
<body>
  <script src="libs/laya.core.js"></script>
  <script src="libs/laya.physics.js"></script>
  <script src="js/index.js"></script>
</body>
</html>`,
    resources: [],
  };
}
