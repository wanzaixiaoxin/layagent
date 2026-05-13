import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const promptsCommand = new Command("prompts")
  .description("从游戏设计文档生成资产生成提示词包")
  .argument("<game-doc>", "游戏设计文档 JSON 文件路径")
  .option("-o, --output <path>", "输出文件路径")
  .option("-f, --format <format>", "输出格式: json, markdown, csv", "json")
  .action(async (gameDocPath: string, options) => {
    const spinner = ora("正在读取游戏设计文档...").start();

    try {
      const docContent = readFileSync(gameDocPath, "utf-8");
      const gameDoc = JSON.parse(docContent);

      spinner.text = "正在生成资产生成提示词...";
      await new Promise((r) => setTimeout(r, 2000));

      // 模拟提示词生成
      const promptPackage = {
        gameId: gameDoc.id || "unknown",
        styleBible: {
          artStyle: "卡通风格 (Cartoon Style)",
          colorPalette: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"],
          lineQuality: "清晰轮廓线，2-5px描边",
          shading: "扁平化渐变，柔和的体积感",
          mood: "轻松愉快，充满冒险感",
          reference: "类似《猫咪大战争》的简洁可爱风格",
          consistencyRules: [
            "所有角色使用2头身Q版比例",
            "统一使用圆角和柔和曲线",
            "色彩饱和度控制在70-85%",
          ],
        },
        prompts: [
          {
            id: "p1",
            category: "character",
            name: "player_cat",
            description: "忍者猫主角",
            basePrompt: "A cute chibi orange cat wearing ninja outfit, big expressive eyes, 2-head proportion, cartoon game character, full body, standing pose, clean thick outline, flat vibrant colors, transparent background, game asset, 2D sprite",
            variations: { run: "running pose", jump: "jumping pose" },
            technicalSpec: { resolution: "256x256", format: "PNG", transparent: true, spriteSheetLayout: "1x8 horizontal" },
          },
          {
            id: "p2",
            category: "background",
            name: "bg_forest",
            description: "森林背景",
            basePrompt: "Fantasy forest parallax background layer, distant trees silhouette, soft blue-purple gradient sky, mysterious atmosphere, cartoon game style, flat design with subtle depth, seamless horizontal tiling, 16:9 aspect ratio",
            technicalSpec: { resolution: "1920x1080", format: "PNG", transparent: false },
          },
          {
            id: "p3",
            category: "item",
            name: "coin",
            description: "金币",
            basePrompt: "Golden coin game item, shiny metallic surface, star sparkle effect, cartoon style, flat design, clean outline, transparent background, game asset",
            technicalSpec: { resolution: "128x128", format: "PNG", transparent: true },
          },
          {
            id: "p4",
            category: "ui",
            name: "btn_start",
            description: "开始按钮",
            basePrompt: "Game UI button, rounded rectangle, green gradient, white text, glossy bevel, cartoon style, 9-slice scalable design, transparent background, game UI asset",
            technicalSpec: { resolution: "256x128", format: "PNG", transparent: true },
          },
        ],
      };

      spinner.succeed("资产生成提示词包生成完成！");

      const outputPath = options.output || `./output/${gameDoc.name || "game"}-prompts.${options.format === "markdown" ? "md" : options.format}`;
      mkdirSync(dirname(outputPath), { recursive: true });

      let content: string;
      if (options.format === "markdown") {
        content = generateMarkdown(promptPackage);
      } else if (options.format === "csv") {
        content = generateCSV(promptPackage);
      } else {
        content = JSON.stringify(promptPackage, null, 2);
      }

      writeFileSync(outputPath, content);
      console.log(chalk.green(`\n✓ 提示词包已保存至: ${outputPath}`));
      console.log(chalk.blue(`\n生成了 ${promptPackage.prompts.length} 个资源提示词`));
    } catch (error) {
      spinner.fail("生成失败");
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

function generateMarkdown(pkg: any): string {
  const lines = [
    `# 资产生成提示词包: ${pkg.gameId}`,
    "",
    "## 风格圣经",
    "",
    `- **美术风格**: ${pkg.styleBible.artStyle}`,
    `- **配色方案**: ${pkg.styleBible.colorPalette.join(", ")}`,
    `- **线条风格**: ${pkg.styleBible.lineQuality}`,
    `- **着色方式**: ${pkg.styleBible.shading}`,
    `- **氛围**: ${pkg.styleBible.mood}`,
    `- **参考**: ${pkg.styleBible.reference}`,
    "",
    "## 一致性规则",
    "",
    ...pkg.styleBible.consistencyRules.map((r: string) => `- ${r}`),
    "",
    "## 提示词列表",
    "",
  ];
  for (const p of pkg.prompts) {
    lines.push(`### ${p.name} (${p.category})`);
    lines.push("");
    lines.push(`**基础提示词:**`);
    lines.push("\`\`\`");
    lines.push(p.basePrompt);
    lines.push("\`\`\`");
    lines.push("");
  }
  return lines.join("\n");
}

function generateCSV(pkg: any): string {
  const headers = ["ID", "类别", "名称", "描述", "基础提示词"];
  const rows = pkg.prompts.map((p: any) => [p.id, p.category, p.name, p.description, `"${p.basePrompt}"`].join(","));
  return [headers.join(","), ...rows].join("\n");
}
