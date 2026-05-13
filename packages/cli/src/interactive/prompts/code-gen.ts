import ora from "ora";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "../utils/renderer.js";

export async function codeGeneration(gameDoc: any): Promise<any> {
  render.title("💻 生成 LayaAir 项目代码");

  const spinner = ora("正在生成项目结构和代码...").start();
  await new Promise((r) => setTimeout(r, 3000));

  const projectName = "ninja-cat-run";
  const outputDir = `./output/${projectName}`;

  // 创建目录结构
  mkdirSync(join(outputDir, "src", "scripts"), { recursive: true });
  mkdirSync(join(outputDir, "src", "scenes"), { recursive: true });
  mkdirSync(join(outputDir, "res", "characters"), { recursive: true });
  mkdirSync(join(outputDir, "res", "backgrounds"), { recursive: true });
  mkdirSync(join(outputDir, "res", "items"), { recursive: true });
  mkdirSync(join(outputDir, "res", "ui"), { recursive: true });
  mkdirSync(join(outputDir, "res", "audio"), { recursive: true });
  mkdirSync(join(outputDir, "libs"), { recursive: true });

  // 项目配置
  const projectConfig = {
    name: projectName,
    version: "1.0.0",
    engineVersion: "3.2.0",
    screenOrientation: "landscape",
    resolution: { width: 1920, height: 1080 },
    physics: { enabled: true, engine: "box2d", gravity: { x: 0, y: 15 } },
    scenes: [
      { name: "StartScene", type: "2d" },
      { name: "MainScene", type: "2d" },
      { name: "GameOverScene", type: "2d" },
    ],
  };
  writeFileSync(join(outputDir, "project.json"), JSON.stringify(projectConfig, null, 2));

  // 玩家控制器脚本
  const playerController = `import { Laya } from "Laya";
import { Script } from "laya/components/Script";
import { RigidBody } from "laya/physics/RigidBody";
import { Sprite } from "laya/display/Sprite";

export class PlayerController extends Script {
  @property({ type: "number", default: 12 })
  public jumpForce: number = 12;

  @property({ type: "number", default: 300 })
  public moveSpeed: number = 300;

  private rigidbody: RigidBody;
  private jumpCount: number = 0;
  private maxJumps: number = 2;
  private isGrounded: boolean = false;

  onAwake(): void {
    this.rigidbody = this.owner.getComponent(RigidBody);
  }

  onUpdate(): void {
    // Auto-run forward
    if (this.rigidbody) {
      const v = this.rigidbody.linearVelocity;
      this.rigidbody.linearVelocity = { x: this.moveSpeed, y: v.y };
    }

    // Remove if fallen off screen
    if ((this.owner as Sprite).y > 2000) {
      Laya.stage.event("PlayerFell");
    }
  }

  onMouseDown(): void {
    this.jump();
  }

  onKeyDown(e: Laya.Event): void {
    if (e.keyCode === Laya.Keyboard.SPACE) {
      this.jump();
    }
  }

  private jump(): void {
    if (!this.rigidbody) return;
    if (this.isGrounded || this.jumpCount < this.maxJumps) {
      const v = this.rigidbody.linearVelocity;
      this.rigidbody.linearVelocity = { x: v.x, y: -this.jumpForce };
      this.jumpCount++;
      this.isGrounded = false;
    }
  }

  onTriggerEnter(other: Laya.PhysicsComponent): void {
    if (other.tag === "Ground") {
      this.isGrounded = true;
      this.jumpCount = 0;
    }
    if (other.tag === "Obstacle") {
      Laya.stage.event("PlayerHit");
    }
  }
}`;

  writeFileSync(join(outputDir, "src", "scripts", "PlayerController.ts"), playerController);

  // 游戏管理器脚本
  const gameManager = `import { Laya } from "Laya";
import { Script } from "laya/components/Script";
import { Text } from "laya/ui/Text";

export class GameManager extends Script {
  @property({ type: "number", default: 0 })
  public score: number = 0;

  @property({ type: "number", default: 3 })
  public lives: number = 3;

  private scoreText: Text;
  private isGameOver: boolean = false;

  onAwake(): void {
    // Find UI references
    this.scoreText = this.owner.scene.getChildByName("ScoreText") as Text;
    
    // Listen for game events
    Laya.stage.on("CoinCollected", this, this.onCoinCollected);
    Laya.stage.on("PlayerHit", this, this.onPlayerHit);
    Laya.stage.on("PlayerFell", this, this.onPlayerHit);
  }

  onEnable(): void {
    this.score = 0;
    this.lives = 3;
    this.isGameOver = false;
    this.updateUI();
  }

  private onCoinCollected(value: number): void {
    this.score += value;
    this.updateUI();
  }

  private onPlayerHit(): void {
    this.lives--;
    this.updateUI();
    
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    Laya.timer.scale = 0;
    Laya.stage.event("GameOver", { score: this.score });
  }

  private updateUI(): void {
    if (this.scoreText) {
      this.scoreText.text = \\"Score: \\" + this.score;
    }
  }

  onDestroy(): void {
    Laya.stage.off("CoinCollected", this, this.onCoinCollected);
    Laya.stage.off("PlayerHit", this, this.onPlayerHit);
    Laya.stage.off("PlayerFell", this, this.onPlayerHit);
  }
}`;

  writeFileSync(join(outputDir, "src", "scripts", "GameManager.ts"), gameManager);

  // Item Collector 脚本
  const itemCollector = `import { Laya } from "Laya";
import { Script } from "laya/components/Script";

export class ItemCollector extends Script {
  @property({ type: "number", default: 10 })
  public pointValue: number = 10;

  @property({ type: "string", default: "coin" })
  public itemType: string = "coin";

  onTriggerEnter(other: Laya.PhysicsComponent): void {
    if (other.tag === "Player") {
      this.collect();
    }
  }

  private collect(): void {
    Laya.stage.event("CoinCollected", this.pointValue);
    
    // Spawn effect
    Laya.stage.event("SpawnEffect", { 
      position: (this.owner as any).transform.position,
      type: "collect" 
    });
    
    this.owner.destroy();
  }
}`;

  writeFileSync(join(outputDir, "src", "scripts", "ItemCollector.ts"), itemCollector);

  // 入口脚本
  const mainEntry = `import { Laya } from "Laya";
import { Render } from "laya/renders/Render";
import { Browser } from "laya/utils/Browser";
import { Handler } from "laya/utils/Handler";

// Import game scripts
import { PlayerController } from "./scripts/PlayerController";
import { GameManager } from "./scripts/GameManager";
import { ItemCollector } from "./scripts/ItemCollector";

class GameEntry {
  constructor() {
    // Initialize LayaAir
    Laya.init(1920, 1080, Laya.WebGL);
    Laya.stage.scaleMode = Laya.Stage.SCALE_SHOWALL;
    Laya.stage.screenMode = Laya.Stage.SCREEN_HORIZONTAL;
    Laya.stage.alignV = Laya.Stage.ALIGN_CENTER;
    Laya.stage.alignH = Laya.Stage.ALIGN_CENTER;

    // Enable physics
    Laya.Physics.enable();

    // Register script classes
    Laya.class(PlayerController, "PlayerController");
    Laya.class(GameManager, "GameManager");
    Laya.class(ItemCollector, "ItemCollector");

    // Load scene
    Laya.Scene.open("StartScene.scene");
  }
}

new GameEntry();`;

  writeFileSync(join(outputDir, "src", "Main.ts"), mainEntry);

  // index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${gameDoc.name}</title>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #1a1a2e; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script src="libs/laya.core.min.js"></script>
  <script src="libs/laya.webgl.min.js"></script>
  <script src="libs/laya.ui.min.js"></script>
  <script src="libs/laya.physics.min.js"></script>
  <script src="js/bundle.js"></script>
</body>
</html>`;

  writeFileSync(join(outputDir, "index.html"), indexHtml);

  spinner.succeed("LayaAir 项目生成完成！");

  const files = [
    "project.json",
    "index.html",
    "src/Main.ts",
    "src/scripts/PlayerController.ts",
    "src/scripts/GameManager.ts",
    "src/scripts/ItemCollector.ts",
  ];

  render.fileList(files.map(f => `${outputDir}/${f}`));

  render.info("提示: 使用 layagen prompts 命令生成的提示词在 Midjourney/SD 中生成图片后，");
  render.info("      放入 res/ 对应目录，然后在 LayaAir IDE 中打开项目即可运行。");

  return { name: projectName, path: outputDir, files };
}
