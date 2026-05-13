import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PromptEngine, createModel } from "@layagen/core";
import { getModelConfig } from "../config/index.js";

export const promptsCommand = new Command("prompts")
  .description("Generate asset creation prompt package from game design document")
  .argument("<game-doc>", "Game design document JSON file path")
  .option("-o, --output <path>", "Output file path")
  .option("-f, --format <format>", "Output format: json, markdown, csv", "json")
  .option("--mock", "Use mock data (no AI call)")
  .action(async (gameDocPath: string, options) => {
    const spinner = ora("Reading game design document...").start();

    try {
      const docContent = readFileSync(gameDocPath, "utf-8");
      const gameDoc = JSON.parse(docContent);

      let promptPackage: any;

      if (options.mock) {
        // Mock mode
        spinner.text = "Generating prompts (mock mode)...";
        await new Promise((r) => setTimeout(r, 1000));
        promptPackage = createMockPromptPackage(gameDoc);
        spinner.succeed("Asset creation prompt package generated! (mock mode)");
      } else {
        // Real AI call
        const modelConfig = getModelConfig();
        const model = createModel(modelConfig);
        const engine = new PromptEngine({ model });

        spinner.text = "Generating asset creation prompts...";
        promptPackage = await engine.generatePackage(gameDoc);
        spinner.succeed("Asset creation prompt package generated!");
      }

      const outputPath = options.output || `./output/${gameDoc.name || "game"}-prompts.${options.format === "markdown" ? "md" : options.format}`;
      mkdirSync(dirname(outputPath), { recursive: true });

      let content: string;
      if (options.format === "markdown") {
        content = generateMarkdown(promptPackage);
      } else if (options.format === "csv") {
        content = generateCSV(promptPackage);
      } else {
        content = JSON.stringify(promptPackage, null, 2);
      }

      writeFileSync(outputPath, content);
      console.log(chalk.green(`\nPrompt package saved to: ${outputPath}`));
      console.log(chalk.blue(`\nGenerated ${promptPackage.prompts?.length || 0} resource prompts`));
      console.log(chalk.yellow(`\nNext step: layagen build ${gameDocPath}`));
    } catch (error) {
      spinner.fail("Generation failed");
      console.error(chalk.red((error as Error).message));
      console.log(chalk.gray("\nTip: Use --mock flag for offline testing"));
      console.log(chalk.gray("      Or run layagen config to configure AI model"));
      process.exit(1);
    }
  });

function createMockPromptPackage(gameDoc: any) {
  return {
    gameId: gameDoc.id || "unknown",
    styleBible: {
      artStyle: "Cartoon Style",
      colorPalette: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"],
      lineQuality: "Clean outlines, 2-5px thick",
      shading: "Flat shading with soft gradients",
      mood: "Fun and adventurous",
      reference: "Similar to Battle Cats simple cute style",
      consistencyRules: [
        "All characters use 2-head chibi proportions",
        "Consistent use of rounded corners and soft curves",
        "Color saturation controlled at 70-85%",
      ],
    },
    prompts: [
      {
        id: "p1",
        category: "character",
        name: "player_cat",
        description: "Ninja cat protagonist",
        basePrompt: "A cute chibi orange cat wearing ninja outfit, big expressive eyes, 2-head proportion, cartoon game character, full body, standing pose, clean thick outline, flat vibrant colors, transparent background, game asset, 2D sprite",
        negativePrompt: "realistic, 3d render, photorealistic, complex background",
        technicalSpec: { resolution: "256x256", format: "PNG", transparent: true, spriteSheetLayout: "1x8 horizontal" },
      },
      {
        id: "p2",
        category: "background",
        name: "bg_forest",
        description: "Forest background",
        basePrompt: "Fantasy forest parallax background layer, distant trees silhouette, soft blue-purple gradient sky, mysterious atmosphere, cartoon game style, flat design with subtle depth, seamless horizontal tiling, 16:9 aspect ratio",
        technicalSpec: { resolution: "1920x1080", format: "PNG", transparent: false },
      },
      {
        id: "p3",
        category: "item",
        name: "coin",
        description: "Gold coin",
        basePrompt: "Golden coin game item, shiny metallic surface, star sparkle effect, cartoon style, flat design, clean outline, transparent background, game asset",
        technicalSpec: { resolution: "128x128", format: "PNG", transparent: true },
      },
      {
        id: "p4",
        category: "ui",
        name: "btn_start",
        description: "Start button",
        basePrompt: "Game UI button, rounded rectangle, green gradient, white text, glossy bevel, cartoon style, 9-slice scalable design, transparent background, game UI asset",
        technicalSpec: { resolution: "256x128", format: "PNG", transparent: true },
      },
    ],
    exportFormat: "json",
  };
}

function generateMarkdown(pkg: any): string {
  const lines = [
    `# Asset Prompt Package: ${pkg.gameId}`,
    "",
    "## Style Bible",
    "",
    `- **Art Style**: ${pkg.styleBible.artStyle}`,
    `- **Color Palette**: ${pkg.styleBible.colorPalette.join(", ")}`,
    `- **Line Quality**: ${pkg.styleBible.lineQuality}`,
    `- **Shading**: ${pkg.styleBible.shading}`,
    `- **Mood**: ${pkg.styleBible.mood}`,
    `- **Reference**: ${pkg.styleBible.reference}`,
    "",
    "## Consistency Rules",
    "",
    ...pkg.styleBible.consistencyRules.map((r: string) => `- ${r}`),
    "",
    "## Prompts",
    "",
  ];
  for (const p of pkg.prompts) {
    lines.push(`### ${p.name} (${p.category})`);
    lines.push("");
    lines.push(`**Base Prompt:**`);
    lines.push("\`\`\`");
    lines.push(p.basePrompt);
    lines.push("\`\`\`");
    lines.push("");
    if (p.negativePrompt) {
      lines.push(`**Negative Prompt:**`);
      lines.push("\`\`\`");
      lines.push(p.negativePrompt);
      lines.push("\`\`\`");
      lines.push("");
    }
    if (p.technicalSpec) {
      lines.push(`**Technical Spec:**`);
      lines.push(`- Resolution: ${p.technicalSpec.resolution || "N/A"}`);
      lines.push(`- Format: ${p.technicalSpec.format || "N/A"}`);
      lines.push(`- Transparent: ${p.technicalSpec.transparent || false}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

function generateCSV(pkg: any): string {
  const headers = ["ID", "Category", "Name", "Description", "BasePrompt", "Resolution", "Format", "Transparent"];
  const rows = pkg.prompts.map((p: any) => [
    p.id, p.category, p.name, p.description,
    `"${p.basePrompt.replace(/"/g, '""')}"`,
    p.technicalSpec?.resolution || "",
    p.technicalSpec?.format || "",
    p.technicalSpec?.transparent ? "yes" : "no",
  ]);
  return [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
}
