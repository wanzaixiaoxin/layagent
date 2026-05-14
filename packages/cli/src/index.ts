import { Command } from "commander";
import chalk from "chalk";
import { createCommand } from "./commands/create.js";
import { promptsCommand } from "./commands/prompts.js";
import { buildCommand } from "./commands/build.js";
import { previewCommand } from "./commands/preview.js";
import { interactiveCommand } from "./commands/interactive.js";
import { templatesCommand } from "./commands/templates.js";
import { configCommand } from "./commands/config.js";

function printBanner(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║              ${chalk.bold("LayaGen AI v0.1.0")}                    ║
║      ${chalk.white("自然语言驱动的 LayaAir H5 游戏生成器")}         ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`));
}

const program = new Command();

program
  .name("layagen")
  .description("AI-powered LayaAir H5 game generator")
  .version("0.1.0")
  .option("--no-banner", "Hide startup banner")
  .hook("preAction", (command) => {
    if (command.opts().banner !== false) {
      printBanner();
    }
  });

program.addCommand(createCommand);
program.addCommand(promptsCommand);
program.addCommand(buildCommand);
program.addCommand(previewCommand);
program.addCommand(interactiveCommand);
program.addCommand(templatesCommand);
program.addCommand(configCommand);

program.parse();
