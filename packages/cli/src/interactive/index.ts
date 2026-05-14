import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { GamePlanner, PromptEngine, CodeGenerator, createModel } from "@layagen/core";
import { getModelConfig } from "../config/index.js";
import { showMainMenu, type MenuAction } from "./prompts/main-menu.js";
import { planningPrompt } from "./prompts/planning.js";
import { projectSelectPrompt } from "./prompts/project-select.js";
import { promptsGeneration } from "./prompts/prompts-gen.js";
import { codeGeneration } from "./prompts/code-gen.js";
import { render } from "./utils/renderer.js";
import {
  createProject,
  loadProject,
  saveProjectData,
  type ProjectData,
} from "../projects/index.js";

interface GameSession {
  projectId?: string;
  projectData?: ProjectData;
  gameDoc?: any;
  promptPackage?: any;
  project?: any;
  modelConfig?: any;
  userDescription?: string;
}

const session: GameSession = {};

function saveCurrentSession(): void {
  if (session.projectId) {
    saveProjectData(session.projectId, {
      meta: session.projectData?.meta,
      gameDoc: session.gameDoc,
      promptPackage: session.promptPackage,
      projectConfig: session.project,
    });
  }
}

export async function startInteractiveMode(): Promise<void> {
  // Load model config at start
  try {
    session.modelConfig = getModelConfig();
    render.success(`AI model configured: ${session.modelConfig.provider} (${session.modelConfig.model})`);
  } catch {
    render.warning("No AI model configured. Run 'layagen config' to set up.");
    render.info("Falling back to mock mode...\n");
  }

  // Step 0: Project selection
  const projectAction = await projectSelectPrompt();

  if (projectAction.type === "exit") {
    render.success("Goodbye!");
    return;
  }

  if (projectAction.type === "new") {
    // Create new project
    const projectData = createProject(projectAction.name, projectAction.description);
    session.projectId = projectData.meta.id;
    session.projectData = projectData;
    session.userDescription = projectAction.description;

    // Generate game design
    const spinner = ora("Planning game design...").start();
    try {
      if (session.modelConfig) {
        const model = createModel(session.modelConfig);
        const planner = new GamePlanner({ model });
        session.gameDoc = await planner.plan(projectAction.description);
        spinner.succeed("Game design completed! (AI powered)");
      } else {
        await new Promise((r) => setTimeout(r, 2000));
        session.gameDoc = createMockGameDoc(projectAction.description);
        spinner.succeed("Game design completed! (mock mode)");
      }
    } catch (error) {
      spinner.fail(`Planning failed: ${(error as Error).message}`);
      render.info("Falling back to mock mode...");
      await new Promise((r) => setTimeout(r, 1000));
      session.gameDoc = createMockGameDoc(projectAction.description);
    }

    // Save immediately
    saveCurrentSession();
    render.docSummary(session.gameDoc);
  }

  if (projectAction.type === "load") {
    // Load existing project
    const projectData = loadProject(projectAction.projectId);
    if (!projectData) {
      render.error("Project not found!");
      return;
    }

    session.projectId = projectAction.projectId;
    session.projectData = projectData;
    session.gameDoc = projectData.gameDoc;
    session.promptPackage = projectData.promptPackage;
    session.project = projectData.projectConfig;
    session.userDescription = projectData.meta.description;

    render.success(`Loaded project: ${projectData.meta.name}`);

    if (session.gameDoc) {
      render.info("Existing game design document found.");
      render.docSummary(session.gameDoc);
    } else {
      render.warning("No game design document found in this project.");
    }
  }

  // Step 1: Main Menu Loop
  let running = true;
  while (running) {
    const action = await showMainMenu();

    switch (action) {
      case "view-doc":
        if (session.gameDoc) {
          console.log(chalk.cyan("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
          console.log(gameDocToMarkdown(session.gameDoc));
          console.log(chalk.cyan("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
        } else {
          render.warning("No game design document available.");
        }
        break;

      case "modify-desc": {
        const oldDescription = session.userDescription || "";
        const newDescription = await planningPrompt();
        session.userDescription = newDescription;

        // Update project meta
        if (session.projectData) {
          session.projectData.meta.description = newDescription;
        }

        const modifySpinner = ora("Updating game design based on new description...").start();
        try {
          if (session.modelConfig && session.gameDoc) {
            const model = createModel(session.modelConfig);
            const planner = new GamePlanner({ model });
            const feedback = `The user wants to change the game direction. Previous description: "${oldDescription}". New description: "${newDescription}". Please update the existing design document to align with the new description while preserving the existing scene structure, resource categories, and overall complexity level. Replace or adjust content where the new description differs, but keep what still applies.`;
            session.gameDoc = await planner.refine(session.gameDoc, feedback);
            modifySpinner.succeed("Game design updated! (AI powered)");
          } else {
            await new Promise((r) => setTimeout(r, 1500));
            session.gameDoc = createMockGameDoc(newDescription);
            modifySpinner.succeed("Game design updated! (mock mode)");
          }

          // Auto-save after modification
          saveCurrentSession();

          render.docSummary(session.gameDoc);
          session.promptPackage = undefined;
          session.project = undefined;
          render.info("Note: Previously generated prompts and code have been cleared. Please regenerate them.");
        } catch (error) {
          modifySpinner.fail(`Update failed: ${(error as Error).message}`);
        }
        break;
      }

      case "gen-prompts": {
        if (session.modelConfig) {
          const model = createModel(session.modelConfig);
          const engine = new PromptEngine({ model });
          session.promptPackage = await promptsGeneration(session.gameDoc, engine);
        } else {
          session.promptPackage = await promptsGeneration(session.gameDoc, null);
        }
        saveCurrentSession();
        break;
      }

      case "gen-code": {
        if (session.modelConfig) {
          const model = createModel(session.modelConfig);
          const generator = new CodeGenerator({ model });
          const projectDir = session.projectId
            ? require("node:path").join(require("node:os").homedir(), ".layagen", "projects", session.projectId)
            : undefined;
          session.project = await codeGeneration(session.gameDoc, generator, projectDir);
        } else {
          render.warning("No AI model configured. Cannot generate code.");
        }
        saveCurrentSession();
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

            // Auto-save after refinement
            saveCurrentSession();

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
        saveCurrentSession();
        render.success("Project saved!");
        break;
      }

      case "exit":
        running = false;
        // Auto-save on exit
        saveCurrentSession();
        render.success("Project auto-saved. Thanks for using LayaGen AI! Goodbye");
        break;

      default:
        break;
    }
  }
}

function gameDocToMarkdown(doc: any): string {
  const lines: string[] = [];

  lines.push(`# ${doc.name || "未命名游戏"}`);
  lines.push("");
  lines.push(`> ${doc.description || ""}`);
  lines.push("");

  lines.push("## 基本信息");
  lines.push("");
  lines.push(`| 项目 | 内容 |`);
  lines.push(`|------|------|`);
  lines.push(`| 游戏类型 | ${doc.genre || "-"} |`);
  lines.push(`| 维度 | ${doc.dimension || "-"} |`);
  lines.push(`| 目标平台 | ${(doc.targetPlatforms || []).join(", ") || "-"} |`);
  lines.push(`| 预估复杂度 | ${doc.estimatedComplexity || "-"} |`);
  lines.push("");

  if (doc.coreMechanics) {
    lines.push("## 核心玩法");
    lines.push("");
    lines.push(`**输入方式：** ${doc.coreMechanics.input || "-"}`);
    lines.push("");
    lines.push(`**胜利条件：** ${doc.coreMechanics.winCondition || "-"}`);
    lines.push("");
    if (doc.coreMechanics.loseCondition) {
      lines.push(`**失败条件：** ${doc.coreMechanics.loseCondition}`);
      lines.push("");
    }
    if (doc.coreMechanics.scoring) {
      lines.push(`**计分规则：** ${doc.coreMechanics.scoring}`);
      lines.push("");
    }
  }

  if (doc.sceneHierarchy?.length) {
    lines.push("## 场景结构");
    lines.push("");
    for (const scene of doc.sceneHierarchy) {
      lines.push(`### ${scene.name}`);
      if (scene.type) lines.push(`- 类型：${scene.type}`);
      if (scene.children?.length) {
        lines.push("- 子节点：");
        for (const child of scene.children) {
          lines.push(`  - **${child.name}** (${child.type || "unknown"})${child.description ? ": " + child.description : ""}`);
        }
      }
      lines.push("");
    }
  }

  if (doc.resourceRequirements) {
    const res = doc.resourceRequirements;
    lines.push("## 资源需求");
    lines.push("");

    if (res.characters?.length) {
      lines.push(`### 角色 (${res.characters.length})`);
      for (const c of res.characters) {
        lines.push(`- **${c.name}** (${c.type}) — ${c.description || ""}`);
      }
      lines.push("");
    }

    if (res.backgrounds?.length) {
      lines.push(`### 背景 (${res.backgrounds.length})`);
      for (const b of res.backgrounds) {
        lines.push(`- **${b.name}** (${b.type}) — ${b.description || ""}`);
      }
      lines.push("");
    }

    if (res.items?.length) {
      lines.push(`### 道具 (${res.items.length})`);
      for (const item of res.items) {
        lines.push(`- **${item.name}** (${item.type}) — ${item.description || ""}`);
      }
      lines.push("");
    }

    if (res.effects?.length) {
      lines.push(`### 特效 (${res.effects.length})`);
      for (const e of res.effects) {
        lines.push(`- **${e.name}** (${e.type}) — ${e.description || ""}`);
      }
      lines.push("");
    }

    if (res.uiElements?.length) {
      lines.push(`### UI 元素 (${res.uiElements.length})`);
      for (const ui of res.uiElements) {
        lines.push(`- **${ui.name}** (${ui.type}) — ${ui.description || ""}`);
      }
      lines.push("");
    }

    if (res.audio?.length) {
      lines.push(`### 音频 (${res.audio.length})`);
      for (const a of res.audio) {
        lines.push(`- **${a.name}** (${a.type}) — ${a.description || ""}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
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
