import { Laya } from "Laya";
import { Script } from "laya/components/Script";
import { Text } from "laya/ui/Text";

/**
 * GameManager - Manages game state, score, and lifecycle
 * Game: {{gameName}}
 */
export class GameManager extends Laya.Script {
  /** @property {number} score Current game score */
  public score: number = 0;
  
  /** @property {number} highScore Best score achieved */
  public highScore: number = 0;
  
  /** @property {boolean} isGameOver Whether the game has ended */
  public isGameOver: boolean = false;
  
  /** @property {boolean} isPaused Whether the game is paused */
  public isPaused: boolean = false;

  private scoreText: Text;
  private timer: number = 0;

  onAwake(): void {
    Laya.timer.frameLoop(1, this, this.onGameTick);
  }

  onEnable(): void {
    this.score = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.updateScoreDisplay();
  }

  addScore(points: number): void {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    this.updateScoreDisplay();
  }

  pauseGame(): void {
    this.isPaused = true;
    Laya.timer.pause();
  }

  resumeGame(): void {
    this.isPaused = false;
    Laya.timer.resume();
  }

  gameOver(): void {
    this.isGameOver = true;
    Laya.timer.clearAll(this);
    
    // Dispatch game over event
    Laya.stage.event("GameOver", { score: this.score, highScore: this.highScore });
  }

  restartGame(): void {
    this.score = 0;
    this.isGameOver = false;
    this.isPaused = false;
    Laya.stage.event("RestartGame");
  }

  private onGameTick(): void {
    if (this.isGameOver || this.isPaused) return;
    this.timer++;
  }

  private updateScoreDisplay(): void {
    if (this.scoreText) {
      this.scoreText.text = `Score: ${this.score}`;
    }
  }
}
