# 贡献指南

感谢您对 LayaGen AI 的兴趣！

## 开发环境搭建

### 前置要求

- Node.js 18+
- pnpm 9+
- Git

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-org/layagen-ai.git
cd layagen-ai

# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 启动 CLI 开发模式
pnpm dev
```

## 项目结构

- `packages/shared/` — 类型定义和工具函数
- `packages/core/` — 核心引擎（规划、提示词、代码生成、MCP）
- `packages/cli/` — 命令行工具和交互模式
- `templates/` — 游戏模板
- `examples/` — 使用示例
- `docs/` — 文档

## 代码规范

- 使用 TypeScript 严格模式
- 所有公共 API 必须有类型定义
- 使用 async/await 而非回调
- 错误处理使用 try/catch
- 代码注释使用中文

## 提交信息格式

使用 [Conventional Commits](https://conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>
```

类型：
- `feat` — 新功能
- `fix` — 修复
- `docs` — 文档
- `style` — 代码格式
- `refactor` — 重构
- `test` — 测试
- `chore` — 构建/工具

示例：
```
feat(planner): 添加对 RPG 游戏的规划支持

- 新增角色属性生成
- 添加任务系统设计
```

## PR 流程

1. Fork 仓库并创建分支
2. 编写代码和测试
3. 确保所有测试通过
4. 提交 PR 并描述变更内容

## 发布流程

维护者使用以下流程发布新版本：

```bash
# 1. 创建变更集
pnpm changeset

# 2. 更新版本号
pnpm version-packages

# 3. 发布到 npm
pnpm release
```
