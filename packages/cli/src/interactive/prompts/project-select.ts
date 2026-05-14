import inquirer from "inquirer";
import chalk from "chalk";
import { listProjects, deleteProject, type ProjectMeta } from "../../projects/index.js";

export type ProjectSelectAction =
  | { type: "new"; name: string; description: string }
  | { type: "load"; projectId: string }
  | { type: "delete"; projectId: string }
  | { type: "exit" };

export async function projectSelectPrompt(): Promise<ProjectSelectAction> {
  const projects = listProjects();

  console.log(chalk.bold.cyan("\n━━━ 项目管理 ━━━\n"));

  if (projects.length > 0) {
    console.log(chalk.gray(`已有 ${projects.length} 个项目:\n`));
    for (const p of projects) {
      const date = new Date(p.updatedAt).toLocaleString("zh-CN");
      console.log(`  ${chalk.bold(p.name)}`);
      console.log(`    ${chalk.gray(p.description.slice(0, 60))}${p.description.length > 60 ? "..." : ""}`);
      console.log(`    ${chalk.gray(`最后更新: ${date}`)}\n`);
    }
  } else {
    console.log(chalk.gray("暂无项目，请创建一个新项目。\n"));
  }

  const choices: any[] = [];

  if (projects.length > 0) {
    choices.push(new inquirer.Separator(chalk.gray("══ 选择已有项目 ══")));
    for (const p of projects) {
      choices.push({
        name: `${p.name}  ${chalk.gray(`[${p.genre || "未分类"}]`)}`,
        value: { type: "load", projectId: p.id },
      });
    }
  }

  choices.push(new inquirer.Separator(chalk.gray("══ 其他操作 ══")));
  choices.push({ name: "➕ 创建新项目", value: { type: "new" } });

  if (projects.length > 0) {
    choices.push({ name: "🗑️  删除项目", value: { type: "delete-menu" } });
  }

  choices.push({ name: "❌ 退出", value: { type: "exit" } });

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "请选择一个操作:",
      choices,
      pageSize: 15,
    },
  ]);

  if (action.type === "new") {
    const { name } = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "项目名称:",
        validate: (input: string) => input.trim().length > 0 || "请输入项目名称",
      },
    ]);
    const { description } = await inquirer.prompt([
      {
        type: "input",
        name: "description",
        message: "游戏描述 (可选，后续可修改):",
        default: name,
      },
    ]);
    return { type: "new", name: name.trim(), description: description.trim() };
  }

  if (action.type === "delete-menu") {
    const { target } = await inquirer.prompt([
      {
        type: "list",
        name: "target",
        message: "选择要删除的项目:",
        choices: projects.map((p) => ({ name: p.name, value: p.id })),
      },
    ]);
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `确定要删除 "${projects.find((p) => p.id === target)?.name}" 吗？此操作不可恢复。`,
        default: false,
      },
    ]);
    if (confirm) {
      deleteProject(target);
      console.log(chalk.green("项目已删除\n"));
    }
    // Re-show project select
    return projectSelectPrompt();
  }

  if (action.type === "exit") {
    return { type: "exit" };
  }

  return action as ProjectSelectAction;
}
