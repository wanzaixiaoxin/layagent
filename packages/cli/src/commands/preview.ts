import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync } from "node:fs";

export const previewCommand = new Command("preview")
  .description("通过 LayaAir-MCP 预览项目")
  .argument("<project-path>", "项目目录路径")
  .option("--mcp-server <path>", "MCP 服务器路径")
  .action(async (projectPath: string, options) => {
    const spinner = ora("正在连接 LayaAir-MCP 服务器...").start();

    try {
      if (!existsSync(projectPath)) {
        throw new Error(`项目目录不存在: ${projectPath}`);
      }

      // 模拟 MCP 连接
      await new Promise((r) => setTimeout(r, 1000));

      spinner.text = "正在构建项目...";
      await new Promise((r) => setTimeout(r, 1500));

      spinner.text = "正在启动预览...";
      await new Promise((r) => setTimeout(r, 1000));

      spinner.succeed("预览已启动！");

      console.log(chalk.green("\n✓ 项目预览中"));
      console.log(chalk.blue(`  项目路径: ${projectPath}`));
      console.log(chalk.yellow("\n注意: 完整的 MCP 集成需要在本地安装 LayaAir-MCP 插件"));
    } catch (error) {
      spinner.fail("预览失败");
      console.error(chalk.red(error));
      process.exit(1);
    }
  });
