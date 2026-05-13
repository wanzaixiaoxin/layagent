import { Command } from "commander";
import chalk from "chalk";
import { startInteractiveMode } from "../interactive/index.js";

export const interactiveCommand = new Command("interactive")
  .description("启动交互式对话模式（推荐）")
  .alias("i")
  .action(async () => {
    console.log(chalk.cyan("\n🎮 欢迎使用 LayaGen 交互式模式！\n"));
    await startInteractiveMode();
  });
