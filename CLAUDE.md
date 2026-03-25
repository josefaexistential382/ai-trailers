# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ai-trailers is a Bun-only CLI tool (`bunx ai-trailers`) that captures AI coding tool prompts and embeds them as standard git trailers in commit messages. No runtime dependencies — uses only Bun built-ins and Node.js standard library.

## Commands

```bash
bun ./src/cli.ts <command>    # Run CLI directly during development
bun install                   # Install dev dependencies
bun test                      # Run tests (bun:test)
```

## Bun conventions

Default to Bun instead of Node.js for everything: `bun` not `node`, `bunx` not `npx`, `bun install` not `npm install`. Prefer `Bun.file`/`Bun.write` over `node:fs` readFile/writeFile. Bun auto-loads `.env` — don't use dotenv.

## Architecture

Data flow: AI Tool hook → `capture` command → `.ai-trailers` file → `commit-msg` git hook → commit message trailers → file cleared.

**Modules:**

- **`src/cli.ts`** — Entry point and command dispatcher. Imports all other modules. Reads version from `package.json`.
- **`src/tools.ts`** — Tool registry. Single source of truth for supported tools (name, marker files, hook event, config format). To add a new tool, add one entry to the `tools` array.
- **`src/detect.ts`** — Detects AI tools by checking for marker files/directories. Uses the registry from `tools.ts`.
- **`src/capture.ts`** — Reads JSON with a `prompt` field from stdin, appends formatted git trailers to `.ai-trailers`. Called as `ai-trailers capture --tool <name>`.
- **`src/install.ts`** — Installs/removes tool hook configs (deep-merges into existing settings files), the `commit-msg` git hook, and `.gitignore` entries. Respects `core.hooksPath`.

**Key design:** All AI tools pipe JSON with a `prompt` field to stdin, so one capture command handles all tools. Each tool only differs in its hook configuration format (defined in `tools.ts`).
