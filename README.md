# LayaGen AI 🎮

> 自然语言驱动的 LayaAir H5 游戏生成器 | Natural Language Powered LayaAir H5 Game Generator

## 简介 / Introduction

LayaGen AI 是一个开源智能体，能够将你的自然语言描述转化为完整的 LayaAir H5 游戏项目，同时生成配套的生图 AI 提示词资源包。

LayaGen AI is an open-source agent that transforms your natural language descriptions into complete LayaAir H5 game projects, with structured AI image generation prompt packages.

## 特性 / Features

- 🎯 **自然语言理解** — 用中文或英文描述你的游戏想法
- 📋 **智能游戏规划** — 自动生成游戏设计文档
- 🎨 **AI 生图提示词** — 为 Midjourney/Stable Diffusion 生成风格一致的提示词
- 💻 **代码自动生成** — 生成完整的 LayaAir TypeScript 项目
- 🚀 **MCP 集成** — 通过 LayaAir-MCP 直接控制 IDE
- 🖥️ **交互式 CLI** — 友好的命令行交互体验
- 🎮 **10+ 游戏模板** — 横版、益智、射击、RPG 等多种游戏类型

## 快速开始 / Quick Start

```bash
# 克隆仓库
git clone https://github.com/your-org/layagen-ai.git
cd layagen-ai

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 创建你的第一个游戏（交互式模式）
npx layagen interactive
```

## 架构 / Architecture

```
用户输入 (自然语言)
    |
    v
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   CLI 层     │──│   核心引擎   │──│  MCP 客户端  │
│              │  │              │  │              │
│ • 命令解析   │  │ • 游戏规划   │  │ • 场景管理   │
│ • 交互模式   │  │ • 提示词生成 │  │ • 项目构建   │
│ • 文件 I/O   │  │ • 代码生成   │  │ • 预览运行   │
└──────────────┘  └──────────────┘  └──────────────┘
                        |
              ┌─────────┴─────────┐
              v                   v
        ┌──────────┐        ┌──────────┐
        │ 游戏设计  │        │ 资产生成  │
        │ 文档      │        │ 提示词包  │
        └──────────┘        └──────────┘
```

## 项目结构 / Project Structure

```
layagen-ai/
├── packages/
│   ├── shared/          # 共享类型和工具 (@layagen/shared)
│   ├── core/            # 核心引擎 (@layagen/core)
│   │   ├── planner/         # 游戏规划引擎
│   │   ├── prompt-engineer/ # 资产生成提示词引擎
│   │   ├── code-generator/  # 代码生成器
│   │   └── mcp-client/      # LayaAir-MCP 客户端
│   └── cli/             # 命令行工具 (@layagen/cli)
│       ├── commands/        # 子命令
│       └── interactive/     # 交互式模式
├── templates/           # 游戏模板
├── examples/            # 使用示例
└── docs/                # 文档
```

## 安装 / Installation

### 前置要求
- Node.js 18+
- pnpm 9+
- (可选) LayaAir IDE 3.x — 用于项目预览和发布

### 安装
```bash
pnpm install
pnpm build
```

## 使用 / Usage

### 交互式模式（推荐）

```bash
npx layagen interactive
```

按照引导输入游戏描述，然后选择：
1. 📄 查看完整设计文档
2. 🎨 生成资产生成提示词
3. 💻 生成 LayaAir 代码
4. 🚀 构建并预览
5. ✏️ 优化 / 给出反馈
6. 💾 保存项目

### 命令行 / CLI

```bash
# 从描述创建游戏设计文档
layagen create "我想做一个太空射击游戏" --genre shooter

# 生成资产生成提示词
layagen prompts ./output/my-game.json --format markdown

# 生成 LayaAir 项目代码
layagen build ./output/my-game.json --output ./my-game-project

# 查看可用的游戏模板
layagen templates
```

### API 使用 / API Usage

```typescript
import { GamePlanner, PromptEngine, CodeGenerator } from '@layagen/core';
import { createOpenAI } from '@ai-sdk/openai';

// 创建 AI 模型
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = openai('gpt-4o');

// 1. 游戏规划
const planner = new GamePlanner({ model });
const doc = await planner.plan("一个忍者猫咪跑酷游戏");

// 2. 生成资产生成提示词
const engine = new PromptEngine({ model });
const prompts = await engine.generatePackage(doc);

// 3. 生成代码
const generator = new CodeGenerator({ model });
const project = await generator.generateProject(doc);
```

## AI 模型配置 / AI Model Configuration

支持以下 AI 提供商：

| 提供商 | 环境变量 | 模型示例 |
|--------|----------|----------|
| OpenAI | `OPENAI_API_KEY` | gpt-4o, gpt-4 |
| Anthropic | `ANTHROPIC_API_KEY` | claude-3-5-sonnet |
| 通义千问 | `DASHSCOPE_API_KEY` | qwen-max |
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat |
| 智谱 GLM | `GLM_API_KEY` | glm-4-plus, glm-4-flash |
| Moonshot Kimi | `KIMI_API_KEY` | kimi-latest, kimi-k1 |

## 示例 / Examples

### 示例 1：忍者猫咪跑酷

```bash
# 进入交互模式
npx layagen interactive

# 输入描述：
# "一个忍者猫咪在森林中跑酷的游戏，要收集金币，避开障碍物"
# 选择 "生成资产生成提示词" 获取 AI 生图提示词
# 选择 "生成 LayaAir 代码" 获取完整项目
```

更多示例见 [examples/](./examples/) 目录。

## 文档 / Documentation

- [架构文档](./docs/architecture.md) — 系统架构和模块说明
- [API 参考](./docs/api-reference.md) — 完整的 API 文档
- [提示词指南](./docs/prompt-guide.md) — 如何编写游戏描述和优化提示词
- [贡献指南](./docs/contributing.md) — 如何参与项目开发

## 路线图 / Roadmap

- [x] 核心引擎（规划、提示词、代码生成）
- [x] CLI 交互式模式
- [x] 资产生成提示词导出（JSON/Markdown/CSV）
- [x] LayaAir-MCP 客户端
- [x] 10 种游戏模板
- [ ] LayaAir IDE 插件
- [ ] 实时预览集成
- [ ] 多语言支持
- [ ] 云端部署

## 贡献 / Contributing

欢迎提交 Issue 和 Pull Request！

请阅读 [贡献指南](./docs/contributing.md) 了解如何参与。

## 许可证 / License

[MIT License](./LICENSE) © LayaGen Contributors
