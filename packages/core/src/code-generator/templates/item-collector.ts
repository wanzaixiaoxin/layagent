import { Laya } from "Laya";
import { Script } from "laya/components/Script";

/**
 * ItemCollector - Handles collectible item behavior
 * Game: {{gameName}}
 */
export class ItemCollector extends Laya.Script {
  /** @property {number} pointValue Points awarded when collected */
  public pointValue: number = 10;
  
  /** @property {string} itemType Type of item (coin, powerup, etc.) */
  public itemType: string = "coin";

  onTriggerEnter(other: Laya.Collider): void {
    if (other.tag === "Player") {
      this.collect();
    }
  }

  private collect(): void {
    // Award points
    Laya.stage.event("ScoreUpdate", { score: this.pointValue });
    
    // Spawn collection effect
    this.spawnCollectionEffect();
    
    // Remove item
    this.owner.destroy();
  }

  private spawnCollectionEffect(): void {
    // Visual feedback for collection
    console.log(`[Item] Collected ${this.itemType} (+${this.pointValue}pts)`);
  }
}
