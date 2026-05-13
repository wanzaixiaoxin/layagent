import chalk from "chalk";

export const render = {
  banner: () => {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════╗
║              LayaGen AI 交互式模式                 ║
╚═══════════════════════════════════════════════════╝
`));
  },

  title: (text: string) => {
    console.log(chalk.bold.cyan(`\n━━━ ${text} ━━━\n`));
  },

  success: (text: string) => {
    console.log(chalk.green(`✓ ${text}`));
  },

  error: (text: string) => {
    console.log(chalk.red(`✗ ${text}`));
  },

  warning: (text: string) => {
    console.log(chalk.yellow(`⚠ ${text}`));
  },

  info: (text: string) => {
    console.log(chalk.blue(`ℹ ${text}`));
  },

  divider: () => {
    console.log(chalk.gray("─".repeat(50)));
  },

  section: (title: string, content: string) => {
    console.log(chalk.bold(`\n${title}`));
    console.log(chalk.gray(content));
  },

  docSummary: (doc: any) => {
    const totalResources =
      (doc.resourceRequirements?.characters?.length || 0) +
      (doc.resourceRequirements?.backgrounds?.length || 0) +
      (doc.resourceRequirements?.items?.length || 0) +
      (doc.resourceRequirements?.effects?.length || 0) +
      (doc.resourceRequirements?.uiElements?.length || 0) +
      (doc.resourceRequirements?.audio?.length || 0);

    console.log(chalk.bold.cyan("\n━━━ 游戏设计摘要 ━━━"));
    console.log(`  ${chalk.bold("名称:")} ${doc.name}`);
    console.log(`  ${chalk.bold("类型:")} ${doc.genre} (${doc.dimension})`);
    console.log(`  ${chalk.bold("目标平台:")} ${doc.targetPlatforms?.join(", ")}`);
    console.log(`  ${chalk.bold("复杂度:")} ${doc.estimatedComplexity}`);
    console.log(`  ${chalk.bold("场景数:")} ${doc.sceneHierarchy?.length || 0}`);
    console.log(`  ${chalk.bold("资源总数:")} ${totalResources}`);
    console.log(chalk.gray(`\n  角色: ${doc.resourceRequirements?.characters?.length || 0}`));
    console.log(chalk.gray(`  背景: ${doc.resourceRequirements?.backgrounds?.length || 0}`));
    console.log(chalk.gray(`  道具: ${doc.resourceRequirements?.items?.length || 0}`));
    console.log(chalk.gray(`  特效: ${doc.resourceRequirements?.effects?.length || 0}`));
    console.log(chalk.gray(`  UI:   ${doc.resourceRequirements?.uiElements?.length || 0}`));
    console.log(chalk.gray(`  音频: ${doc.resourceRequirements?.audio?.length || 0}`));
    console.log();
  },

  promptSummary: (pkg: any) => {
    console.log(chalk.bold.cyan("\n━━━ 提示词包摘要 ━━━"));
    console.log(`  ${chalk.bold("风格:")} ${pkg.styleBible.artStyle}`);
    console.log(`  ${chalk.bold("配色:")} ${pkg.styleBible.colorPalette.join(", ")}`);
    console.log(`  ${chalk.bold("提示词数:")} ${pkg.prompts.length}`);
    
    const byCategory = pkg.prompts.reduce((acc: any, p: any) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});
    
    console.log(chalk.gray("\n  按类别分布:"));
    for (const [cat, count] of Object.entries(byCategory)) {
      console.log(chalk.gray(`    ${cat}: ${count}`));
    }
    console.log();
  },

  fileList: (files: string[]) => {
    console.log(chalk.bold.cyan("\n━━━ 生成的文件 ━━━"));
    for (const file of files) {
      console.log(`  ${chalk.green("📄")} ${file}`);
    }
    console.log();
  },
};
