import type { LanguageModel } from "ai";
import {
  type GameDesignDoc,
  type LayaProjectConfig,
  type GeneratedProject,
  LayaProjectConfigSchema,
  slugify,
  interpolateTemplate,
} from "@layagen/shared";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadTemplate(name: string): string {
  try {
    return readFileSync(join(__dirname, "templates", `${name}.ts`), "utf-8");
  } catch {
    return "";
  }
}

function loadJsonTemplate(name: string): Record<string, unknown> {
  try {
    const content = readFileSync(join(__dirname, "templates", `${name}.json`), "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export interface CodeGeneratorOptions {
  model: LanguageModel;
  templatesDir?: string;
}

export class CodeGenerator {
  private model: LanguageModel;

  constructor(options: CodeGeneratorOptions) {
    this.model = options.model;
  }

  async generateProject(gameDoc: GameDesignDoc): Promise<GeneratedProject> {
    const config = this.generateProjectConfig(gameDoc);
    const scripts = await this.generateAllScripts(gameDoc);
    const scenes = this.generateSceneConfigs(gameDoc);
    const resources = this.generateResourceList(gameDoc);
    const indexHtml = this.generateIndexHtml(gameDoc);

    return {
      config,
      scripts,
      scenes,
      resources,
      indexHtml,
    };
  }

  async generateScript(doc: GameDesignDoc, scriptName: string): Promise<string> {
    const template = loadTemplate(scriptName);
    if (template) {
      return interpolateTemplate(template, {
        gameName: doc.name,
        genre: doc.genre,
        description: doc.description,
      });
    }
    return this.generateScriptFallback(doc, scriptName);
  }

  generateSceneConfig(doc: GameDesignDoc): Array<{ filename: string; content: string }> {
    return this.generateSceneConfigs(doc);
  }

  generateProjectConfig(doc: GameDesignDoc): LayaProjectConfig {
    return LayaProjectConfigSchema.parse({
      name: slugify(doc.name),
      engineVersion: "3.2.0",
      screenOrientation: doc.dimension === "2d" ? "landscape" : "landscape",
      resolution: { width: 1080, height: 1920 },
      physics: {
        enabled: true,
        engine: "box2d",
        gravity: { x: 0, y: 9.8 },
      },
      scenes: doc.sceneHierarchy.map((s) => ({
        name: s.name,
        type: doc.dimension as "2d" | "3d",
      })),
    });
  }

  private async generateAllScripts(doc: GameDesignDoc) {
    const scriptNames = [
      "player-controller",
      "game-manager",
      "item-collector",
      "obstacle",
      "camera-follow",
    ];

    const scripts = [];
    for (const name of scriptNames) {
      const content = await this.generateScript(doc, name);
      scripts.push({ filename: `${name}.ts`, content });
    }

    for (const scene of doc.sceneHierarchy) {
      const content = this.generateSceneScript(doc, scene.name);
      scripts.push({ filename: `scene-${slugify(scene.name)}.ts`, content });
    }

    return scripts;
  }

  private generateSceneConfigs(doc: GameDesignDoc) {
    return doc.sceneHierarchy.map((scene) => ({
      filename: `${slugify(scene.name)}.ls`,
      content: JSON.stringify(
        {
          name: scene.name,
          type: doc.dimension,
          children: scene.children?.map((child) => ({
            name: child.name,
            type: child.type,
          })) || [],
        },
        null,
        2
      ),
    }));
  }

  private generateResourceList(doc: GameDesignDoc) {
    const resources: Array<{ path: string; placeholder: boolean }> = [];
    
    for (const char of doc.resourceRequirements.characters) {
      resources.push({ path: `res/characters/${char.id}.png`, placeholder: true });
    }
    for (const bg of doc.resourceRequirements.backgrounds) {
      resources.push({ path: `res/backgrounds/${bg.id}.png`, placeholder: true });
    }
    for (const item of doc.resourceRequirements.items) {
      resources.push({ path: `res/items/${item.id}.png`, placeholder: true });
    }
    for (const ui of doc.resourceRequirements.uiElements) {
      resources.push({ path: `res/ui/${ui.id}.png`, placeholder: true });
    }
    for (const audio of doc.resourceRequirements.audio) {
      resources.push({ path: `res/audio/${audio.id}.mp3`, placeholder: true });
    }

    return resources;
  }

  private generateIndexHtml(doc: GameDesignDoc): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${doc.name}</title>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script src="libs/laya.core.js"></script>
  <script src="libs/laya.ui.js"></script>
  <script src="libs/laya.physics.js"></script>
  <script src="js/index.js"></script>
</body>
</html>`;
  }

  private generateSceneScript(doc: GameDesignDoc, sceneName: string): string {
    return `import { Laya } from "Laya";
import { Scene } from "laya/display/Scene";

/**
 * ${sceneName} - Auto-generated scene script for ${doc.name}
 */
export class ${sceneName}Scene extends Laya.Script {
  
  onAwake(): void {
    console.log("[${sceneName}] Scene loaded");
  }

  onEnable(): void {
    // Scene initialization
  }

  onDisable(): void {
    // Cleanup
  }
}`;
  }

  private async generateScriptFallback(doc: GameDesignDoc, scriptName: string): Promise<string> {
    return `import { Laya } from "Laya";
import { Script } from "Laya/components/Script";

/**
 * ${scriptName} - Auto-generated for ${doc.name}
 * Game: ${doc.genre} | ${doc.description.slice(0, 50)}...
 */
export class ${scriptName.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("")} extends Laya.Script {
  
  /** @property {string} description Component description */
  public description: string = "Auto-generated component";

  onAwake(): void {
    console.log("[${scriptName}] Component loaded");
  }

  onUpdate(): void {
    // Update logic
  }
}`;
  }
}
