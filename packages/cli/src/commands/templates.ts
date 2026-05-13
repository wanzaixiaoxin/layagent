import { Command } from "commander";
import chalk from "chalk";

const TEMPLATES = [
  { id: "platformer", name: "横版闯关", description: "经典的横版跳跃闯关游戏", complexity: "medium" },
  { id: "puzzle", name: "益智解谜", description: "各种益智解谜玩法", complexity: "simple" },
  { id: "shooter", name: "射击游戏", description: "弹幕射击或塔防射击", complexity: "medium" },
  { id: "rpg", name: "角色扮演", description: "角色扮演冒险游戏", complexity: "complex" },
  { id: "tower-defense", name: "塔防游戏", description: "建造防御塔抵御敌人", complexity: "medium" },
  { id: "racing", name: "赛车竞速", description: "竞速赛车游戏", complexity: "medium" },
  { id: "fighting", name: "格斗游戏", description: "横版或街机格斗", complexity: "complex" },
  { id: "idle", name: "放置挂机", description: "放置类休闲游戏", complexity: "simple" },
  { id: "roguelike", name: "肉鸽地牢", description: "随机地牢冒险", complexity: "complex" },
  { id: "card", name: "卡牌游戏", description: "卡牌对战或收集", complexity: "complex" },
];

export const templatesCommand = new Command("templates")
  .description("查看可用的游戏模板")
  .action(async () => {
    console.log(chalk.bold.cyan("\n━━━ 可用游戏模板 ━━━\n"));
    
    for (const t of TEMPLATES) {
      const complexityColor = t.complexity === "simple" ? chalk.green :
                              t.complexity === "medium" ? chalk.yellow : chalk.red;
      console.log(`${chalk.bold(t.name)} ${chalk.gray(`(${t.id})`)}`);
      console.log(`  ${t.description}`);
      console.log(`  复杂度: ${complexityColor(t.complexity)}`);
      console.log();
    }

    console.log(chalk.blue("使用方法:"));
    console.log(`  layagen create "描述" --genre <模板ID>`);
    console.log(`  例如: layagen create "太空射击游戏" --genre shooter\n`);
  });
