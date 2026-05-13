import { generateText, generateObject, type LanguageModel } from "ai";
import {
  type GameDesignDoc,
  type AssetPromptPackage,
  type AssetPrompt,
  type AssetCategory,
  type ArtStyle,
  AssetPromptPackageSchema,
  AssetCategorySchema,
  AssetPromptSchema,
  ArtStyleSchema,
} from "@layagen/shared";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadTemplate(name: string): string {
  try {
    return readFileSync(join(__dirname, "templates", `${name}.md`), "utf-8");
  } catch {
    return `Generate a {{category}} asset prompt for a {{genre}} game in {{style}} style. {{description}}`;
  }
}

export interface PromptEngineOptions {
  model: LanguageModel;
  defaultStyle?: Partial<ArtStyle>;
}

export class PromptEngine {
  private model: LanguageModel;
  private defaultStyle?: Partial<ArtStyle>;

  constructor(options: PromptEngineOptions) {
    this.model = options.model;
    this.defaultStyle = options.defaultStyle;
  }

  async generatePackage(gameDoc: GameDesignDoc): Promise<AssetPromptPackage> {
    const styleBible = await this.generateStyleBible(gameDoc);
    const allPrompts: AssetPrompt[] = [];

    const categories: AssetCategory[] = [
      "character", "background", "item", "effect", "ui"
    ];

    for (const category of categories) {
      const prompts = await this.generateForCategory(gameDoc, category, styleBible);
      allPrompts.push(...prompts);
    }

    const enrichedPrompts = this.applyStyleBible(allPrompts, styleBible);

    const pkg: AssetPromptPackage = {
      gameId: gameDoc.id,
      styleBible: {
        artStyle: styleBible.style,
        colorPalette: styleBible.colorPalette,
        lineQuality: styleBible.lineQuality,
        shading: styleBible.shading,
        mood: styleBible.mood,
        reference: styleBible.reference,
        consistencyRules: [
          "Use consistent art style across all assets",
          `Maintain color palette: ${styleBible.colorPalette.join(", ")}`,
          "Keep proportions and scale uniform",
        ],
      },
      prompts: enrichedPrompts,
      exportFormat: "json",
    };

    return AssetPromptPackageSchema.parse(pkg);
  }

  async generateForCategory(
    gameDoc: GameDesignDoc,
    category: AssetCategory,
    style: ArtStyle
  ): Promise<AssetPrompt[]> {
    const template = loadTemplate(category);
    const resources = this.getResourcesByCategory(gameDoc, category);

    if (resources.length === 0) return [];

    const prompts: AssetPrompt[] = [];

    for (const resource of resources) {
      const prompt = template
        .replace(/\{\{category\}\}/g, category)
        .replace(/\{\{genre\}\}/g, gameDoc.genre)
        .replace(/\{\{style\}\}/g, style.style)
        .replace(/\{\{description\}\}/g, resource.description)
        .replace(/\{\{name\}\}/g, resource.name);

      const { text } = await generateText({
        model: this.model,
        prompt: `${prompt}\n\nGenerate a detailed AI image generation prompt for "${resource.name}" (${resource.description}). Output as JSON with fields: basePrompt, negativePrompt (optional), technicalSpec (with resolution, format, transparent, spriteSheetLayout).`,
      });

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {
          basePrompt: `${resource.name}, ${resource.description}, ${style.style}, game asset`,
          technicalSpec: { resolution: "256x256", format: "PNG", transparent: true },
        };
      }

      prompts.push({
        id: `p-${category}-${resource.id}`,
        category,
        name: resource.name,
        description: resource.description,
        basePrompt: parsed.basePrompt || `${resource.name}, ${resource.description}`,
        negativePrompt: parsed.negativePrompt,
        technicalSpec: {
          resolution: resource.type === "background" ? "1920x1080" : "256x256",
          format: "PNG",
          transparent: resource.type !== "background",
          spriteSheetLayout: resource.type === "sprite_sheet" ? "1x8 horizontal" : undefined,
          ...parsed.technicalSpec,
        },
        style,
      });
    }

    return prompts;
  }

  export(pkg: AssetPromptPackage, format: "json" | "markdown" | "csv"): string {
    switch (format) {
      case "json":
        return JSON.stringify(pkg, null, 2);
      case "markdown":
        return this.exportMarkdown(pkg);
      case "csv":
        return this.exportCSV(pkg);
      default:
        return JSON.stringify(pkg, null, 2);
    }
  }

  async extractStyle(description: string): Promise<ArtStyle> {
    const { text } = await generateText({
      model: this.model,
      prompt: `Extract art style from this game description: "${description}". Output JSON with: style, colorPalette (array of HEX), lineQuality, shading, mood, reference.`,
    });

    try {
      return ArtStyleSchema.parse(JSON.parse(text));
    } catch {
      return {
        style: "cartoon",
        colorPalette: ["#FF6B6B", "#4ECDC4", "#45B7D1"],
      };
    }
  }

  private async generateStyleBible(gameDoc: GameDesignDoc): Promise<ArtStyle> {
    const template = loadTemplate("style-bible");
    const prompt = template
      .replace(/\{\{gameName\}\}/g, gameDoc.name)
      .replace(/\{\{genre\}\}/g, gameDoc.genre)
      .replace(/\{\{dimension\}\}/g, gameDoc.dimension)
      .replace(/\{\{description\}\}/g, gameDoc.description);

    const { text } = await generateText({
      model: this.model,
      prompt,
    });

    try {
      return ArtStyleSchema.parse(JSON.parse(text));
    } catch {
      return {
        style: "cartoon",
        colorPalette: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"],
        lineQuality: "clean outlines, 2-5px thick",
        shading: "flat shading with soft gradients",
        mood: "fun and adventurous",
        reference: "similar to mobile casual games",
        ...this.defaultStyle,
      };
    }
  }

  private applyStyleBible(prompts: AssetPrompt[], styleBible: ArtStyle): AssetPrompt[] {
    const stylePrefix = `${styleBible.style} style, ${styleBible.lineQuality || ""}, ${styleBible.shading || ""}`;
    
    return prompts.map((prompt) => ({
      ...prompt,
      basePrompt: `${stylePrefix}, ${prompt.basePrompt}, consistent game asset style`.replace(/,\s*,/g, ","),
      style: styleBible,
    }));
  }

  private exportMarkdown(pkg: AssetPromptPackage): string {
    const lines = [
      `# Asset Prompt Package: ${pkg.gameId}`,
      "",
      "## Style Bible",
      "",
      `- **Art Style**: ${pkg.styleBible.artStyle}`,
      `- **Color Palette**: ${pkg.styleBible.colorPalette.join(", ")}`,
      `- **Line Quality**: ${pkg.styleBible.lineQuality || "N/A"}`,
      `- **Shading**: ${pkg.styleBible.shading || "N/A"}`,
      `- **Mood**: ${pkg.styleBible.mood || "N/A"}`,
      `- **Reference**: ${pkg.styleBible.reference || "N/A"}`,
      "",
      "## Consistency Rules",
      "",
      ...pkg.styleBible.consistencyRules.map((r) => `- ${r}`),
      "",
      "## Prompts",
      "",
    ];

    for (const prompt of pkg.prompts) {
      lines.push(`### ${prompt.name} (${prompt.category})`);
      lines.push("");
      lines.push(`**Base Prompt:**`);
      lines.push(`\`\`\``);
      lines.push(prompt.basePrompt);
      lines.push(`\`\`\``);
      if (prompt.negativePrompt) {
        lines.push("");
        lines.push(`**Negative Prompt:**`);
        lines.push(`\`\`\``);
        lines.push(prompt.negativePrompt);
        lines.push(`\`\`\``);
      }
      if (prompt.technicalSpec) {
        lines.push("");
        lines.push(`**Technical Spec:**`);
        lines.push(`- Resolution: ${prompt.technicalSpec.resolution || "N/A"}`);
        lines.push(`- Format: ${prompt.technicalSpec.format || "N/A"}`);
        lines.push(`- Transparent: ${prompt.technicalSpec.transparent || false}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  private exportCSV(pkg: AssetPromptPackage): string {
    const headers = ["ID", "Category", "Name", "Description", "BasePrompt", "Resolution", "Format", "Transparent"];
    const rows = pkg.prompts.map((p) => [
      p.id,
      p.category,
      p.name,
      p.description,
      `"${p.basePrompt.replace(/"/g, '""')}"`,
      p.technicalSpec?.resolution || "",
      p.technicalSpec?.format || "",
      p.technicalSpec?.transparent ? "yes" : "no",
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  private getResourcesByCategory(doc: GameDesignDoc, category: AssetCategory) {
    switch (category) {
      case "character":
        return doc.resourceRequirements.characters;
      case "background":
        return doc.resourceRequirements.backgrounds;
      case "item":
        return doc.resourceRequirements.items;
      case "effect":
        return doc.resourceRequirements.effects;
      case "ui":
        return doc.resourceRequirements.uiElements;
      case "audio":
        return doc.resourceRequirements.audio;
      default:
        return [];
    }
  }
}
