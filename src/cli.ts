#!/usr/bin/env bun

import { isGitRepo, detectTools } from "./detect";
import { capture } from "./capture";
import {
  installTool,
  installGitHook,
  ensureGitignore,
  removeTool,
  removeGitHook,
  removeGitignore,
  getStatus,
} from "./install";
import { getToolByName, getTools } from "./tools";

const command = Bun.argv[2];

switch (command) {
  case "init":
    await init();
    break;
  case "install":
    await install();
    break;
  case "remove":
    await remove();
    break;
  case "status":
    await status();
    break;
  case "log":
    await log();
    break;
  case "capture":
    await capture();
    break;
  default:
    usage();
}

async function requireGitRepo() {
  if (!(await isGitRepo())) {
    console.error("Error: not a git repository. Run `git init` first.");
    process.exit(1);
  }
}

async function init() {
  await requireGitRepo();
  console.log("Initializing ai-trailers...\n");

  const tools = await detectTools();

  if (tools.length === 0) {
    console.log("No AI coding tools detected.");
    return;
  }

  console.log("Detected AI coding tools:");
  for (const tool of tools) {
    console.log(`  - ${tool.name} (${tool.foundMarkers.join(", ")})`);
  }

  console.log("\nInstalling hooks...");
  for (const tool of tools) {
    const installed = await installTool(tool);
    if (installed) {
      console.log(`  + ${tool.name} hook installed (${tool.hook.settingsPath})`);
    } else {
      console.log(`  ~ ${tool.name} hook already installed, skipping`);
    }
  }

  console.log("\nInstalling git commit-msg hook...");
  const hookInstalled = await installGitHook();
  if (hookInstalled) {
    console.log("  + commit-msg hook installed");
  } else {
    console.log("  ~ commit-msg hook already installed, skipping");
  }

  const ignored = await ensureGitignore();
  if (ignored) {
    console.log("  + .ai-trailers added to .gitignore");
  } else {
    console.log("  ~ .ai-trailers already in .gitignore");
  }

  console.log("\nDone!");
}

async function install() {
  await requireGitRepo();

  const toolName = Bun.argv[3];
  if (!toolName) {
    console.error("Usage: ai-trailers install <tool-name>");
    console.error(`Available tools: ${getTools().map((t) => t.name).join(", ")}`);
    process.exit(1);
  }

  const tool = getToolByName(toolName);
  if (!tool) {
    console.error(`Unknown tool: ${toolName}`);
    console.error(`Available tools: ${getTools().map((t) => t.name).join(", ")}`);
    process.exit(1);
  }

  const installed = await installTool(tool);
  if (installed) {
    console.log(`Installed ${tool.name} hook (${tool.hook.settingsPath})`);
  } else {
    console.log(`${tool.name} hook already installed, skipping`);
  }
}

async function remove() {
  await requireGitRepo();

  const toolName = Bun.argv[3];

  // Remove a specific tool
  if (toolName) {
    const tool = getToolByName(toolName);
    if (!tool) {
      console.error(`Unknown tool: ${toolName}`);
      console.error(`Available tools: ${getTools().map((t) => t.name).join(", ")}`);
      process.exit(1);
    }

    const removed = await removeTool(tool);
    if (removed) {
      console.log(`Removed ${tool.name} hook`);
    } else {
      console.log(`${tool.name} hook not installed`);
    }
    return;
  }

  // Remove everything
  console.log("Removing ai-trailers...\n");

  console.log("Removing tool hooks...");
  for (const tool of getTools()) {
    const removed = await removeTool(tool);
    if (removed) {
      console.log(`  - ${tool.name} hook removed`);
    }
  }

  const hookRemoved = await removeGitHook();
  if (hookRemoved) {
    console.log("  - commit-msg hook removed");
  }

  const gitignoreRemoved = await removeGitignore();
  if (gitignoreRemoved) {
    console.log("  - .ai-trailers removed from .gitignore");
  }

  console.log("\nDone!");
}

async function status() {
  await requireGitRepo();

  const { toolStatuses, gitHookInstalled, gitignored, pendingPrompts } = await getStatus(
    getTools()
  );

  console.log("ai-trailers status\n");

  console.log("Tool hooks:");
  for (const t of toolStatuses) {
    const icon = t.installed ? "✓" : "✗";
    const state = t.installed ? "installed" : "not installed";
    console.log(`  ${icon} ${t.name}: ${state}`);
  }

  console.log("");
  console.log(`Git hook:    ${gitHookInstalled ? "✓ installed" : "✗ not installed"}`);
  console.log(`Gitignore:   ${gitignored ? "✓ .ai-trailers ignored" : "✗ .ai-trailers not ignored"}`);
  console.log(`Pending:     ${pendingPrompts} prompt(s)`);
}

async function log() {
  await requireGitRepo();

  const count = Bun.argv[3] || "20";
  const proc = Bun.spawnSync(
    [
      "git",
      "log",
      `--max-count=${count}`,
      "--format=%h %s%n%(trailers:key=AI-Tool,key=AI-Prompt,key=AI-Timestamp,separator=%x2C )",
    ],
    { cwd: process.cwd() }
  );

  const output = proc.stdout.toString().trim();
  if (!output) {
    console.log("No commits found.");
    return;
  }

  // Filter to only show commits that have AI trailers
  const lines = output.split("\n");
  let hasTrailers = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("AI-Tool:") || line.startsWith("AI-Prompt:") || line.startsWith("AI-Timestamp:")) {
      hasTrailers = true;
      console.log(`  ${line}`);
    } else if (line.trim() !== "") {
      if (i > 0) console.log("");
      console.log(line);
    }
  }

  if (!hasTrailers) {
    console.log("No commits with AI trailers found.");
  }
}

function usage() {
  console.log(`ai-trailers - Capture AI coding tool prompts as git trailers in commit messages

Usage: ai-trailers <command>

Commands:
  init               Initialize ai-trailers in the current repo
  install <tool>     Install hook for a specific tool
  remove [tool]      Remove all hooks, or a specific tool's hook
  status             Show installation status and pending prompts
  log [count]        Show recent commits with AI trailers (default: 20)
  capture            Capture a prompt from stdin (used by tool hooks)

Available tools: ${getTools().map((t) => t.name).join(", ")}`);
}
