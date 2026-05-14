import { generateText, type LanguageModel } from "ai";
import {
  type GameDesignDoc,
  GameDesignDocSchema,
  type GameGenre,
} from "@layagen/shared";
import { zodToJsonSchema } from "zod-to-json-schema";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSystemPrompt(): string {
  try {
    return readFileSync(join(__dirname, "prompts", "plan.md"), "utf-8");
  } catch {
    return `You are an expert game designer. Convert the user's natural language description into a detailed game design document for a LayaAir H5 game. Output valid JSON matching the GameDesignDoc schema. Be specific with resource descriptions as they will become image generation prompts.`;
  }
}

export interface PlannerOptions {
  model: LanguageModel;
}

export interface PlanOptions {
  genre?: GameGenre;
  complexity?: "simple" | "medium" | "complex";
  previousDoc?: Partial<GameDesignDoc>;
}

export class GamePlanner {
  private model: LanguageModel;
  private systemPrompt: string;

  constructor(options: PlannerOptions) {
    this.model = options.model;
    this.systemPrompt = loadSystemPrompt();
  }

  async plan(input: string, options: PlanOptions = {}): Promise<GameDesignDoc> {
    const prompt = this.buildPrompt(input, options);
    
    const json = await this.generateJson(prompt);
    const doc = GameDesignDocSchema.parse(json);
    if (!doc.id) {
      doc.id = crypto.randomUUID();
    }
    return doc;
  }

  async refine(doc: GameDesignDoc, feedback: string): Promise<GameDesignDoc> {
    // Use compact JSON to reduce token usage
    const compactDoc = JSON.stringify(doc);
    const prompt = `Here is the current game design document (compact JSON):\n${compactDoc}\n\nThe user has the following feedback for refinement:\n${feedback}\n\nPlease update the design document based on this feedback while maintaining the same structure and schema. Output valid JSON only.`;

    const json = await this.generateJson(prompt);
    return GameDesignDocSchema.parse(json);
  }

  summarize(doc: GameDesignDoc): string {
    const totalResources =
      doc.resourceRequirements.characters.length +
      doc.resourceRequirements.backgrounds.length +
      doc.resourceRequirements.items.length +
      doc.resourceRequirements.effects.length +
      doc.resourceRequirements.uiElements.length +
      doc.resourceRequirements.audio.length;

    return [
      `游戏名称: ${doc.name}`,
      `类型: ${doc.genre} (${doc.dimension})`,
      `目标平台: ${doc.targetPlatforms.join(", ")}`,
      `复杂度: ${doc.estimatedComplexity}`,
      `场景数: ${doc.sceneHierarchy.length}`,
      `资源总数: ${totalResources}`,
      `  - 角色: ${doc.resourceRequirements.characters.length}`,
      `  - 背景: ${doc.resourceRequirements.backgrounds.length}`,
      `  - 道具: ${doc.resourceRequirements.items.length}`,
      `  - 特效: ${doc.resourceRequirements.effects.length}`,
      `  - UI: ${doc.resourceRequirements.uiElements.length}`,
      `  - 音频: ${doc.resourceRequirements.audio.length}`,
    ].join("\n");
  }

  private async generateJson(prompt: string): Promise<unknown> {
    const jsonSchema = zodToJsonSchema(GameDesignDocSchema, "GameDesignDoc");
    const schemaDescription = JSON.stringify(jsonSchema, null, 2);
    const fullPrompt = `${prompt}\n\nYou must output ONLY a valid JSON object that strictly follows this JSON Schema. Do not wrap in markdown code blocks. Do not include any explanatory text before or after the JSON. All fields marked as "required" must be present. Use only the allowed enum values where specified.\n\nJSON Schema:\n${schemaDescription}`;

    const { text } = await generateText({
      model: this.model,
      system: this.systemPrompt,
      prompt: fullPrompt,
    });

    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(`Failed to parse AI response as JSON: ${(error as Error).message}\nResponse: ${text.slice(0, 500)}`);
    }
  }

  private buildPrompt(input: string, options: PlanOptions): string {
    const parts = [`Create a game design document based on this description:\n${input}`];
    
    if (options.genre) {
      parts.push(`The game genre should be: ${options.genre}`);
    }
    if (options.complexity) {
      parts.push(`Target complexity level: ${options.complexity}`);
    }
    if (options.previousDoc) {
      parts.push(`Previous design (refine from this):\n${JSON.stringify(options.previousDoc, null, 2)}`);
    }

    parts.push(`\nRemember:\n1. Design appropriate scene hierarchy for the game type\n2. List all required resources with detailed descriptions\n3. Define core mechanics (input, win/lose conditions)\n4. Consider mobile touch input as primary\n5. Resource descriptions will become image generation prompts - be specific!`);

    return parts.join("\n");
  }
}
