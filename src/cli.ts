#!/usr/bin/env bun

import { isGitRepo, detectTools } from "./detect";

const command = Bun.argv[2];

switch (command) {
  case "init":
    await init();
    break;
  default:
    usage();
}

async function init() {
  if (!(await isGitRepo())) {
    console.error("Error: not a git repository. Run `git init` first.");
    process.exit(1);
  }

  console.log("Initializing ai-trailers...\n");

  const tools = await detectTools();

  if (tools.length === 0) {
    console.log("No AI coding tools detected.");
  } else {
    console.log("Detected AI coding tools:");
    for (const tool of tools) {
      console.log(`  - ${tool.name} (${tool.markers.join(", ")})`);
    }
  }
}

function usage() {
  console.log(`ai-trailers - Capture AI coding tool prompts as git trailers in commit messages

Usage: ai-trailers <command>

Commands:
  init      Initialize ai-trailers in the current repo`);
}
