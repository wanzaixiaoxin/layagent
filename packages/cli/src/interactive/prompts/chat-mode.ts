import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { generateText } from "ai";
import { GamePlanner, PromptEngine, CodeGenerator, createModel, type ModelConfig } from "@layagen/core";
import { planningPrompt } from "./planning.js";
import { promptsGeneration } from "./prompts-gen.js";
import { codeGeneration } from "./code-gen.js";
import { startCodeChat } from "./code-chat.js";
import { render } from "../utils/renderer.js";
import { saveProjectData, type ProjectData } from "../../projects/index.js";

// ───── Types ─────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIAction {
  type: "none" | "show-doc" | "modify-doc" | "gen-prompts" | "gen-code" | "modify-code" | "save";
  params?: Record<string, unknown>;
}

interface AIResponse {
  message: string;
  action?: AIAction;
}

export interface GameSession {
  projectId?: string;
  projectData?: ProjectData;
  gameDoc?: unknown;
  promptPackage?: unknown;
  project?: unknown;
  modelConfig?: ModelConfig;
  userDescription?: string;
  projectDir?: string;
}

// ───── Helpers ─────

function saveSession(session: GameSession): void {
  if (session.projectId) {
    saveProjectData(session.projectId, {
      meta: session.projectData?.meta,
      gameDoc: session.gameDoc,
      promptPackage: session.promptPackage,
      projectConfig: session.project,
    });
  }
}

function buildProjectState(session: GameSession): string {
  const lines: string[] = [
    `Project: ${session.projectData?.meta?.name || "Untitled"}`,
    `Description: ${session.userDescription || session.projectData?.meta?.description || "N/A"}`,
    `Has Game Design Document: ${session.gameDoc ? "Yes" : "No"}`,
    `Has Asset Prompts: ${session.promptPackage ? "Yes" : "No"}`,
    `Has Generated Code: ${session.project ? "Yes" : "No"}`,
  ];
  return lines.join("\n");
}

function formatProjectName(session: GameSession): string {
  return (
    session.projectData?.meta?.name ||
    (typeof session.gameDoc === "object" && session.gameDoc !== null
      ? (session.gameDoc as Record<string, unknown>).name as string
      : undefined) ||
    "Untitled Project"
  );
}

// ───── AI System Prompt ─────

const SYSTEM_PROMPT = `You are an AI assistant for LayaGen, a tool that generates LayaAir H5 games from natural language descriptions.

Your role is to help the user create and modify their games through conversation.
Analyze the user's intent and decide whether they want to perform an action or just chat.

AVAILABLE ACTIONS (set the action field in your JSON response to trigger them):
- "show-doc": Show the full game design document in the terminal. Trigger when user asks to see/view the design.
- "modify-doc": Modify the game design document. params: { feedback: "user's requested changes" }
    Trigger when user wants to change the game concept, add/edit mechanics, scenes, or resources.
- "gen-prompts": Generate AI image generation prompts based on the current design document.
    Trigger when user asks to generate prompts or asset prompts.
- "gen-code": Generate LayaAir game code from the design document.
    Trigger when user asks to generate code or build the game.
- "modify-code": Enter code modification mode for iterative code changes.
    Trigger when user wants to modify or tweak the generated game code.
- "save": Save the current project state.
- "none": Just have a conversation. Use when user is asking questions or making general comments.

RESPONSE FORMAT (respond ONLY with this JSON, no other text):
{
  "message": "Your friendly and informative conversational response",
  "action": {
    "type": "one of the actions above",
    "params": {} // only needed for modify-doc: { "feedback": "..." }
  }
}

RULES:
1. If user asks to view or see the design, use "show-doc"
2. If user wants to change the game or add new features (and no code exists yet), use "modify-doc"
3. If user asks to generate code, use "gen-code"
4. If user asks to modify existing code, use "modify-code"
5. If user just chats or asks questions, use "none"
6. Always be helpful, concise, and explain what you're doing in Chinese
7. Output ONLY valid JSON`;

// ───── AI Response Parsing ─────

function parseAIResponse(text: string): AIResponse | null {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    const parsed = JSON.parse(jsonStr) as AIResponse;
    if (!parsed.message) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ───── Action Handlers ─────

async function handleShowDoc(session: GameSession): Promise<void> {
  if (!session.gameDoc) {
    render.warning("No game design document available.");
    return;
  }
  console.log(chalk.cyan("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
  console.log(gameDocToMarkdown(session.gameDoc));
  console.log(chalk.cyan("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
}

async function handleModifyDoc(session: GameSession, feedback: string): Promise<void> {
  if (!session.gameDoc) {
    render.warning("No game design document to modify.");
    return;
  }

  const model = session.modelConfig ? createModel(session.modelConfig) : null;
  const spinner = ora("Updating game design...").start();

  try {
    if (model) {
      const planner = new GamePlanner({ model });
      session.gameDoc = await planner.refine(session.gameDoc as any, feedback);
      spinner.succeed("Game design updated!");
    } else {
      await new Promise((r) => setTimeout(r, 1500));
      spinner.succeed("Game design updated! (mock mode)");
    }

    saveSession(session);
    render.docSummary(session.gameDoc as any);
    session.promptPackage = undefined;
    session.project = undefined;
    render.info("Note: Previously generated prompts and code have been cleared. Please regenerate them.");
  } catch (error) {
    spinner.fail(`Update failed: ${(error as Error).message}`);
  }
}

async function handleGenPrompts(session: GameSession): Promise<void> {
  if (!session.gameDoc) {
    render.warning("No game design document available. Generate a design first.");
    return;
  }

  if (session.modelConfig) {
    const model = createModel(session.modelConfig);
    const engine = new PromptEngine({ model });
    session.promptPackage = await promptsGeneration(session.gameDoc, engine);
  } else {
    session.promptPackage = await promptsGeneration(session.gameDoc, null);
  }
  saveSession(session);
}

async function handleGenCode(session: GameSession): Promise<void> {
  if (!session.gameDoc) {
    render.warning("No game design document available. Generate a design first.");
    return;
  }
  if (!session.modelConfig) {
    render.warning("AI model not configured. Cannot generate code.");
    return;
  }

  const model = createModel(session.modelConfig);
  const generator = new CodeGenerator({ model });
  const projectDir = session.projectId
    ? require("node:path").join(require("node:os").homedir(), ".layagen", "projects", session.projectId)
    : undefined;
  session.project = await codeGeneration(session.gameDoc, generator, projectDir);
  if (typeof session.project === "object" && session.project !== null) {
    const proj = session.project as Record<string, unknown>;
    if (proj.path) {
      session.projectDir = proj.path as string;
    }
  }
  saveSession(session);
}

async function handleModifyCode(session: GameSession): Promise<void> {
  const chatDir = session.projectDir ||
    (typeof session.project === "object" && session.project !== null
      ? (session.project as Record<string, unknown>).path as string
      : undefined);

  if (!chatDir) {
    render.warning("No generated code found. Please generate code first.");
    return;
  }
  if (!require("node:fs").existsSync(require("node:path").join(chatDir, "src"))) {
    render.warning("Project directory not found or code files missing.");
    return;
  }
  if (!session.modelConfig) {
    render.warning("AI model not configured.");
    return;
  }

  await startCodeChat(chatDir, session.modelConfig);
}

async function handleSave(session: GameSession): Promise<void> {
  saveSession(session);
  render.success("Project saved!");
}

// ───── Slash Commands ─────

interface SlashCommand {
  name: string;
  aliases: string[];
  description: string;
  execute: (session: GameSession) => Promise<void>;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "view",
    aliases: ["doc"],
    description: "查看游戏设计文档",
    execute: handleShowDoc,
  },
  {
    name: "modify",
    aliases: ["desc"],
    description: "修改游戏描述",
    execute: async (session) => {
      const newDescription = await planningPrompt();
      if (!newDescription) return;

      session.userDescription = newDescription;
      if (session.projectData?.meta) {
        session.projectData.meta.description = newDescription;
      }

      await handleModifyDoc(session, `The user wants to change the game description. New description: "${newDescription}". Please update the existing design document to align with this new description while preserving as much existing structure as possible.`);
    },
  },
  {
    name: "prompts",
    aliases: [],
    description: "生成资产生成提示词",
    execute: handleGenPrompts,
  },
  {
    name: "code",
    aliases: [],
    description: "生成 LayaAir 代码",
    execute: handleGenCode,
  },
  {
    name: "refine",
    aliases: [],
    description: "优化游戏设计",
    execute: async (session) => {
      if (!session.gameDoc) {
        render.warning("No game design document to refine.");
        return;
      }
      const { feedback } = await inquirer.prompt([
        {
          type: "input",
          name: "feedback",
          message: "Enter refinement feedback:",
        },
      ]);
      await handleModifyDoc(session, feedback);
    },
  },
  {
    name: "preview",
    aliases: [],
    description: "预览 (需要 MCP)",
    execute: async () => {
      render.warning("MCP preview requires LayaAir-MCP plugin installation");
    },
  },
  {
    name: "save",
    aliases: [],
    description: "保存项目",
    execute: handleSave,
  },
  {
    name: "help",
    aliases: ["?"],
    description: "显示帮助信息",
    execute: async () => {
      showHelp();
    },
  },
  {
    name: "exit",
    aliases: ["quit"],
    description: "退出",
    execute: async () => {
      // Handled in main loop
    },
  },
];

function showHelp(): void {
  console.log(chalk.bold.cyan("\n━━━ 可用命令 ━━━\n"));
  for (const cmd of SLASH_COMMANDS) {
    if (cmd.name === "exit") continue;
    const aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.map((a) => `/${a}`).join(", ")})` : "";
    console.log(`  ${chalk.bold(`/${cmd.name}`)}${chalk.gray(aliases)}`);
    console.log(`    ${cmd.description}`);
    console.log();
  }
  console.log(chalk.gray(`  ${chalk.bold("/exit")} — 退出`));
  console.log();
}

// ───── Slash Command Resolver ─────

async function handleSlashInput(session: GameSession, input: string): Promise<boolean> {
  // Returns true if should exit chat mode
  const parts = input.slice(1).trim().split(/\s+/);
  const cmdName = parts[0].toLowerCase();

  if (!cmdName) {
    // Just "/" → show command list
    return showCommandPicker(session);
  }

  // Exact match
  const exactMatch = SLASH_COMMANDS.find(
    (c) => c.name === cmdName || c.aliases.includes(cmdName)
  );
  if (exactMatch) {
    if (exactMatch.name === "exit" || exactMatch.name === "quit") {
      return true;
    }
    await exactMatch.execute(session);
    return false;
  }

  // Fuzzy match (starts with)
  const fuzzyMatches = SLASH_COMMANDS.filter(
    (c) => c.name.startsWith(cmdName) || c.aliases.some((a) => a.startsWith(cmdName))
  );

  if (fuzzyMatches.length === 1) {
    if (fuzzyMatches[0].name === "exit" || fuzzyMatches[0].name === "quit") {
      return true;
    }
    await fuzzyMatches[0].execute(session);
    return false;
  }

  if (fuzzyMatches.length > 1) {
    return showCommandPicker(session, fuzzyMatches);
  }

  // No match
  console.log(chalk.yellow(`\nUnknown command: /${cmdName}`));
  console.log(chalk.gray("Type / to see available commands, or /help for details.\n"));
  return false;
}

async function showCommandPicker(
  session: GameSession,
  commands?: SlashCommand[]
): Promise<boolean> {
  const choices = (commands || SLASH_COMMANDS)
    .filter((c) => c.name !== "exit")
    .map((c) => ({
      name: `${c.name.padEnd(10)} ${c.description}`,
      value: c.name,
      short: c.name,
    }));

  choices.push({ name: "exit".padEnd(10) + " 退出", value: "exit", short: "exit" });

  const { selected } = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: "选择命令:",
      choices,
      pageSize: 15,
    },
  ]);

  if (selected === "exit") return true;

  const cmd = (commands || SLASH_COMMANDS).find((c) => c.name === selected);
  if (cmd) {
    await cmd.execute(session);
  }
  return false;
}

// ───── Natural Language Processing ─────

async function processNaturalLanguage(
  session: GameSession,
  message: string,
  history: ChatMessage[]
): Promise<void> {
  if (!session.modelConfig) {
    render.warning("AI model not configured. Use / commands for operations.");
    console.log(
      chalk.gray(
        "Tip: Run 'layagen config' in a separate terminal to set up your AI model, or use slash commands.\n"
      )
    );
    return;
  }

  const model = createModel(session.modelConfig);
  const state = buildProjectState(session);

  // Build context
  const historyBlock = history
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = [
    `CURRENT PROJECT STATE:\n${state}`,
    "",
    historyBlock ? `CONVERSATION HISTORY:\n${historyBlock}` : "",
    "",
    `User: ${message}`,
    "",
    "Respond with JSON only.",
  ]
    .filter(Boolean)
    .join("\n");

  const spinner = ora("Thinking...").start();

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      maxTokens: 2048,
    });

    const response = parseAIResponse(text);

    if (!response) {
      spinner.fail("AI returned an invalid response. Please try again.");
      console.log(chalk.gray("Raw response (first 300 chars):"), text.slice(0, 300));
      return;
    }

    spinner.succeed("AI response received.");
    console.log(chalk.green(`\n${response.message}\n`));

    // Update history
    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: response.message });

    // Execute action if any
    if (response.action && response.action.type !== "none") {
      await executeAction(session, response.action);
    }
  } catch (error) {
    spinner.fail(`Error: ${(error as Error).message}`);
  }
}

async function executeAction(session: GameSession, action: AIAction): Promise<void> {
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `AI 建议执行操作: ${action.type}，是否执行？`,
      default: true,
    },
  ]);

  if (!confirm) {
    render.info("Action cancelled.");
    return;
  }

  switch (action.type) {
    case "show-doc":
      await handleShowDoc(session);
      break;
    case "modify-doc": {
      const feedback =
        typeof action.params?.feedback === "string"
          ? action.params.feedback
          : "Please refine the game design based on the conversation above.";
      await handleModifyDoc(session, feedback);
      break;
    }
    case "gen-prompts":
      await handleGenPrompts(session);
      break;
    case "gen-code":
      await handleGenCode(session);
      break;
    case "modify-code":
      await handleModifyCode(session);
      break;
    case "save":
      await handleSave(session);
      break;
  }
}

// ───── Welcome Message ─────

function showWelcome(session: GameSession): void {
  console.log(chalk.bold.cyan("\n━━━ 对话模式 ━━━\n"));

  const name = formatProjectName(session);
  console.log(chalk.green(`欢迎！项目 "${name}" 已就绪。`));
  console.log(chalk.gray("你可以直接描述游戏需求，或输入 / 查看可用命令。"));
  console.log(chalk.gray("例如: '添加一个金币收集系统' 或 '让角色可以二段跳'"));

  if (session.gameDoc) {
    render.docSummary(session.gameDoc);
  } else {
    render.info("尚未生成游戏设计文档。描述你的游戏想法，AI 将为你创建。");
  }

  console.log();
}

// ───── Main Entry ─────

export async function startChatMode(session: GameSession): Promise<void> {
  showWelcome(session);

  const history: ChatMessage[] = [];
  let running = true;

  while (running) {
    const { input } = await inquirer.prompt([
      {
        type: "input",
        name: "input",
        message: chalk.cyan("You: "),
      },
    ]);

    const message = (input || "").trim();
    if (!message) continue;

    if (message.startsWith("/")) {
      const shouldExit = await handleSlashInput(session, message);
      if (shouldExit) {
        running = false;
      }
    } else {
      await processNaturalLanguage(session, message, history);
    }
  }

  // Save on exit
  saveSession(session);
  render.success("Project auto-saved. Thanks for using LayaGen AI! Goodbye");
}

// ───── GameDoc to Markdown (copied from index.ts) ─────

function gameDocToMarkdown(doc: unknown): string {
  const d = doc as Record<string, unknown>;
  const lines: string[] = [];

  lines.push(`# ${d.name || "Untitled Game"}`);
  lines.push("");
  lines.push(`> ${d.description || ""}`);
  lines.push("");

  lines.push("## Basic Info");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|------|-------|`);
  lines.push(`| Genre | ${d.genre || "-"} |`);
  lines.push(`| Dimension | ${d.dimension || "-"} |`);
  lines.push(`| Platforms | ${((d.targetPlatforms as string[]) || []).join(", ") || "-"} |`);
  lines.push(`| Complexity | ${d.estimatedComplexity || "-"} |`);
  lines.push("");

  const mech = d.coreMechanics as Record<string, unknown> | undefined;
  if (mech) {
    lines.push("## Core Mechanics");
    lines.push("");
    lines.push(`**Input:** ${mech.input || "-"}`);
    lines.push("");
    lines.push(`**Win Condition:** ${mech.winCondition || "-"}`);
    lines.push("");
    if (mech.loseCondition) {
      lines.push(`**Lose Condition:** ${mech.loseCondition}`);
      lines.push("");
    }
    if (mech.scoring) {
      lines.push(`**Scoring:** ${mech.scoring}`);
      lines.push("");
    }
  }

  const scenes = d.sceneHierarchy as Array<Record<string, unknown>> | undefined;
  if (scenes?.length) {
    lines.push("## Scene Hierarchy");
    lines.push("");
    for (const scene of scenes) {
      lines.push(`### ${scene.name}`);
      if (scene.type) lines.push(`- Type: ${scene.type}`);
      const children = scene.children as Array<Record<string, unknown>> | undefined;
      if (children?.length) {
        lines.push("- Children:");
        for (const child of children) {
          lines.push(
            `  - **${child.name}** (${child.type || "unknown"})${
              child.description ? ": " + child.description : ""
            }`
          );
        }
      }
      lines.push("");
    }
  }

  const res = d.resourceRequirements as Record<string, unknown> | undefined;
  if (res) {
    lines.push("## Resource Requirements");
    lines.push("");

    const categories: Array<{ key: string; label: string }> = [
      { key: "characters", label: "Characters" },
      { key: "backgrounds", label: "Backgrounds" },
      { key: "items", label: "Items" },
      { key: "effects", label: "Effects" },
      { key: "uiElements", label: "UI Elements" },
      { key: "audio", label: "Audio" },
    ];

    for (const cat of categories) {
      const items = res[cat.key] as Array<Record<string, unknown>> | undefined;
      if (items?.length) {
        lines.push(`### ${cat.label} (${items.length})`);
        for (const item of items) {
          lines.push(`- **${item.name}** (${item.type}) — ${item.description || ""}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}
