import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  type ResourceStructure,
  retryWithBackoff,
  sleep,
} from "@layagen/shared";

export interface PrefabConfig {
  name: string;
  components: Array<{
    type: string;
    properties?: Record<string, unknown>;
  }>;
}

export interface ComponentConfig {
  type: string;
  properties?: Record<string, unknown>;
}

export interface BuildConfig {
  platform?: "web" | "wechat" | "app";
  minify?: boolean;
  compressTexture?: boolean;
}

export interface BuildResult {
  success: boolean;
  outputPath?: string;
  errors?: string[];
}

export class LayaMCPClient {
  private mcpServerPath: string;
  private workspace: string;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(options: {
    mcpServerPath: string;
    workspace: string;
  }) {
    this.mcpServerPath = options.mcpServerPath;
    this.workspace = options.workspace;
  }

  async connect(): Promise<void> {
    this.transport = new StdioClientTransport({
      command: this.mcpServerPath,
      args: ["--workspace", this.workspace],
    });

    this.client = new Client(
      {
        name: "layagen-mcp-client",
        version: "0.1.0",
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async createScene(name: string, type: "2d" | "3d" = "2d"): Promise<void> {
    return retryWithBackoff(async () => {
      await this.callTool("create_scene", { name, type });
    });
  }

  async openScene(name: string): Promise<void> {
    return retryWithBackoff(async () => {
      await this.callTool("open_scene", { name });
    });
  }

  async saveScene(): Promise<void> {
    return retryWithBackoff(async () => {
      await this.callTool("save_scene", {});
    });
  }

  async createPrefab(name: string, config: PrefabConfig): Promise<void> {
    return retryWithBackoff(async () => {
      await this.callTool("create_prefab", { name, config });
    });
  }

  async addComponent(target: string, component: ComponentConfig): Promise<void> {
    return retryWithBackoff(async () => {
      await this.callTool("add_component", { target, component });
    });
  }

  async buildProject(config: BuildConfig = {}): Promise<BuildResult> {
    return retryWithBackoff(async () => {
      const result = await this.callTool("build_project", {
        platform: config.platform || "web",
        minify: config.minify !== false,
        compressTexture: config.compressTexture !== false,
      });
      return {
        success: true,
        outputPath: `release/${config.platform || "web"}`,
      };
    });
  }

  async runPreview(): Promise<void> {
    return retryWithBackoff(async () => {
      await this.callTool("run_preview", {});
    });
  }

  async importResource(localPath: string, targetPath: string): Promise<void> {
    return retryWithBackoff(async () => {
      await this.callTool("import_resource", { localPath, targetPath });
    });
  }

  async organizeResources(structure: ResourceStructure): Promise<void> {
    return retryWithBackoff(async () => {
      await this.callTool("organize_resources", { structure });
    });
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client) {
      throw new Error("MCP client not connected. Call connect() first.");
    }
    
    return this.client.callTool({
      name,
      arguments: args,
    });
  }
}
