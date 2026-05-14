import inquirer from "inquirer";

export type MenuAction =
  | "view-doc"
  | "modify-desc"
  | "gen-prompts"
  | "gen-code"
  | "preview"
  | "refine"
  | "save"
  | "exit";

const mainMenuChoices = [
  { name: "📄  查看完整设计文档", value: "view-doc" },
  { name: "📝  修改游戏描述", value: "modify-desc" },
  { name: "🎨  生成资产生成提示词", value: "gen-prompts" },
  { name: "💻  生成 LayaAir 代码", value: "gen-code" },
  { name: "🚀  构建并预览 (需要 MCP)", value: "preview" },
  { name: "✏️  优化 / 给出反馈", value: "refine" },
  { name: "💾  保存项目", value: "save" },
  { name: "❌  退出", value: "exit" },
];

export async function showMainMenu(): Promise<MenuAction> {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "请选择一个操作:",
      choices: mainMenuChoices,
      pageSize: 10,
    },
  ]);

  return action as MenuAction;
}
