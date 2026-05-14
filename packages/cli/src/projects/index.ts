/**
 * Project management - save/load game projects with full context
 */
import { homedir } from "node:os";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const PROJECTS_DIR = join(homedir(), ".layagen", "projects");

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  genre?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  meta: ProjectMeta;
  gameDoc?: any;
  promptPackage?: any;
  projectConfig?: any;
}

function ensureProjectsDir(): void {
  mkdirSync(PROJECTS_DIR, { recursive: true });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * List all existing projects
 */
export function listProjects(): ProjectMeta[] {
  ensureProjectsDir();
  const projects: ProjectMeta[] = [];

  for (const entry of readdirSync(PROJECTS_DIR)) {
    const metaPath = join(PROJECTS_DIR, entry, "meta.json");
    if (existsSync(metaPath)) {
      try {
        const meta: ProjectMeta = JSON.parse(readFileSync(metaPath, "utf-8"));
        projects.push(meta);
      } catch {
        // Skip corrupted meta files
      }
    }
  }

  // Sort by updatedAt descending
  return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Create a new project
 */
export function createProject(name: string, description: string): ProjectData {
  ensureProjectsDir();
  const id = slugify(name) || `project-${Date.now()}`;
  const projectDir = join(PROJECTS_DIR, id);
  mkdirSync(projectDir, { recursive: true });

  const now = new Date().toISOString();
  const meta: ProjectMeta = {
    id,
    name,
    description,
    createdAt: now,
    updatedAt: now,
  };

  const data: ProjectData = { meta };
  saveProjectData(id, data);
  return data;
}

/**
 * Load project data by ID
 */
export function loadProject(projectId: string): ProjectData | null {
  const projectDir = join(PROJECTS_DIR, projectId);
  if (!existsSync(projectDir)) return null;

  const data: ProjectData = { meta: loadMeta(projectId) };

  const gameDocPath = join(projectDir, "game-doc.json");
  if (existsSync(gameDocPath)) {
    try {
      data.gameDoc = JSON.parse(readFileSync(gameDocPath, "utf-8"));
    } catch {
      // Ignore corrupted file
    }
  }

  const promptsPath = join(projectDir, "prompts.json");
  if (existsSync(promptsPath)) {
    try {
      data.promptPackage = JSON.parse(readFileSync(promptsPath, "utf-8"));
    } catch {
      // Ignore corrupted file
    }
  }

  const projectConfigPath = join(projectDir, "project-config.json");
  if (existsSync(projectConfigPath)) {
    try {
      data.projectConfig = JSON.parse(readFileSync(projectConfigPath, "utf-8"));
    } catch {
      // Ignore corrupted file
    }
  }

  return data;
}

/**
 * Save project data
 */
export function saveProjectData(projectId: string, data: Partial<ProjectData>): void {
  const projectDir = join(PROJECTS_DIR, projectId);
  mkdirSync(projectDir, { recursive: true });

  if (data.meta) {
    data.meta.updatedAt = new Date().toISOString();
    writeFileSync(join(projectDir, "meta.json"), JSON.stringify(data.meta, null, 2));
  }

  if (data.gameDoc !== undefined) {
    writeFileSync(join(projectDir, "game-doc.json"), JSON.stringify(data.gameDoc, null, 2));
  }

  if (data.promptPackage !== undefined) {
    writeFileSync(join(projectDir, "prompts.json"), JSON.stringify(data.promptPackage, null, 2));
  }

  if (data.projectConfig !== undefined) {
    writeFileSync(join(projectDir, "project-config.json"), JSON.stringify(data.projectConfig, null, 2));
  }
}

function loadMeta(projectId: string): ProjectMeta {
  const metaPath = join(PROJECTS_DIR, projectId, "meta.json");
  return JSON.parse(readFileSync(metaPath, "utf-8"));
}

/**
 * Check if a project exists
 */
export function projectExists(projectId: string): boolean {
  return existsSync(join(PROJECTS_DIR, projectId, "meta.json"));
}

/**
 * Delete a project
 */
export function deleteProject(projectId: string): void {
  const projectDir = join(PROJECTS_DIR, projectId);
  if (existsSync(projectDir)) {
    try {
      // @ts-ignore
      require("node:fs").rmSync(projectDir, { recursive: true, force: true });
    } catch {
      const { rmdirSync } = require("node:fs");
      rmdirSync(projectDir, { recursive: true });
    }
  }
}
