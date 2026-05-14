import ora from "ora";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { render } from "../utils/renderer.js";

export async function codeGeneration(gameDoc: any, generator: any, projectDir?: string): Promise<any> {
  render.title("Generate LayaAir Project Code");

  const spinner = ora("Generating project structure and code with AI...").start();

  let project: any;

  try {
    if (generator) {
      project = await generator.generateProject(gameDoc);
      spinner.succeed("LayaAir project generated! (AI powered)");
    } else {
      spinner.fail("No AI model available for code generation");
      return null;
    }
  } catch (error) {
    spinner.fail(`Generation failed: ${(error as Error).message}`);
    return null;
  }

  // Determine output directory
  const outputDir = projectDir || `./output/${slugify(gameDoc.name || "my-game")}`;

  // Create directory structure
  mkdirSync(join(outputDir, "src", "scripts"), { recursive: true });
  mkdirSync(join(outputDir, "src", "scenes"), { recursive: true });
  mkdirSync(join(outputDir, "res", "characters"), { recursive: true });
  mkdirSync(join(outputDir, "res", "backgrounds"), { recursive: true });
  mkdirSync(join(outputDir, "res", "items"), { recursive: true });
  mkdirSync(join(outputDir, "res", "ui"), { recursive: true });
  mkdirSync(join(outputDir, "res", "audio"), { recursive: true });
  mkdirSync(join(outputDir, "libs"), { recursive: true });

  // Write project config
  if (project.config) {
    writeFileSync(join(outputDir, "project.json"), JSON.stringify(project.config, null, 2));
  }

  // Write scripts
  if (project.scripts) {
    for (const script of project.scripts) {
      const scriptPath = join(outputDir, "src", script.filename);
      mkdirSync(dirname(scriptPath), { recursive: true });
      writeFileSync(scriptPath, script.content);
    }
  }

  // Write scenes
  if (project.scenes) {
    for (const scene of project.scenes) {
      writeFileSync(join(outputDir, "src", "scenes", scene.filename), scene.content);
    }
  }

  // Write index.html
  if (project.indexHtml) {
    writeFileSync(join(outputDir, "index.html"), project.indexHtml);
  }

  // Write resource list
  if (project.resources) {
    writeFileSync(join(outputDir, "resources.json"), JSON.stringify(project.resources, null, 2));
  }

  spinner.succeed("LayaAir project saved!");

  const files = [
    "project.json",
    "index.html",
    ...(project.scripts?.map((s: any) => `src/${s.filename}`) || []),
    ...(project.scenes?.map((s: any) => `src/scenes/${s.filename}`) || []),
  ];

  render.fileList(files.map((f: string) => `${outputDir}/${f}`));

  render.info("Tip: After generating images using layagen prompts in Midjourney/SD,");
  render.info("      place them in res/ directories, then open the project in LayaAir IDE.");

  return { name: gameDoc.name, path: outputDir, files, config: project.config };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
}
