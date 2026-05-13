import { Laya } from "Laya";
import { Script } from "laya/components/Script";
import { Scene } from "laya/display/Scene";

/**
 * MainScene - Primary gameplay scene
 * Game: {{gameName}}
 */
export class MainScene extends Laya.Script {
  
  onAwake(): void {
    console.log("[MainScene] Loading...");
    this.setupLayers();
    this.spawnPlayer();
  }

  onEnable(): void {
    // Initialize game session
    Laya.stage.event("GameStart");
  }

  private setupLayers(): void {
    // Create layer hierarchy
    const bgLayer = new Laya.Sprite();
    bgLayer.name = "BackgroundLayer";
    
    const gameLayer = new Laya.Sprite();
    gameLayer.name = "GameLayer";
    
    const uiLayer = new Laya.Sprite();
    uiLayer.name = "UILayer";
    
    this.owner.addChild(bgLayer);
    this.owner.addChild(gameLayer);
    this.owner.addChild(uiLayer);
  }

  private spawnPlayer(): void {
    // Player spawning logic
    console.log("[MainScene] Spawning player");
  }
}
