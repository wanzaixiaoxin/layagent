import { z } from "zod";

export const GameGenreSchema = z.enum([
  "platformer", "puzzle", "shooter", "rpg", "tower-defense",
  "racing", "fighting", "idle", "roguelike", "card"
]);
export type GameGenre = z.infer<typeof GameGenreSchema>;

export const GameDimensionSchema = z.enum(["2d", "3d"]);
export type GameDimension = z.infer<typeof GameDimensionSchema>;

export const PlatformSchema = z.enum([
  "h5", "wechat-minigame", "bytedance-minigame", "app"
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const ResourceRequirementSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["sprite_sheet", "static_image", "animated", "parallax", "9slice", "audio", "particle"]),
  description: z.string(),
  count: z.number().optional(),
  frames: z.number().optional(),
  layers: z.number().optional(),
});
export type ResourceRequirement = z.infer<typeof ResourceRequirementSchema>;

export const GameDesignDocSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string(),
  description: z.string(),
  genre: GameGenreSchema,
  dimension: GameDimensionSchema.default("2d"),
  targetPlatforms: z.array(PlatformSchema).default(["h5"]),
  coreMechanics: z.object({
    input: z.string(),
    winCondition: z.string(),
    loseCondition: z.string().optional(),
    scoring: z.string().optional(),
  }),
  sceneHierarchy: z.array(z.object({
    name: z.string(),
    type: z.string(),
    children: z.array(z.object({
      name: z.string(),
      type: z.string(),
      description: z.string().optional(),
    })).optional(),
  })),
  resourceRequirements: z.object({
    characters: z.array(ResourceRequirementSchema).default([]),
    backgrounds: z.array(ResourceRequirementSchema).default([]),
    items: z.array(ResourceRequirementSchema).default([]),
    effects: z.array(ResourceRequirementSchema).default([]),
    uiElements: z.array(ResourceRequirementSchema).default([]),
    audio: z.array(ResourceRequirementSchema).default([]),
  }),
  estimatedComplexity: z.enum(["simple", "medium", "complex"]).default("medium"),
});
export type GameDesignDoc = z.infer<typeof GameDesignDocSchema>;
