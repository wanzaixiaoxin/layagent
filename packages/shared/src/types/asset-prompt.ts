import { z } from "zod";

export const AssetCategorySchema = z.enum([
  "character", "background", "item", "effect", "ui", "audio"
]);
export type AssetCategory = z.infer<typeof AssetCategorySchema>;

export const ArtStyleSchema = z.object({
  style: z.string(),
  colorPalette: z.array(z.string()),
  lineQuality: z.string().optional(),
  shading: z.string().optional(),
  mood: z.string().optional(),
  reference: z.string().optional(),
});
export type ArtStyle = z.infer<typeof ArtStyleSchema>;

export const AssetPromptSchema = z.object({
  id: z.string(),
  category: AssetCategorySchema,
  name: z.string(),
  description: z.string(),
  basePrompt: z.string(),
  variations: z.record(z.string()).optional(),
  negativePrompt: z.string().optional(),
  technicalSpec: z.object({
    resolution: z.string().optional(),
    format: z.string().optional(),
    transparent: z.boolean().optional(),
    spriteSheetLayout: z.string().optional(),
  }).optional(),
  style: ArtStyleSchema.optional(),
});
export type AssetPrompt = z.infer<typeof AssetPromptSchema>;

export const AssetPromptPackageSchema = z.object({
  gameId: z.string(),
  styleBible: z.object({
    artStyle: z.string(),
    colorPalette: z.array(z.string()),
    lineQuality: z.string().optional(),
    shading: z.string().optional(),
    mood: z.string().optional(),
    reference: z.string().optional(),
    consistencyRules: z.array(z.string()).default([]),
  }),
  prompts: z.array(AssetPromptSchema),
  exportFormat: z.enum(["json", "markdown", "csv"]).default("json"),
});
export type AssetPromptPackage = z.infer<typeof AssetPromptPackageSchema>;
