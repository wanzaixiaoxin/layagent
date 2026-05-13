# 示例：忍者猫咪跑酷

这个示例展示了如何使用 LayaGen AI 从零开始创建一个横版跑酷游戏。

## 快速开始

1. 启动交互式模式：
   ```bash
   npx layagen interactive
   ```

2. 输入游戏描述，可以参考 [game-desc.md](./game-desc.md)

3. 按照交互式引导生成：
   - 游戏设计文档
   - 资产生成提示词（用于 Midjourney/Stable Diffusion）
   - LayaAir 项目代码

4. 使用生成的提示词在 AI 绘画工具中生成游戏素材

5. 将素材放入 LayaAir 项目的 res/ 目录

6. 在 LayaAir IDE 中打开项目并运行

## 生成的内容

运行后会在本目录的 `output/` 文件夹中生成：
- `game-doc.json` — 游戏设计文档
- `asset-prompts.json` — 资产生成提示词包
- `game-project/` — 完整的 LayaAir TypeScript 项目
