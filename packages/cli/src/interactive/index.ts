import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { GamePlanner, PromptEngine, CodeGenerator, createModel } from "@layagen/core";
import { getModelConfig } from "../config/index.js";
import { showMainMenu, type MenuAction } from "./prompts/main-menu.js";
import { planningPrompt } from "./prompts/planning.js";
import { promptsGeneration } from "./prompts/prompts-gen.js";
import { codeGeneration } from "./prompts/code-gen.js";
import { render } from "./utils/renderer.js";

interface GameSession {
  gameDoc?: any;
  promptPackage?: any;
  project?: any;
  modelConfig?: any;
}

const session: GameSession = {};

export async function startInteractiveMode(): Promise<void> {
  // Load model config at start
  try {
    session.modelConfig = getModelConfig();
    render.success(`AI model configured: ${session.modelConfig.provider} (${session.modelConfig.model})`);
  } catch {
    render.warning("No AI model configured. Run 'layagen config' to set up.");
    render.info("Falling back to mock mode...\n");
  }

  // Step 1: Planning
  const description = await planningPrompt();

  const spinner = ora("Planning game design...").start();

  try {
    if (session.modelConfig) {
      // Real AI call
      const model = createModel(session.modelConfig);
      const planner = new GamePlanner({ model });
      session.gameDoc = await planner.plan(description);
      spinner.succeed("Game design completed! (AI powered)");
    } else {
      // Mock mode
      await new Promise((r) => setTimeout(r, 2000));
      session.gameDoc = createMockGameDoc(description);
      spinner.succeed("Game design completed! (mock mode)");
    }
  } catch (error) {
    spinner.fail(`Planning failed: ${(error as Error).message}`);
    render.info("Falling back to mock mode...");
    await new Promise((r) => setTimeout(r, 1000));
    session.gameDoc = createMockGameDoc(description);
  }

  render.docSummary(session.gameDoc);

  // Step 2: Main Menu Loop
  let running = true;
  while (running) {
    const action = await showMainMenu();

    switch (action) {
      case "view-doc":
        render.info(JSON.stringify(session.gameDoc, null, 2));
        break;

      case "gen-prompts": {
        if (session.modelConfig) {
          const model = createModel(session.modelConfig);
          const engine = new PromptEngine({ model });
          session.promptPackage = await promptsGeneration(session.gameDoc, engine);
        } else {
          session.promptPackage = await promptsGeneration(session.gameDoc, null);
        }
        break;
      }

      case "gen-code": {
        if (session.modelConfig) {
          const model = createModel(session.modelConfig);
          const generator = new CodeGenerator({ model });
          session.project = await codeGeneration(session.gameDoc, generator);
        } else {
          session.project = await codeGeneration(session.gameDoc, null);
        }
        break;
      }

      case "preview":
        render.warning("MCP preview requires LayaAir-MCP plugin installation");
        break;

      case "refine": {
        const { feedback } = await inquirer.prompt([
          {
            type: "input",
            name: "feedback",
            message: "Enter refinement feedback:",
          },
        ]);
        if (session.modelConfig && session.gameDoc) {
          const refineSpinner = ora("Refining game design...").start();
          try {
            const model = createModel(session.modelConfig);
            const planner = new GamePlanner({ model });
            session.gameDoc = await planner.refine(session.gameDoc, feedback);
            refineSpinner.succeed("Game design refined!");
            render.docSummary(session.gameDoc);
          } catch (error) {
            refineSpinner.fail(`Refinement failed: ${(error as Error).message}`);
          }
        } else {
          render.info(`Received feedback: ${feedback}`);
        }
        break;
      }

      case "save": {
        const outputDir = "./output";
        mkdirSync(outputDir, { recursive: true });
        if (session.gameDoc) {
          writeFileSync(`${outputDir}/game-doc.json`, JSON.stringify(session.gameDoc, null, 2));
          render.success(`Design document saved to ${outputDir}/game-doc.json`);
        }
        if (session.promptPackage) {
          writeFileSync(`${outputDir}/prompts.json`, JSON.stringify(session.promptPackage, null, 2));
          render.success(`Prompt package saved to ${outputDir}/prompts.json`);
        }
        if (session.project) {
          writeFileSync(`${outputDir}/project.json`, JSON.stringify(session.project, null, 2));
          render.success(`Project saved to ${outputDir}/project.json`);
        }
        break;
      }

      case "exit":
        running = false;
        render.success("Thanks for using LayaGen AI! Goodbye");
        break;

      default:
        break;
    }
  }
}

function createMockGameDoc(description: string) {
  return {
    id: crypto.randomUUID(),
    name: "Ninja Cat Runner",
    description: description,
    genre: "platformer",
    dimension: "2d",
    targetPlatforms: ["h5"],
    coreMechanics: {
      input: "Click to jump / double jump",
      winCondition: "Reach the finish",
      loseCondition: "Fall or hit obstacle",
      scoring: "Collect coins for points",
    },
    sceneHierarchy: [
      {
        name: "BackgroundLayer",
        type: "Sprite",
        children: [
          { name: "bg_far", type: "Sprite", description: "Distant mountains" },
          { name: "bg_near", type: "Sprite", description: "Nearby trees" },
        ],
      },
      {
        name: "GameLayer",
        type: "Sprite",
        children: [
          { name: "player", type: "Sprite", description: "Ninja cat protagonist" },
          { name: "obstacles", type: "Sprite", description: "Obstacle container" },
          { name: "items", type: "Sprite", description: "Item container" },
        ],
      },
      {
        name: "UILayer",
        type: "Sprite",
        children: [
          { name: "score", type: "Text", description: "Score display" },
          { name: "pause_btn", type: "Button", description: "Pause button" },
        ],
      },
    ],
    resourceRequirements: {
      characters: [
        { id: "player_cat", name: "Ninja Cat", type: "sprite_sheet", description: "An orange cat in ninja outfit, big eyes, chibi proportion", frames: 8 },
      ],
      backgrounds: [
        { id: "bg_forest", name: "Forest Background", type: "parallax", description: "Fantasy forest background with far/mid/near parallax layers", layers: 3 },
      ],
      items: [
        { id: "coin", name: "Coin", type: "static_image", description: "Golden coin with spinning animation" },
        { id: "power_up", name: "Speed Boost", type: "animated", description: "Lightning icon, boosts speed for 3 seconds" },
      ],
      effects: [],
      uiElements: [
        { id: "btn_start", name: "Start Button", type: "9slice", description: "Green circular start button" },
        { id: "panel_pause", name: "Pause Panel", type: "9slice", description: "Semi-transparent pause panel" },
        { id: "score_label", name: "Score Label", type: "static_image", description: "Golden score display label" },
      ],
      audio: [
        { id: "bgm", name: "Background Music", type: "audio", description: "Upbeat runner music" },
        { id: "sfx_jump", name: "Jump Sound", type: "audio", description: "Light jump sound effect" },
      ],
    },
    estimatedComplexity: "medium",
  };
}
