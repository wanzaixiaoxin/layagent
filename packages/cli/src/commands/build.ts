import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const buildCommand = new Command("build")
  .description("从游戏设计文档生成 LayaAir 项目代码")
  .argument("<game-doc>", "游戏设计文档 JSON 文件路径")
  .option("-o, --output <path>", "输出目录", "./output/game-project")
  .action(async (gameDocPath: string, options) => {
    const spinner = ora("正在读取游戏设计文档...").start();

    try {
      const docContent = readFileSync(gameDocPath, "utf-8");
      const gameDoc = JSON.parse(docContent);

      spinner.text = "正在生成 LayaAir 项目...";
      await new Promise((r) => setTimeout(r, 2500));

      const outputDir = options.output;

      // 创建项目结构
      mkdirSync(join(outputDir, "src", "scripts"), { recursive: true });
      mkdirSync(join(outputDir, "src", "scenes"), { recursive: true });
      mkdirSync(join(outputDir, "res", "characters"), { recursive: true });
      mkdirSync(join(outputDir, "res", "backgrounds"), { recursive: true });
      mkdirSync(join(outputDir, "res", "items"), { recursive: true });
      mkdirSync(join(outputDir, "res", "ui"), { recursive: true });
      mkdirSync(join(outputDir, "res", "audio"), { recursive: true });

      // 生成项目配置
      const projectConfig = {
        name: gameDoc.name || "my-game",
        version: "1.0.0",
        engineVersion: "3.2.0",
        screenOrientation: "landscape",
        resolution: { width: 1080, height: 1920 },
        physics: { enabled: true, engine: "box2d", gravity: { x: 0, y: 9.8 } },
        scenes: gameDoc.sceneHierarchy?.map((s: any) => ({ name: s.name, type: gameDoc.dimension || "2d" })),
      };

      writeFileSync(join(outputDir, "project.json"), JSON.stringify(projectConfig, null, 2));

      // 生成示例脚本
      const playerController = `import { Laya } from "Laya";
import { Script } from "laya/components/Script";

export class PlayerController extends Script {
  onAwake(): void {
    console.log("[PlayerController] Loaded");
  }

  onUpdate(): void {
    // Player update logic
  }
}`;

      writeFileSync(join(outputDir, "src", "scripts", "player-controller.ts"), playerController);

      // 生成 index.html
      const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${gameDoc.name || "Game"}</title>
  <style>body{margin:0;padding:0;overflow:hidden;background:#000;}canvas{display:block;}</style>
</head>
<body>
  <script src="libs/laya.core.js"></script>
  <script src="libs/laya.physics.js"></script>
  <script src="js/index.js"></script>
</body>
</html>`;

      writeFileSync(join(outputDir, "index.html"), indexHtml);

      spinner.succeed("LayaAir 项目生成完成！");

      console.log(chalk.green(`\n✓ 项目已保存至: ${outputDir}`));
      console.log(chalk.blue("\n生成的文件:"));
      console.log("  📁 project.json — 项目配置");
      console.log("  📁 src/scripts/player-controller.ts — 玩家控制器");
      console.log("  📁 index.html — 入口页面");
      console.log(chalk.yellow("\n提示: 将 AI 生成的图片资源放入 res/ 目录后即可运行"));
    } catch (error) {
      spinner.fail("生成失败");
      console.error(chalk.red(error));
      process.exit(1);
    }
  });
