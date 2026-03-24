import { join, dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { type AiTool } from "./tools";

const AI_TRAILERS_MARKER = "ai-trailers";

/**
 * Check if our hook is already installed in a tool's settings file.
 */
async function isInstalled(settingsPath: string): Promise<boolean> {
  const file = Bun.file(settingsPath);
  if (!(await file.exists())) return false;
  const content = await file.text();
  return content.includes(AI_TRAILERS_MARKER);
}

/**
 * Deep merge two objects. Arrays are concatenated.
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (Array.isArray(source[key]) && Array.isArray(result[key])) {
      result[key] = [...result[key], ...source[key]];
    } else if (
      source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) &&
      result[key] && typeof result[key] === "object" && !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Install hook settings for a single tool.
 * Returns true if installed, false if already installed.
 */
export async function installTool(tool: AiTool, cwd: string = process.cwd()): Promise<boolean> {
  const settingsPath = join(cwd, tool.hook.settingsPath);

  if (await isInstalled(settingsPath)) {
    return false;
  }

  // Read existing settings or start fresh
  const file = Bun.file(settingsPath);
  let existing: Record<string, any> = {};
  if (await file.exists()) {
    try {
      existing = JSON.parse(await file.text());
    } catch {
      existing = {};
    }
  }

  // Merge our hook config into existing settings
  const hookConfig = tool.hook.generateConfig();
  const merged = deepMerge(existing, hookConfig);

  // Ensure directory exists
  await mkdir(dirname(settingsPath), { recursive: true });

  await Bun.write(settingsPath, JSON.stringify(merged, null, 2) + "\n");
  return true;
}
