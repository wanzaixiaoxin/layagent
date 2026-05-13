import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const createCommand = new Command("create")
  .description("从自然语言描述创建游戏设计文档")
  .argument("<description>", "游戏描述（自然语言）或使用 @<文件路径> 读取文件")
  .option("-o, --output <path>", "输出文件路径", "./output/game-design.json")
  .option("-g, --genre <genre>", "游戏类型")
  .option("-c, --complexity <level>", "复杂度: simple, medium, complex", "medium")
  .action(async (description: string, options) => {
    const spinner = ora("正在分析游戏描述...").start();

    try {
      // 模拟 planner 调用
      await new Promise((r) => setTimeout(r, 1500));

      const gameDoc = {
        id: crypto.randomUUID(),
        name: "示例游戏",
        description: description,
        genre: options.genre || "platformer",
        dimension: "2d" as const,
        targetPlatforms: ["h5"],
        coreMechanics: {
          input: "点击/触摸控制",
          winCondition: "到达终点或达成目标分数",
          loseCondition: "生命值归零",
        },
        sceneHierarchy: [
          { name: "BackgroundLayer", type: "Sprite" },
          { name: "GameLayer", type: "Sprite" },
          { name: "UILayer", type: "Sprite" },
        ],
        resourceRequirements: {
          characters: [],
          backgrounds: [],
          items: [],
          effects: [],
          uiElements: [],
          audio: [],
        },
        estimatedComplexity: options.complexity,
      };

      spinner.succeed("游戏设计文档生成完成！");

      mkdirSync(dirname(options.output), { recursive: true });
      writeFileSync(options.output, JSON.stringify(gameDoc, null, 2));

      console.log(chalk.green(`\n✓ 游戏设计文档已保存至: ${options.output}`));
      console.log(chalk.blue(`\n游戏摘要:`));
      console.log(`  名称: ${gameDoc.name}`);
      console.log(`  类型: ${gameDoc.genre}`);
      console.log(`  复杂度: ${gameDoc.estimatedComplexity}`);
    } catch (error) {
      spinner.fail("生成失败");
      console.error(chalk.red(error));
      process.exit(1);
    }
  });
