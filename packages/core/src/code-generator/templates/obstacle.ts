import { Laya } from "Laya";
import { Script } from "laya/components/Script";

/**
 * Obstacle - Handles obstacle/hazard behavior
 * Game: {{gameName}}
 */
export class Obstacle extends Laya.Script {
  /** @property {number} damage Damage dealt on collision */
  public damage: number = 1;
  
  /** @property {boolean} isMovable Whether the obstacle moves */
  public isMovable: boolean = false;

  onTriggerEnter(other: Laya.Collider): void {
    if (other.tag === "Player") {
      this.onPlayerHit(other);
    }
  }

  onUpdate(): void {
    if (this.isMovable) {
      this.updateMovement();
    }
  }

  private onPlayerHit(player: Laya.Collider): void {
    Laya.stage.event("PlayerDamaged", { damage: this.damage });
    
    // Visual feedback
    const sprite = this.owner as Laya.Sprite;
    if (sprite) {
      sprite.alpha = 0.5;
      Laya.timer.once(200, this, () => { sprite.alpha = 1; });
    }
  }

  private updateMovement(): void {
    // Override for moving obstacles
  }
}
