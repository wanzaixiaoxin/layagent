# 架构文档

## 系统概述

LayaGen AI 采用模块化设计，分为四个核心层次：

1. **CLI 层** — 用户交互和命令处理
2. **核心引擎** — AI 驱动的游戏生成逻辑
3. **MCP 客户端** — LayaAir IDE 集成
4. **共享层** — 类型定义和工具函数

## 模块详解

### GamePlanner（游戏规划引擎）

负责将自然语言转换为结构化的游戏设计文档。

- **输入**: 自然语言字符串（如"一个忍者猫咪跑酷游戏"）
- **处理**: 使用 AI SDK 的 `generateObject` 方法，配合 Zod Schema 生成结构化数据
- **输出**: `GameDesignDoc` 对象

### PromptEngine（资产生成提示词引擎）

根据游戏设计文档生成风格一致的 AI 图像生成提示词。

- **风格圣经生成**: 分析游戏描述，提取统一的艺术风格指南
- **提示词生成**: 为每个资源（角色、背景、道具、UI）生成详细提示词
- **一致性控制**: 确保所有提示词遵循风格圣经
- **导出格式**: 支持 JSON / Markdown / CSV

### CodeGenerator（代码生成器）

生成完整的 LayaAir TypeScript 项目。

- **模板系统**: 基于预设代码模板，通过变量插值生成代码
- **脚本生成**: PlayerController、GameManager、ItemCollector 等
- **场景配置**: 根据场景层级生成 .ls 场景文件
- **项目配置**: 生成 project.json 和 index.html

### LayaMCPClient（MCP 客户端）

通过 Model Context Protocol 连接 LayaAir IDE。

- **场景管理**: 创建、打开、保存场景
- **预制体管理**: 创建和配置预制体
- **组件管理**: 添加和配置组件
- **项目构建**: 构建和预览项目

## 数据流

```
用户描述
  → GamePlanner.plan() → GameDesignDoc
    → (并行) PromptEngine.generatePackage() → AssetPromptPackage
    → (并行) CodeGenerator.generateProject() → GeneratedProject
      → LayaMCPClient → LayaAir IDE
```

## 扩展指南

### 添加新的游戏类型

1. 在 `templates/` 目录下创建新的 JSON 模板文件
2. 在 `GameGenreSchema` 中添加新的类型枚举值
3. 在 CLI 的模板列表中添加新类型

### 添加新的代码模板

1. 在 `packages/core/src/code-generator/templates/` 下创建新的模板文件
2. 在 `CodeGenerator` 类的 `generateAllScripts` 方法中注册新模板

### 集成新的 AI 模型

使用 Vercel AI SDK 的模型提供商：

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

const openai = createOpenAI({ apiKey: '...' });
const model = openai('gpt-4o');
```
