# API 参考

## GamePlanner

### 构造函数

```typescript
new GamePlanner(options: PlannerOptions)
```

**PlannerOptions:**
- `model: LanguageModel` — Vercel AI SDK 的语言模型实例

### 方法

#### plan(input, options?)

```typescript
async plan(input: string, options?: PlanOptions): Promise<GameDesignDoc>
```

将自然语言描述转换为游戏设计文档。

**参数：**
- `input: string` — 游戏描述
- `options?: { genre?, complexity?, previousDoc? }`

**返回：** `Promise<GameDesignDoc>`

#### refine(doc, feedback)

```typescript
async refine(doc: GameDesignDoc, feedback: string): Promise<GameDesignDoc>
```

根据反馈优化游戏设计文档。

#### summarize(doc)

```typescript
summarize(doc: GameDesignDoc): string
```

生成游戏设计文档的文本摘要。

---

## PromptEngine

### 构造函数

```typescript
new PromptEngine(options: PromptEngineOptions)
```

**PromptEngineOptions:**
- `model: LanguageModel`
- `defaultStyle?: Partial<ArtStyle>`

### 方法

#### generatePackage(gameDoc)

```typescript
async generatePackage(gameDoc: GameDesignDoc): Promise<AssetPromptPackage>
```

从游戏设计文档生成完整的资产生成提示词包。

#### generateForCategory(gameDoc, category, style)

```typescript
async generateForCategory(
  gameDoc: GameDesignDoc,
  category: AssetCategory,
  style: ArtStyle
): Promise<AssetPrompt[]>
```

为指定类别生成提示词。

#### export(package, format)

```typescript
export(pkg: AssetPromptPackage, format: "json" | "markdown" | "csv"): string
```

将提示词包导出为指定格式。

#### extractStyle(description)

```typescript
async extractStyle(description: string): Promise<ArtStyle>
```

从描述中提取艺术风格。

---

## CodeGenerator

### 构造函数

```typescript
new CodeGenerator(options: CodeGeneratorOptions)
```

**CodeGeneratorOptions:**
- `model: LanguageModel`
- `templatesDir?: string`

### 方法

#### generateProject(gameDoc)

```typescript
async generateProject(gameDoc: GameDesignDoc): Promise<GeneratedProject>
```

生成完整的 LayaAir 项目。

**返回：**
```typescript
interface GeneratedProject {
  config: LayaProjectConfig;
  scripts: Array<{ filename: string; content: string }>;
  scenes: Array<{ filename: string; content: string }>;
  resources: Array<{ path: string; placeholder: boolean }>;
  indexHtml: string;
}
```

#### generateScript(doc, scriptName)

```typescript
async generateScript(doc: GameDesignDoc, scriptName: string): Promise<string>
```

生成单个脚本文件。

#### generateSceneConfig(doc)

```typescript
generateSceneConfig(doc: GameDesignDoc): Array<{ filename: string; content: string }>
```

生成场景配置文件。

#### generateProjectConfig(doc)

```typescript
generateProjectConfig(doc: GameDesignDoc): LayaProjectConfig
```

生成项目配置文件。

---

## LayaMCPClient

### 构造函数

```typescript
new LayaMCPClient(options: { mcpServerPath: string; workspace: string })
```

### 方法

| 方法 | 说明 |
|------|------|
| `connect()` | 连接到 MCP 服务器 |
| `disconnect()` | 断开连接 |
| `createScene(name, type?)` | 创建场景 |
| `openScene(name)` | 打开场景 |
| `saveScene()` | 保存当前场景 |
| `createPrefab(name, config)` | 创建预制体 |
| `addComponent(target, component)` | 添加组件 |
| `buildProject(config?)` | 构建项目 |
| `runPreview()` | 启动预览 |
| `importResource(localPath, targetPath)` | 导入资源 |
| `organizeResources(structure)` | 整理资源目录 |

---

## 类型定义

### GameDesignDoc

```typescript
interface GameDesignDoc {
  id: string;
  name: string;
  description: string;
  genre: GameGenre;
  dimension: GameDimension;
  targetPlatforms: Platform[];
  coreMechanics: {
    input: string;
    winCondition: string;
    loseCondition?: string;
    scoring?: string;
  };
  sceneHierarchy: SceneNode[];
  resourceRequirements: ResourceRequirements;
  estimatedComplexity: "simple" | "medium" | "complex";
}
```

### AssetPromptPackage

```typescript
interface AssetPromptPackage {
  gameId: string;
  styleBible: {
    artStyle: string;
    colorPalette: string[];
    lineQuality?: string;
    shading?: string;
    mood?: string;
    reference?: string;
    consistencyRules: string[];
  };
  prompts: AssetPrompt[];
  exportFormat: "json" | "markdown" | "csv";
}
```
