import inquirer from "inquirer";
import ora from "ora";
import { writeFileSync, mkdirSync } from "node:fs";
import { render } from "../utils/renderer.js";

export async function promptsGeneration(gameDoc: any, engine: any): Promise<any> {
  render.title("Generate Asset Creation Prompts");

  const spinner = ora("Analyzing game style and generating prompts...").start();

  let promptPackage: any;

  try {
    if (engine) {
      // Real AI call
      promptPackage = await engine.generatePackage(gameDoc);
      spinner.succeed(`Generated ${promptPackage.prompts.length} asset prompts! (AI powered)`);
    } else {
      // Mock mode
      await new Promise((r) => setTimeout(r, 2500));
      promptPackage = createMockPromptPackage(gameDoc);
      spinner.succeed(`Generated ${promptPackage.prompts.length} asset prompts! (mock mode)`);
    }
  } catch (error) {
    spinner.fail(`Generation failed: ${(error as Error).message}`);
    render.info("Falling back to mock mode...");
    await new Promise((r) => setTimeout(r, 1000));
    promptPackage = createMockPromptPackage(gameDoc);
  }

  const { format } = await inquirer.prompt([
    {
      type: "list",
      name: "format",
      message: "Select export format:",
      choices: [
        { name: "JSON", value: "json" },
        { name: "Markdown", value: "md" },
        { name: "CSV", value: "csv" },
      ],
      default: "json",
    },
  ]);

  const outputDir = "./output";
  mkdirSync(outputDir, { recursive: true });

  const ext = format === "md" ? "md" : format;
  const outputPath = `${outputDir}/asset-prompts.${ext}`;

  if (format === "md") {
    writeFileSync(outputPath, generateMarkdown(promptPackage));
  } else if (format === "csv") {
    writeFileSync(outputPath, generateCSV(promptPackage));
  } else {
    writeFileSync(outputPath, JSON.stringify(promptPackage, null, 2));
  }

  render.success(`Prompt package saved to ${outputPath}`);
  render.promptSummary(promptPackage);

  return promptPackage;
}

function createMockPromptPackage(gameDoc: any) {
  return {
    gameId: gameDoc.id,
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
        id: "p-player_cat",
        category: "character",
        name: "Ninja Cat Protagonist",
        description: "Orange cat in ninja outfit",
        basePrompt: "A cute chibi orange cat wearing ninja outfit, big expressive eyes, 2-head proportion, cartoon game character, full body, standing pose, clean thick outline, flat vibrant colors, transparent background, game asset, 2D sprite, 256x256 pixels",
        variations: {
          run: "running animation pose, dynamic action, legs extended",
          jump: "jumping pose, mid-air, excited expression, ears perked up",
          hurt: "hurt pose, dizzy spiral eyes, bandages on head, sad expression",
        },
        negativePrompt: "realistic, 3d render, photorealistic, complex background",
        technicalSpec: { resolution: "256x256", format: "PNG", transparent: true, spriteSheetLayout: "1x8 horizontal" },
      },
      {
        id: "p-bg_forest",
        category: "background",
        name: "Forest Background",
        description: "Fantasy forest three-layer parallax background",
        basePrompt: "Fantasy forest parallax background, distant purple mountains silhouette, soft gradient sky blue to pink, tall stylized trees with rounded canopies, floating magical particles, cartoon game style, flat vector design with subtle depth, seamless horizontal tiling, 16:9 aspect ratio, 1920x1080",
        technicalSpec: { resolution: "1920x1080", format: "PNG", transparent: false },
      },
      {
        id: "p-coin",
        category: "item",
        name: "Coin",
        description: "Collectible gold coin",
        basePrompt: "Golden coin game item, shiny metallic gold surface, embossed star symbol center, subtle rotation blur, sparkle highlight, cartoon style, flat design, clean thick outline, transparent background, game asset, 128x128 pixels",
        technicalSpec: { resolution: "128x128", format: "PNG", transparent: true },
      },
      {
        id: "p-power_up",
        category: "item",
        name: "Speed Boost",
        description: "Lightning speed boost item",
        basePrompt: "Speed boost power-up item, glowing yellow lightning bolt icon, electric spark effects around edges, bright glow aura, cartoon style, flat design, clean outline, transparent background, game asset, 128x128 pixels",
        technicalSpec: { resolution: "128x128", format: "PNG", transparent: true },
      },
      {
        id: "p-btn_start",
        category: "ui",
        name: "Start Button",
        description: "Green circular start button",
        basePrompt: "Game UI start button, large rounded circle shape, bright green gradient fill, white play triangle icon center, glossy bevel effect, soft drop shadow, cartoon style, 9-slice scalable design, transparent background, game UI asset, 256x256 pixels",
        technicalSpec: { resolution: "256x256", format: "PNG", transparent: true },
      },
      {
        id: "p-panel_pause",
        category: "ui",
        name: "Pause Panel",
        description: "Semi-transparent pause panel",
        basePrompt: "Game UI pause panel overlay, rounded rectangle, dark translucent background 70% opacity, clean border frame, title text area at top, button area at bottom, cartoon style, 9-slice scalable, transparent background, game UI asset, 800x600 pixels",
        technicalSpec: { resolution: "800x600", format: "PNG", transparent: true },
      },
    ],
  };
}

function generateMarkdown(pkg: any): string {
  const lines = [
    `# Asset Prompt Package: ${pkg.gameId}`,
    ``,
    `## Style Bible`,
    ``,
    `| Property | Value |`,
    `|------|-----|`,
    `| Art Style | ${pkg.styleBible.artStyle} |`,
    `| Color Palette | ${pkg.styleBible.colorPalette.join(", ")} |`,
    `| Line Quality | ${pkg.styleBible.lineQuality} |`,
    `| Shading | ${pkg.styleBible.shading} |`,
    `| Mood | ${pkg.styleBible.mood} |`,
    `| Reference | ${pkg.styleBible.reference} |`,
    ``,
    `## Consistency Rules`,
    ``,
    ...pkg.styleBible.consistencyRules.map((r: string) => `- ${r}`),
    ``,
    `## Prompts (${pkg.prompts.length})`,
    ``,
  ];

  for (const p of pkg.prompts) {
    lines.push(`### ${p.name} (${p.category})`);
    lines.push("");
    lines.push(`**Description:** ${p.description}`);
    lines.push("");
    lines.push(`**Base Prompt:**`);
    lines.push("```");
    lines.push(p.basePrompt);
    lines.push("```");
    if (p.negativePrompt) {
      lines.push("");
      lines.push(`**Negative Prompt:** ${p.negativePrompt}`);
    }
    if (p.variations) {
      lines.push("");
      lines.push(`**Variations:**`);
      for (const [key, val] of Object.entries(p.variations)) {
        lines.push(`- ${key}: ${val}`);
      }
    }
    lines.push("");
    lines.push(`**Technical Spec:** ${p.technicalSpec.resolution} / ${p.technicalSpec.format} / Transparent: ${p.technicalSpec.transparent}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function generateCSV(pkg: any): string {
  const headers = ["ID", "Category", "Name", "Description", "BasePrompt", "Resolution", "Format", "Transparent"];
  const rows = pkg.prompts.map((p: any) => [
    p.id, p.category, p.name, p.description,
    `"${p.basePrompt.replace(/"/g, '""')}"`,
    p.technicalSpec.resolution, p.technicalSpec.format,
    p.technicalSpec.transparent ? "yes" : "no",
  ]);
  return [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
}
