import inquirer from "inquirer";
import ora from "ora";
import { writeFileSync, mkdirSync } from "node:fs";
import { render } from "../utils/renderer.js";

export async function promptsGeneration(gameDoc: any): Promise<any> {
  render.title("🎨 生成资产生成提示词");

  const spinner = ora("正在分析游戏风格和资产生成提示词...").start();
  await new Promise((r) => setTimeout(r, 2500));

  const promptPackage = {
    gameId: gameDoc.id,
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
        id: "p-player_cat",
        category: "character",
        name: "忍者猫主角",
        description: "穿着忍者服装的橘猫",
        basePrompt: "A cute chibi orange cat wearing ninja outfit, big expressive eyes, 2-head proportion, cartoon game character, full body, standing pose, clean thick outline, flat vibrant colors, transparent background, game asset, 2D sprite, 256x256 pixels",
        variations: {
          run: "running animation pose, dynamic action, legs extended",
          jump: "jumping pose, mid-air, excited expression, ears perked up",
          hurt: "hurt pose, dizzy spiral eyes, bandages on head, sad expression",
        },
        technicalSpec: { resolution: "256x256", format: "PNG", transparent: true, spriteSheetLayout: "1x8 horizontal" },
      },
      {
        id: "p-bg_forest",
        category: "background",
        name: "森林背景",
        description: "奇幻森林三层视差背景",
        basePrompt: "Fantasy forest parallax background, distant purple mountains silhouette, soft gradient sky blue to pink, tall stylized trees with rounded canopies, floating magical particles, cartoon game style, flat vector design with subtle depth, seamless horizontal tiling, 16:9 aspect ratio, 1920x1080",
        technicalSpec: { resolution: "1920x1080", format: "PNG", transparent: false },
      },
      {
        id: "p-coin",
        category: "item",
        name: "金币",
        description: "收集用的金币",
        basePrompt: "Golden coin game item, shiny metallic gold surface, embossed star symbol center, subtle rotation blur, sparkle highlight, cartoon style, flat design, clean thick outline, transparent background, game asset, 128x128 pixels",
        technicalSpec: { resolution: "128x128", format: "PNG", transparent: true },
      },
      {
        id: "p-power_up",
        category: "item",
        name: "加速道具",
        description: "闪电加速道具",
        basePrompt: "Speed boost power-up item, glowing yellow lightning bolt icon, electric spark effects around edges, bright glow aura, cartoon style, flat design, clean outline, transparent background, game asset, 128x128 pixels",
        technicalSpec: { resolution: "128x128", format: "PNG", transparent: true },
      },
      {
        id: "p-btn_start",
        category: "ui",
        name: "开始按钮",
        description: "绿色圆形开始按钮",
        basePrompt: "Game UI start button, large rounded circle shape, bright green gradient fill, white play triangle icon center, glossy bevel effect, soft drop shadow, cartoon style, 9-slice scalable design, transparent background, game UI asset, 256x256 pixels",
        technicalSpec: { resolution: "256x256", format: "PNG", transparent: true },
      },
      {
        id: "p-panel_pause",
        category: "ui",
        name: "暂停面板",
        description: "半透明暂停面板",
        basePrompt: "Game UI pause panel overlay, rounded rectangle, dark translucent background 70% opacity, clean border frame, title text area at top, button area at bottom, cartoon style, 9-slice scalable, transparent background, game UI asset, 800x600 pixels",
        technicalSpec: { resolution: "800x600", format: "PNG", transparent: true },
      },
    ],
  };

  spinner.succeed(`已生成 ${promptPackage.prompts.length} 个资产生成提示词！`);

  const { format } = await inquirer.prompt([
    {
      type: "list",
      name: "format",
      message: "选择导出格式:",
      choices: [
        { name: "JSON", value: "json" },
        { name: "Markdown", value: "md" },
        { name: "CSV", value: "csv" },
      ],
      default: "json",
    },
  ]);

  const outputDir = "./output";
  mkdirSync(outputDir, { recursive: true });

  const ext = format === "md" ? "md" : format;
  const outputPath = `${outputDir}/asset-prompts.${ext}`;

  if (format === "md") {
    writeFileSync(outputPath, generateMarkdown(promptPackage));
  } else if (format === "csv") {
    writeFileSync(outputPath, generateCSV(promptPackage));
  } else {
    writeFileSync(outputPath, JSON.stringify(promptPackage, null, 2));
  }

  render.success(`提示词包已保存至 ${outputPath}`);
  render.promptSummary(promptPackage);

  return promptPackage;
}

function generateMarkdown(pkg: any): string {
  const lines = [
    `# 资产生成提示词包: ${pkg.gameId}`,
    ``,
    `## 风格圣经`,
    ``,
    `| 属性 | 值 |`,
    `|------|-----|`,
    `| 美术风格 | ${pkg.styleBible.artStyle} |`,
    `| 配色方案 | ${pkg.styleBible.colorPalette.join(", ")} |`,
    `| 线条质量 | ${pkg.styleBible.lineQuality} |`,
    `| 着色方式 | ${pkg.styleBible.shading} |`,
    `| 氛围 | ${pkg.styleBible.mood} |`,
    `| 参考 | ${pkg.styleBible.reference} |`,
    ``,
    `## 一致性规则`,
    ``,
    ...pkg.styleBible.consistencyRules.map((r: string) => `- ${r}`),
    ``,
    `## 提示词列表 (${pkg.prompts.length} 个)`,
    ``,
  ];

  for (const p of pkg.prompts) {
    lines.push(`### ${p.name} (${p.category})`);
    lines.push("");
    lines.push(`**描述:** ${p.description}`);
    lines.push("");
    lines.push(`**基础提示词:**`);
    lines.push("```");
    lines.push(p.basePrompt);
    lines.push("```");
    if (p.negativePrompt) {
      lines.push("");
      lines.push(`**反向提示词:** ${p.negativePrompt}`);
    }
    if (p.variations) {
      lines.push("");
      lines.push(`**变体:**`);
      for (const [key, val] of Object.entries(p.variations)) {
        lines.push(`- ${key}: ${val}`);
      }
    }
    lines.push("");
    lines.push(`**技术规格:** ${p.technicalSpec.resolution} / ${p.technicalSpec.format} / 透明: ${p.technicalSpec.transparent}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function generateCSV(pkg: any): string {
  const headers = ["ID", "类别", "名称", "描述", "基础提示词", "分辨率", "格式", "透明"];
  const rows = pkg.prompts.map((p: any) => [
    p.id, p.category, p.name, p.description,
    `"${p.basePrompt.replace(/"/g, '""')}"`,
    p.technicalSpec.resolution, p.technicalSpec.format,
    p.technicalSpec.transparent ? "是" : "否",
  ]);
  return [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
}
