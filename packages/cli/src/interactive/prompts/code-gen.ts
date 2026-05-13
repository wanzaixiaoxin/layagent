import ora from "ora";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "../utils/renderer.js";

export async function codeGeneration(gameDoc: any, generator: any): Promise<any> {
  render.title("Generate LayaAir Project Code");

  const spinner = ora("Generating project structure and code...").start();

  let project: any;

  try {
    if (generator) {
      // Real AI call
      project = await generator.generateProject(gameDoc);
      spinner.succeed("LayaAir project generated! (AI powered)");
    } else {
      // Mock mode
      await new Promise((r) => setTimeout(r, 3000));
      project = createMockProject(gameDoc);
      spinner.succeed("LayaAir project generated! (mock mode)");
    }
  } catch (error) {
    spinner.fail(`Generation failed: ${(error as Error).message}`);
    render.info("Falling back to mock mode...");
    await new Promise((r) => setTimeout(r, 1000));
    project = createMockProject(gameDoc);
  }

  const projectName = gameDoc.name ? gameDoc.name.toLowerCase().replace(/\s+/g, "-") : "my-game";
  const outputDir = `./output/${projectName}`;

  // Create directory structure
  mkdirSync(join(outputDir, "src", "scripts"), { recursive: true });
  mkdirSync(join(outputDir, "src", "scenes"), { recursive: true });
  mkdirSync(join(outputDir, "res", "characters"), { recursive: true });
  mkdirSync(join(outputDir, "res", "backgrounds"), { recursive: true });
  mkdirSync(join(outputDir, "res", "items"), { recursive: true });
  mkdirSync(join(outputDir, "res", "ui"), { recursive: true });
  mkdirSync(join(outputDir, "res", "audio"), { recursive: true });
  mkdirSync(join(outputDir, "libs"), { recursive: true });

  // Write project config
  if (project.config) {
    writeFileSync(join(outputDir, "project.json"), JSON.stringify(project.config, null, 2));
  }

  // Write scripts
  if (project.scripts) {
    for (const script of project.scripts) {
      const scriptDir = dirname(join(outputDir, "src", script.filename));
      mkdirSync(scriptDir, { recursive: true });
      writeFileSync(join(outputDir, "src", script.filename), script.content);
    }
  }

  // Write scenes
  if (project.scenes) {
    for (const scene of project.scenes) {
      writeFileSync(join(outputDir, "src", "scenes", scene.filename), scene.content);
    }
  }

  // Write index.html
  if (project.indexHtml) {
    writeFileSync(join(outputDir, "index.html"), project.indexHtml);
  }

  // Write resource list
  if (project.resources) {
    writeFileSync(join(outputDir, "resources.json"), JSON.stringify(project.resources, null, 2));
  }

  spinner.succeed("LayaAir project generated!");

  const files = [
    "project.json",
    "index.html",
    ...(project.scripts?.map((s: any) => `src/${s.filename}`) || []),
    ...(project.scenes?.map((s: any) => `src/scenes/${s.filename}`) || []),
  ];

  render.fileList(files.map((f: string) => `${outputDir}/${f}`));

  render.info("Tip: After generating images using layagen prompts in Midjourney/SD,");
  render.info("      place them in res/ directories, then open the project in LayaAir IDE.");

  return { name: projectName, path: outputDir, files, config: project.config };
}

function createMockProject(gameDoc: any) {
  const projectName = gameDoc.name ? gameDoc.name.toLowerCase().replace(/\s+/g, "-") : "ninja-cat-run";

  return {
    config: {
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
    },
    scripts: [
      {
        filename: "scripts/PlayerController.ts",
        content: `import { Laya } from "Laya";
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
    if (this.rigidbody) {
      const v = this.rigidbody.linearVelocity;
      this.rigidbody.linearVelocity = { x: this.moveSpeed, y: v.y };
    }
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
}`,
      },
      {
        filename: "scripts/GameManager.ts",
        content: `import { Laya } from "Laya";
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
    this.scoreText = this.owner.scene.getChildByName("ScoreText") as Text;
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
      this.scoreText.text = "Score: " + this.score;
    }
  }

  onDestroy(): void {
    Laya.stage.off("CoinCollected", this, this.onCoinCollected);
    Laya.stage.off("PlayerHit", this, this.onPlayerHit);
    Laya.stage.off("PlayerFell", this, this.onPlayerHit);
  }
}`,
      },
      {
        filename: "scripts/ItemCollector.ts",
        content: `import { Laya } from "Laya";
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
    Laya.stage.event("SpawnEffect", {
      position: (this.owner as any).transform.position,
      type: "collect"
    });
    this.owner.destroy();
  }
}`,
      },
    ],
    scenes: [],
    indexHtml: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${gameDoc.name || "Game"}</title>
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
</html>`,
    resources: [],
  };
}

import { dirname } from "node:path";
