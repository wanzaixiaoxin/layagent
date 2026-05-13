import inquirer from "inquirer";
import chalk from "chalk";

export async function planningPrompt(): Promise<string> {
  console.log(chalk.cyan("📝 第一步：描述你的游戏想法\n"));
  console.log(chalk.gray("示例：一个忍者猫咪在森林中跑酷的游戏，要躲避障碍物和收集金币\n"));

  const { description } = await inquirer.prompt([
    {
      type: "input",
      name: "description",
      message: "游戏描述:",
      validate: (input: string) => input.trim().length > 0 || "请输入游戏描述",
    },
  ]);

  return description.trim();
}
