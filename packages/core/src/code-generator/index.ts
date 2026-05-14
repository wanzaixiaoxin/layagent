import { generateText, type LanguageModel } from "ai";
import {
  type GameDesignDoc,
  type LayaProjectConfig,
  type GeneratedProject,
  LayaProjectConfigSchema,
  slugify,
} from "@layagen/shared";

export interface CodeGeneratorOptions {
  model: LanguageModel;
}

export class CodeGenerator {
  private model: LanguageModel;

  constructor(options: CodeGeneratorOptions) {
    this.model = options.model;
  }

  async generateProject(gameDoc: GameDesignDoc): Promise<GeneratedProject> {
    const config = this.generateProjectConfig(gameDoc);
    const scripts = await this.generateAllScripts(gameDoc);
    const scenes = await this.generateAllSceneScripts(gameDoc);
    const resources = this.generateResourceList(gameDoc);
    const indexHtml = this.generateIndexHtml(gameDoc);

    return {
      config,
      scripts: [...scripts, ...scenes],
      scenes: this.generateSceneConfigs(gameDoc),
      resources,
      indexHtml,
    };
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
    const gameSummary = this.buildGameSummary(doc);
    const scriptSpecs = this.inferScriptSpecs(doc);

    // Generate scripts in parallel
    const scriptPromises = scriptSpecs.map(async (spec) => {
      const content = await this.generateScriptWithAI(gameSummary, spec);
      return { filename: `${spec.id}.ts`, content };
    });

    return Promise.all(scriptPromises);
  }

  private async generateAllSceneScripts(doc: GameDesignDoc) {
    const gameSummary = this.buildGameSummary(doc);

    const scenePromises = doc.sceneHierarchy.map(async (scene) => {
      const content = await this.generateSceneScriptWithAI(gameSummary, scene);
      return { filename: `scene-${slugify(scene.name)}.ts`, content };
    });

    return Promise.all(scenePromises);
  }

  private async generateScriptWithAI(gameSummary: string, spec: ScriptSpec): Promise<string> {
    const prompt = `You are an expert LayaAir TypeScript game developer.

Game Context:
${gameSummary}

Your Task:
Write a complete, production-ready TypeScript script for LayaAir engine.

Script Details:
- Script Name: ${spec.name}
- File: ${spec.id}.ts
- Purpose: ${spec.purpose}
- Key Responsibilities: ${spec.responsibilities.join(", ")}

Requirements:
1. Use proper LayaAir imports: \`import { Laya } from "Laya"\`, \`import { Script } from "laya/components/Script"\`, etc.
2. Extend Laya.Script or appropriate base class
3. Include @property decorators for configurable fields
4. Implement meaningful game logic (not just console.log)
5. Include lifecycle methods: onAwake, onEnable, onUpdate, onDisable as needed
6. Add JSDoc comments for public methods
7. Use TypeScript with proper types
8. The code should be runnable without modifications

Output ONLY the TypeScript code, no markdown fences, no explanations.`;

    const { text } = await generateText({
      model: this.model,
      prompt,
      maxTokens: 2048,
    });

    return this.extractCode(text);
  }

  private async generateSceneScriptWithAI(gameSummary: string, scene: any): Promise<string> {
    const childrenDesc = scene.children?.map((c: any) => `- ${c.name} (${c.type})${c.description ? `: ${c.description}` : ""}`).join("\n") || "None";

    const prompt = `You are an expert LayaAir TypeScript game developer.

Game Context:
${gameSummary}

Your Task:
Write a complete scene controller script for LayaAir.

Scene Details:
- Scene Name: ${scene.name}
- Type: ${scene.type || "2d"}
- Child Elements:
${childrenDesc}

Requirements:
1. Import: \`import { Laya } from "Laya"\`, \`import { Script } from "laya/components/Script"\`
2. Extend Laya.Script
3. In onAwake/onEnable: initialize the scene, find child nodes by name, set up event listeners
4. Handle scene-specific logic (UI updates, spawn managers, etc.)
5. Clean up in onDisable
6. Output ONLY TypeScript code, no markdown, no explanations

Scene Controller Class Name: ${scene.name}Scene`;

    const { text } = await generateText({
      model: this.model,
      prompt,
      maxTokens: 2048,
    });

    return this.extractCode(text);
  }

  private buildGameSummary(doc: GameDesignDoc): string {
    const lines = [
      `Game: ${doc.name}`,
      `Genre: ${doc.genre}`,
      `Dimension: ${doc.dimension}`,
      `Description: ${doc.description}`,
      "",
      "Core Mechanics:",
      `- Input: ${doc.coreMechanics.input}`,
      `- Win: ${doc.coreMechanics.winCondition}`,
      doc.coreMechanics.loseCondition ? `- Lose: ${doc.coreMechanics.loseCondition}` : "",
      doc.coreMechanics.scoring ? `- Scoring: ${doc.coreMechanics.scoring}` : "",
      "",
      "Scenes:",
      ...doc.sceneHierarchy.map((s) => `  - ${s.name} (${s.type})`),
      "",
      "Resources:",
      `  - Characters: ${doc.resourceRequirements.characters.map((c) => c.name).join(", ")}`,
      `  - Backgrounds: ${doc.resourceRequirements.backgrounds.map((b) => b.name).join(", ")}`,
      `  - Items: ${doc.resourceRequirements.items.map((i) => i.name).join(", ")}`,
      `  - Effects: ${doc.resourceRequirements.effects.map((e) => e.name).join(", ")}`,
      `  - UI: ${doc.resourceRequirements.uiElements.map((u) => u.name).join(", ")}`,
      `  - Audio: ${doc.resourceRequirements.audio.map((a) => a.name).join(", ")}`,
    ];
    return lines.filter(Boolean).join("\n");
  }

  private inferScriptSpecs(doc: GameDesignDoc): ScriptSpec[] {
    const specs: ScriptSpec[] = [];

    // Game Manager is always needed
    specs.push({
      id: "game-manager",
      name: "GameManager",
      purpose: "Manage overall game state, score, lives, game loop, and scene transitions",
      responsibilities: ["Track score and game state", "Handle win/lose conditions", "Manage scene transitions", "Coordinate between systems"],
    });

    // Input/Player controller if game has player interaction
    if (doc.coreMechanics.input && !doc.coreMechanics.input.includes("idle") && !doc.coreMechanics.input.includes("auto")) {
      specs.push({
        id: "player-controller",
        name: "PlayerController",
        purpose: "Handle player input and control the main playable character or interaction",
        responsibilities: ["Process touch/mouse/keyboard input", "Move player character", "Handle interactions"],
      });
    }

    // Item/Collection system if there are items
    if (doc.resourceRequirements.items.length > 0) {
      specs.push({
        id: "item-manager",
        name: "ItemManager",
        purpose: "Manage collectible items, spawning, and collection logic",
        responsibilities: ["Spawn items", "Handle collection events", "Update inventory/collection state"],
      });
    }

    // Character behavior for each character type
    if (doc.resourceRequirements.characters.length > 0) {
      specs.push({
        id: "character-behavior",
        name: "CharacterBehavior",
        purpose: "Handle character AI, animations, and interactions",
        responsibilities: ["Character state machine", "Animation control", "AI behavior"],
      });
    }

    // UI Manager
    if (doc.resourceRequirements.uiElements.length > 0) {
      specs.push({
        id: "ui-manager",
        name: "UIManager",
        purpose: "Manage all UI elements, HUD, menus, and user interface interactions",
        responsibilities: ["Update HUD", "Handle button clicks", "Show/hide panels", "Update score/lives display"],
      });
    }

    // Audio Manager
    if (doc.resourceRequirements.audio.length > 0) {
      specs.push({
        id: "audio-manager",
        name: "AudioManager",
        purpose: "Manage background music and sound effects",
        responsibilities: ["Play BGM", "Play SFX", "Volume control"],
      });
    }

    // Effects/Particle system
    if (doc.resourceRequirements.effects.length > 0) {
      specs.push({
        id: "effect-manager",
        name: "EffectManager",
        purpose: "Manage visual effects and particle systems",
        responsibilities: ["Spawn effects", "Play particle animations", "Clean up effects"],
      });
    }

    return specs;
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
<html lang="zh-CN">
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

  private extractCode(text: string): string {
    // Remove markdown code fences if present
    const match = text.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
    if (match) {
      return match[1].trim();
    }
    return text.trim();
  }
}

interface ScriptSpec {
  id: string;
  name: string;
  purpose: string;
  responsibilities: string[];
}
