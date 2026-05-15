import ora from "ora";
import { GamePlanner, createModel } from "@layagen/core";
import { getModelConfig } from "../config/index.js";
import { projectSelectPrompt } from "./prompts/project-select.js";
import { startChatMode, type GameSession } from "./prompts/chat-mode.js";
import { render } from "./utils/renderer.js";
import {
  createProject,
  loadProject,
  saveProjectData,
} from "../projects/index.js";

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

  // Step 1: Enter Chat Mode
  render.success("Entering chat mode. Type / for commands, or just chat naturally.");
  await startChatMode(session);
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
