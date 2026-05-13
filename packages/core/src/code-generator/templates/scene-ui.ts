import { Laya } from "Laya";
import { Script } from "laya/components/Script";
import { Button } from "laya/ui/Button";
import { Text } from "laya/ui/Text";

/**
 * UIScene - UI overlay scene for HUD and menus
 * Game: {{gameName}}
 */
export class UIScene extends Laya.Script {
  
  onAwake(): void {
    this.createScoreDisplay();
    this.createPauseButton();
  }

  onEnable(): void {
    Laya.stage.on("ScoreUpdate", this, this.onScoreUpdate);
    Laya.stage.on("GameOver", this, this.onGameOver);
  }

  onDisable(): void {
    Laya.stage.off("ScoreUpdate", this, this.onScoreUpdate);
    Laya.stage.off("GameOver", this, this.onGameOver);
  }

  private createScoreDisplay(): void {
    const scoreText = new Text();
    scoreText.text = "Score: 0";
    scoreText.fontSize = 32;
    scoreText.color = "#FFD700";
    scoreText.pos(20, 20);
    this.owner.addChild(scoreText);
  }

  private createPauseButton(): void {
    const btn = new Button();
    btn.label = "||";
    btn.width = 60;
    btn.height = 60;
    btn.pos(Laya.stage.width - 80, 20);
    btn.on(Laya.Event.CLICK, this, this.onPauseClick);
    this.owner.addChild(btn);
  }

  private onPauseClick(): void {
    Laya.stage.event("PauseGame");
  }

  private onScoreUpdate(data: { score: number }): void {
    console.log(`[UI] Score updated: ${data.score}`);
  }

  private onGameOver(data: { score: number; highScore: number }): void {
    console.log(`[UI] Game Over! Score: ${data.score}`);
  }
}
