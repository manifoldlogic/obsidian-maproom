# Maproom

Semantic search for Obsidian vaults powered by [Maproom](https://github.com/manifoldlogic/crewchief) — full-text search, vector embeddings, and git-based incremental indexing.

> **Status:** Early development. Not yet available in the Obsidian community plugin browser.

## Planned Features

- **Full-text search** across vault documents via Maproom FTS
- **Semantic/vector search** with configurable embedding providers:
  - Ollama (default, local, zero-cost)
  - OpenAI (API key required)
  - Google Vertex AI (API key required)
  - FTS-only fallback when no provider is available
- **Background indexing** daemon with git-based change detection
- **Status dashboard** in settings showing indexing progress and embedding coverage
- **Cross-environment search** — Maproom instances in dev containers can query Obsidian-indexed content

## Requirements

- Obsidian 1.0+
- Vault must be a git repository (Maproom uses git for change detection)
- Ollama running locally (optional, for semantic search)

## Installation

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/manifoldlogic/obsidian-maproom/releases)
2. Create a folder `<vault>/.obsidian/plugins/maproom/`
3. Copy the downloaded files into that folder
4. Restart Obsidian and enable the plugin in Settings > Community Plugins

### Community Plugin Browser

Not yet available. Coming after initial development is complete.

## Development

### Prerequisites

- Node.js 22+
- pnpm

### Setup

```bash
git clone git@github.com:manifoldlogic/obsidian-maproom.git
cd obsidian-maproom
pnpm install
```

### Dev workflow

```bash
# Start esbuild in watch mode
pnpm dev

# In another terminal, symlink to your vault for hot-reload testing
ln -s "$(pwd)" "<vault-path>/.obsidian/plugins/maproom"
```

Install the [Hot Reload](https://github.com/pjeby/hot-reload) plugin in your dev vault for automatic reloading on changes.

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

### Releasing

```bash
pnpm version patch  # or minor, major
git push --follow-tags
```

This bumps the version in `package.json`, syncs it to `manifest.json` and `versions.json`, creates a git tag, and pushes. GitHub Actions creates a draft release with the built assets.

## License

MIT
