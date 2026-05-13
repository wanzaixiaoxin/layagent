import { z } from "zod";

export const LayaProjectConfigSchema = z.object({
  name: z.string(),
  version: z.string().default("1.0.0"),
  engineVersion: z.string().default("3.2.0"),
  screenOrientation: z.enum(["landscape", "portrait"]).default("landscape"),
  resolution: z.object({
    width: z.number().default(1080),
    height: z.number().default(1920),
  }),
  physics: z.object({
    enabled: z.boolean().default(true),
    engine: z.enum(["box2d", "bullet"]).default("box2d"),
    gravity: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 9.8 }),
  }).optional(),
  scenes: z.array(z.object({
    name: z.string(),
    type: z.enum(["2d", "3d"]).default("2d"),
  })),
});
export type LayaProjectConfig = z.infer<typeof LayaProjectConfigSchema>;

export interface GeneratedProject {
  config: LayaProjectConfig;
  scripts: Array<{ filename: string; content: string }>;
  scenes: Array<{ filename: string; content: string }>;
  resources: Array<{ path: string; placeholder: boolean }>;
  indexHtml: string;
}
