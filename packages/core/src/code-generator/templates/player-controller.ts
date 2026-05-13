import { Laya } from "Laya";
import { Script } from "laya/components/Script";
import { RigidBody } from "laya/physics/RigidBody";

/**
 * PlayerController - Handles player input and movement
 * Game: {{gameName}}
 */
export class PlayerController extends Laya.Script {
  /** @property {number} jumpForce Jump force applied to the player */
  public jumpForce: number = 12;
  
  /** @property {number} moveSpeed Horizontal movement speed */
  public moveSpeed: number = 5;
  
  /** @property {number} maxJumps Maximum number of jumps allowed */
  public maxJumps: number = 2;

  private rigidbody: RigidBody;
  private animator: Laya.Animator;
  private jumpCount: number = 0;
  private isGrounded: boolean = false;

  onAwake(): void {
    this.rigidbody = this.owner.getComponent(RigidBody);
    this.animator = this.owner.getComponent(Laya.Animator);
  }

  onUpdate(): void {
    // Auto-run forward
    if (this.rigidbody) {
      const velocity = this.rigidbody.linearVelocity;
      this.rigidbody.linearVelocity = { x: this.moveSpeed, y: velocity.y };
    }
  }

  onKeyDown(e: Laya.Event): void {
    if (e.keyCode === Laya.Keyboard.SPACE || e.keyCode === Laya.Keyboard.W) {
      this.jump();
    }
  }

  onMouseDown(): void {
    this.jump();
  }

  private jump(): void {
    if (!this.rigidbody) return;
    
    if (this.isGrounded || this.jumpCount < this.maxJumps) {
      const velocity = this.rigidbody.linearVelocity;
      this.rigidbody.linearVelocity = { x: velocity.x, y: -this.jumpForce };
      this.jumpCount++;
      this.isGrounded = false;
      
      // Trigger jump animation
      if (this.animator) {
        this.animator.play("jump");
      }
    }
  }

  onTriggerEnter(other: Laya.Collider): void {
    if (other.tag === "Ground") {
      this.isGrounded = true;
      this.jumpCount = 0;
    }
    
    if (other.tag === "Obstacle") {
      this.onHitObstacle();
    }
  }

  private onHitObstacle(): void {
    // Handle player death / damage
    if (this.animator) {
      this.animator.play("hurt");
    }
  }
}
