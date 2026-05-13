import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { showMainMenu, type MenuAction } from "./prompts/main-menu.js";
import { planningPrompt } from "./prompts/planning.js";
import { promptsGeneration } from "./prompts/prompts-gen.js";
import { codeGeneration } from "./prompts/code-gen.js";
import { render } from "./utils/renderer.js";

interface GameSession {
  gameDoc?: any;
  promptPackage?: any;
  project?: any;
}

const session: GameSession = {};

export async function startInteractiveMode(): Promise<void> {
  // Step 1: Planning
  const description = await planningPrompt();
  
  const spinner = ora("正在规划游戏设计...").start();
  await new Promise((r) => setTimeout(r, 2000));

  session.gameDoc = {
    id: crypto.randomUUID(),
    name: "忍者猫咪跑酷",
    description: description,
    genre: "platformer",
    dimension: "2d",
    targetPlatforms: ["h5"],
    coreMechanics: {
      input: "点击跳跃/二段跳",
      winCondition: "到达终点",
      loseCondition: "掉落或碰撞障碍物",
      scoring: "收集金币得分",
    },
    sceneHierarchy: [
      {
        name: "BackgroundLayer",
        type: "Sprite",
        children: [
          { name: "bg_far", type: "Sprite", description: "远景山脉" },
          { name: "bg_near", type: "Sprite", description: "近景树木" },
        ],
      },
      {
        name: "GameLayer",
        type: "Sprite",
        children: [
          { name: "player", type: "Sprite", description: "忍者猫主角" },
          { name: "obstacles", type: "Sprite", description: "障碍物容器" },
          { name: "items", type: "Sprite", description: "道具容器" },
        ],
      },
      {
        name: "UILayer",
        type: "Sprite",
        children: [
          { name: "score", type: "Text", description: "分数显示" },
          { name: "pause_btn", type: "Button", description: "暂停按钮" },
        ],
      },
    ],
    resourceRequirements: {
      characters: [
        { id: "player_cat", name: "忍者猫", type: "sprite_sheet", description: "一只穿着忍者服装的橘猫，大眼睛，Q版比例", frames: 8 },
      ],
      backgrounds: [
        { id: "bg_forest", name: "森林背景", type: "parallax", description: "奇幻森林背景，远景/中景/近景三层视差", layers: 3 },
      ],
      items: [
        { id: "coin", name: "金币", type: "static_image", description: "金色金币，旋转动画" },
        { id: "power_up", name: "加速道具", type: "animated", description: "闪电图标，使用后速度提升3秒" },
      ],
      effects: [],
      uiElements: [
        { id: "btn_start", name: "开始按钮", type: "9slice", description: "绿色圆形开始按钮" },
        { id: "panel_pause", name: "暂停面板", type: "9slice", description: "半透明暂停面板" },
        { id: "score_label", name: "分数标签", type: "static_image", description: "金色分数显示标签" },
      ],
      audio: [
        { id: "bgm", name: "背景音乐", type: "audio", description: "轻快的跑酷音乐" },
        { id: "sfx_jump", name: "跳跃音效", type: "audio", description: "跳跃时的轻快节奏音" },
      ],
    },
    estimatedComplexity: "medium",
  };

  spinner.succeed("游戏设计完成！");
  render.docSummary(session.gameDoc);

  // Step 2: Main Menu Loop
  let running = true;
  while (running) {
    const action = await showMainMenu();

    switch (action) {
      case "view-doc":
        render.info(JSON.stringify(session.gameDoc, null, 2));
        break;

      case "gen-prompts":
        session.promptPackage = await promptsGeneration(session.gameDoc);
        break;

      case "gen-code":
        session.project = await codeGeneration(session.gameDoc);
        break;

      case "preview":
        render.warning("MCP 预览功能需要安装 LayaAir-MCP 插件");
        break;

      case "refine":
        const { feedback } = await inquirer.prompt([
          {
            type: "input",
            name: "feedback",
            message: "请输入优化建议:",
          },
        ]);
        render.info(`收到反馈: ${feedback}`);
        break;

      case "save": {
        const outputDir = "./output";
        mkdirSync(outputDir, { recursive: true });
        if (session.gameDoc) {
          writeFileSync(`${outputDir}/game-doc.json`, JSON.stringify(session.gameDoc, null, 2));
          render.success(`设计文档已保存至 ${outputDir}/game-doc.json`);
        }
        if (session.promptPackage) {
          writeFileSync(`${outputDir}/prompts.json`, JSON.stringify(session.promptPackage, null, 2));
          render.success(`提示词包已保存至 ${outputDir}/prompts.json`);
        }
        break;
      }

      case "exit":
        running = false;
        render.success("感谢使用 LayaGen AI！再见 👋");
        break;

      default:
        break;
    }
  }
}
