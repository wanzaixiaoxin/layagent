import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createModel, type ModelConfig } from "@layagen/core";
import { generateText } from "ai";
import { render } from "../utils/renderer.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CodeChange {
  file: string;
  original: string;
  modified: string;
}

interface AIResponse {
  message: string;
  changes: CodeChange[];
}

const SYSTEM_PROMPT = `You are an expert LayaAir TypeScript game developer. Your task is to modify game code based on user requests.

You will be given:
1. The current source files of a LayaAir game project
2. The conversation history
3. The user's latest request

You must respond with a JSON object in the following format (and ONLY the JSON, no other text):
{
  "message": "A friendly response to the user explaining what you changed",
  "changes": [
    {
      "file": "relative/file/path.ts",
      "original": "the exact code snippet in the current file to replace",
      "modified": "the new code snippet to replace it with"
    }
  ]
}

CRITICAL Requirements:
- The "original" field must be an EXACT match (including whitespace) of a UNIQUE code snippet in the current file
- Make sure "original" is long enough to be unique within the file (at least 3-5 lines of code)
- If a method needs modification, include the entire method signature and body as "original"
- If no changes are needed, return an empty changes array
- Maintain proper LayaAir TypeScript syntax throughout
- Output ONLY the JSON, no markdown fences, no explanations`;

function readProjectFiles(projectDir: string): Map<string, string> {
  const files = new Map<string, string>();

  function walkDir(dir: string, baseRel: string): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const relPath = baseRel ? join(baseRel, entry) : entry;

        if (statSync(fullPath).isDirectory()) {
          walkDir(fullPath, relPath);
        } else if (entry.endsWith(".ts") || entry.endsWith(".html") || entry.endsWith(".json")) {
          try {
            const content = readFileSync(fullPath, "utf-8");
            files.set(relPath, content);
          } catch {
            /* skip unreadable files */
          }
        }
      }
    } catch {
      /* skip unreadable directories */
    }
  }

  // Walk scripts and scenes directories
  const scriptsDir = join(projectDir, "src", "scripts");
  const scenesDir = join(projectDir, "src", "scenes");

  walkDir(scriptsDir, "src/scripts");
  walkDir(scenesDir, "src/scenes");

  // Also read root files
  for (const file of ["index.html", "project.json"]) {
    const fullPath = join(projectDir, file);
    if (existsSync(fullPath)) {
      try {
        files.set(file, readFileSync(fullPath, "utf-8"));
      } catch {
        /* skip */
      }
    }
  }

  return files;
}

function buildContext(files: Map<string, string>): string {
  const parts: string[] = ["Current project source files:"];

  for (const [filePath, content] of files) {
    parts.push(`\n=== FILE: ${filePath} ===`);
    parts.push(content);
  }

  return parts.join("\n");
}

function applyChanges(projectDir: string, changes: CodeChange[]): { applied: number; failed: { file: string; error: string }[] } {
  let applied = 0;
  const failed: { file: string; error: string }[] = [];

  for (const change of changes) {
    const filePath = join(projectDir, change.file);

    if (!existsSync(filePath)) {
      failed.push({ file: change.file, error: "File not found" });
      continue;
    }

    try {
      const content = readFileSync(filePath, "utf-8");

      if (!content.includes(change.original)) {
        failed.push({ file: change.file, error: "Original text not found in file (mismatch)" });
        continue;
      }

      // Check for multiple occurrences
      const firstIndex = content.indexOf(change.original);
      const lastIndex = content.lastIndexOf(change.original);
      if (firstIndex !== lastIndex) {
        failed.push({ file: change.file, error: "Original text appears multiple times (ambiguous)" });
        continue;
      }

      const newContent = content.replace(change.original, change.modified);
      writeFileSync(filePath, newContent, "utf-8");
      applied++;
    } catch (error) {
      failed.push({ file: change.file, error: (error as Error).message });
    }
  }

  return { applied, failed };
}

function buildChatContext(files: Map<string, string>, history: ChatMessage[]): string {
  const parts: string[] = [];

  parts.push(buildContext(files));
  parts.push("");
  parts.push("---");
  parts.push("Conversation history:");

  for (const msg of history) {
    const role = msg.role === "user" ? "User" : "Assistant";
    parts.push(`\n${role}: ${msg.content}`);
  }

  return parts.join("\n");
}

export async function startCodeChat(projectDir: string, modelConfig: ModelConfig): Promise<void> {
  // Read current project files
  const files = readProjectFiles(projectDir);

  if (files.size === 0) {
    render.warning("No source files found in the project directory.");
    render.info("Please generate code first via 'Generate LayaAir Code' option.");
    return;
  }

  render.title("Code Modification Chat");
  render.info("You can now chat with the AI to modify the generated code.");
  render.info(`Found ${files.size} files in the project.\n`);

  // Show file list
  console.log(chalk.gray("Current files:"));
  for (const [filePath] of files) {
    console.log(chalk.gray(`  - ${filePath}`));
  }
  console.log("");
  console.log(chalk.gray("Type your modification requests. Enter 'exit' or 'quit' to return to main menu.\n"));

  const history: ChatMessage[] = [];
  let running = true;

  while (running) {
    const { userMessage } = await inquirer.prompt([
      {
        type: "input",
        name: "userMessage",
        message: chalk.cyan("You: "),
      },
    ]);

    const msg = userMessage.trim();

    if (!msg) continue;

    if (msg.toLowerCase() === "exit" || msg.toLowerCase() === "quit") {
      running = false;
      render.success("Exited code chat mode.");
      break;
    }

    // Re-read latest files (may have been modified)
    const currentFiles = readProjectFiles(projectDir);
    const context = buildChatContext(currentFiles, history);

    const spinner = ora("AI is analyzing and modifying code...").start();

    try {
      const model = createModel(modelConfig);
      const prompt = `${context}\n\n---\nUser's latest request: ${msg}\n\nRespond with JSON only.`;

      const { text } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt,
        maxTokens: 4096,
      });

      // Parse JSON from response
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

      let response: AIResponse;
      try {
        response = JSON.parse(jsonStr) as AIResponse;
      } catch {
        spinner.fail("AI returned an invalid response format. Please try again.");
        render.info("Raw response (first 500 chars):");
        console.log(chalk.gray(text.slice(0, 500)));
        continue;
      }

      // Validate response structure
      if (!response.message && (!response.changes || response.changes.length === 0)) {
        spinner.fail("AI response missing required fields.");
        render.info("Raw response:");
        console.log(chalk.gray(jsonStr.slice(0, 500)));
        continue;
      }

      // Apply changes
      if (response.changes && response.changes.length > 0) {
        const result = applyChanges(projectDir, response.changes);
        spinner.succeed(`AI applied ${result.applied} change(s)`);

        // Show conversation response
        if (response.message) {
          console.log(chalk.green(`\nAI: ${response.message}\n`));
        }

        // Show applied changes summary
        console.log(chalk.gray("Modified files:"));
        const appliedFiles = new Set(
          response.changes
            .filter((_, i) => i < result.applied) // approximate
            .map((c) => c.file)
        );
        for (const file of appliedFiles) {
          console.log(chalk.green(`  - ${file}`));
        }

        // Show failures
        if (result.failed.length > 0) {
          render.warning("Some changes could not be applied:");
          for (const f of result.failed) {
            console.log(chalk.yellow(`  - ${f.file}: ${f.error}`));
          }
        }
      } else {
        spinner.succeed("AI response received.");
        if (response.message) {
          console.log(chalk.green(`\nAI: ${response.message}\n`));
        }
      }

      // Add to history
      history.push({ role: "user", content: msg });
      if (response.message) {
        history.push({ role: "assistant", content: response.message });
      }

      // Keep history manageable (last 10 messages)
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }
    } catch (error) {
      spinner.fail(`Error: ${(error as Error).message}`);
    }
  }
}
