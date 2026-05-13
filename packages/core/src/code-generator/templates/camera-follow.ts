import { Laya } from "Laya";
import { Script } from "laya/components/Script";
import { Camera } from "laya/d3/core/Camera";

/**
 * CameraFollow - Smooth camera following the player
 * Game: {{gameName}}
 */
export class CameraFollow extends Laya.Script {
  /** @property {Laya.Sprite} target The target to follow */
  public target: Laya.Sprite;
  
  /** @property {number} smoothSpeed Camera follow smoothness (0-1) */
  public smoothSpeed: number = 0.1;
  
  /** @property {number} offsetX Horizontal offset from target */
  public offsetX: number = 200;
  
  /** @property {number} offsetY Vertical offset from target */
  public offsetY: number = 0;

  private camera: Laya.Sprite;

  onAwake(): void {
    this.camera = this.owner as Laya.Sprite;
  }

  onLateUpdate(): void {
    if (!this.target || !this.camera) return;

    const targetX = this.target.x + this.offsetX;
    const targetY = this.target.y + this.offsetY;

    // Smooth follow with Lerp
    const newX = this.camera.x + (targetX - this.camera.x) * this.smoothSpeed;
    const newY = this.camera.y + (targetY - this.camera.y) * this.smoothSpeed;

    this.camera.x = newX;
    this.camera.y = newY;
  }
}
