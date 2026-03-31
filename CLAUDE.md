# CLAUDE.md — obsidian-maproom

######## IMPORTANT! SHELL TARGET: ZSH ######## IMPORTANT! SHELL TARGET: ZSH ########
All commands execute in ZSH. Use POSIX-compatible syntax. Never use bash-only syntax.
Avoid: $RANDOM, [[ ]], bash arrays, `which`. Use: command -v, [ ], grep -E, portable syntax.
######## IMPORTANT! SHELL TARGET: ZSH ######## IMPORTANT! SHELL TARGET: ZSH ########

## What Is This

An Obsidian plugin that provides semantic search over vault documents using Maproom as a backend. Supports full-text search (FTS) by default, with optional vector/semantic search via configurable embedding providers (Ollama, OpenAI, Google Vertex AI).

## Architecture

```
obsidian-maproom/
├── src/
│   ├── main.ts          # Plugin entry point (extends obsidian.Plugin)
│   └── settings.ts      # Settings interface, defaults, settings tab
├── styles.css           # Plugin CSS
├── manifest.json        # Obsidian plugin metadata (id: "maproom")
├── esbuild.config.mjs   # Build: src/main.ts → main.js (CJS, ES2018)
└── versions.json        # Plugin version → min Obsidian version map
```

## Quick Reference

```bash
pnpm dev          # esbuild watch mode (dev)
pnpm build        # Production build (typecheck + minified bundle)
pnpm lint         # ESLint with @obsidianmd/eslint-plugin
```

## Obsidian Plugin Conventions

- **Output format is CJS** — Obsidian's plugin loader requires CommonJS, not ESM
- **main.js is NOT committed** — it's in .gitignore, uploaded to GitHub Releases only
- **manifest.json is the source of truth** for plugin metadata
- **Plugin ID is `maproom`** — NEVER change this after release
- **Tags have no `v` prefix** — `0.1.0` not `v0.1.0` (enforced by .npmrc)
- **Release assets**: main.js, manifest.json, styles.css attached to GitHub Release
- **data.json** is Obsidian's per-vault plugin data — never commit it

## Version Bumping

```bash
pnpm version patch   # bumps package.json, syncs manifest.json + versions.json, creates tag
git push --follow-tags
```

GitHub Actions creates a draft release with built assets.

## Dev Workflow

1. Run `pnpm dev` (esbuild watch mode)
2. Symlink repo to vault: `ln -s "$(pwd)" "/obsidian/.obsidian/plugins/maproom"`
3. Use Hot Reload plugin in dev vault for automatic reloading

## Maproom Integration

This plugin uses the Maproom search engine as its backend:
- **FTS**: Full-text search via SQLite FTS5 (default, zero config)
- **Vector search**: Semantic search via embeddings (Ollama default, configurable)
- **Git polling**: Change detection via `git status --porcelain` (3s interval)
- **Database**: SQLite per-repo at `~/.maproom/<repo-name>/maproom.db`

## Git Workflow

```bash
git fetch origin main
git rebase origin/main
```

## Safety Rules

**File operations must stay within this worktree.**

Never modify: system directories, home files outside worktree, other repositories, `.git` directory.
