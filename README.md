# Export Img (obsidian-export-img)

Export Obsidian notes as images with **reading-view fidelity** — theme, callouts, code blocks, math, Mermaid, and embeds.

**Current version branch:** `v1.0.0`  
**Package manager:** [pnpm](https://pnpm.io/) (do not use npm/yarn for this repo)

## Features

- Export Studio: live preview is the capture target
- SettleGate waits for images, fonts, and layout stability
- Theme mode: current / light / dark
- Title & properties toggles
- Selection export (optional quick copy)
- Long-note split: fixed / hr / block boundaries
- Watermark & author bar (decorations)
- Folder batch export

## Setup

Use a **separate development vault** (never your main notes vault).

```bash
# Preferred: symlink this repo into the vault
ln -s "$(pwd)" /path/to/DevVault/.obsidian/plugins/obsidian-export-img

# Or clone / copy the repo into:
#   DevVault/.obsidian/plugins/obsidian-export-img
```

Then:

```bash
pnpm install
pnpm run dev
```

In Obsidian: Settings → Community plugins → turn on community plugins → enable **Export Img**.

Keep `pnpm run dev` running; it rebuilds `main.js` on save.

## Debug

1. Open the **dev vault** with the plugin enabled.
2. Run `pnpm run dev` in this repo (watch mode).
3. Make a code change → wait for esbuild to finish.
4. Reload the plugin:
   - Install [Hot Reload](https://github.com/pjeby/hot-reload) (recommended), or
   - Settings → Community plugins → toggle **Export Img** off/on, or
   - Fully restart Obsidian.
5. Open DevTools: `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux) → Console for errors.
6. Exercise Export Studio with [`fixtures/fidelity-checklist.md`](fixtures/fidelity-checklist.md) and compare to Reading view.

Useful checks:

- Settle panel reaches **Ready** before Copy/Save
- Callouts / code / math / Mermaid / embeds match Reading view
- Mobile: save goes into the vault (no OS file picker)

## Build

```bash
pnpm run build
```

Produces production `main.js` next to `manifest.json` and `styles.css`.

## Release

Branch model: daily work on `vX.Y.Z` (now `v1.0.0`) → merge to `dev` → tag `Version_X.Y.Z` → squash to `main`.

### 1. Bump version

Align these three:

- `package.json` → `version`
- `manifest.json` → `version`
- `versions.json` → add `"X.Y.Z": "minAppVersion"`

Helper (updates `manifest.json` + `versions.json` from `package.json`):

```bash
pnpm version 1.0.0 --no-git-tag-version
# runs the "version" script → version-bump.mjs
```

Or edit the three files by hand.

### 2. Local verify

```bash
pnpm run build
# Confirm main.js / manifest.json / styles.css load in the dev vault
```

### 3. Git release (this repo)

```bash
# On v1.0.0: finish work, then integrate
git checkout dev
git merge v1.0.0 --no-edit

# Tag on the release commit (tag name ≠ branch name)
git tag -a Version_1.0.0 -m "Release 1.0.0"

# Squash onto main
git checkout main
git merge --squash dev
git commit -m "release(1.0.0): fidelity-first image export"
```

Push when ready (`origin` + tags). Do **not** use `v1.0.0` as a tag name (conflicts with the branch).

### 4. GitHub Release assets

Obsidian needs a GitHub Release whose tag matches `manifest.json` version, with these files attached:

- `main.js`
- `manifest.json`
- `styles.css`

You can create a draft release manually, or add a GitHub Action that builds with `pnpm` and uploads those three files on tag push.

### 5. Community plugins (first publish)

1. Publish the GitHub Release (not draft) with the three assets.
2. Follow Obsidian’s [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin) process (PR to `obsidianmd/obsidian-releases`).
3. Later updates: new GitHub Release with bumped version; users update from Community plugins.

## DOM hooks for custom CSS

```html
<div class="export-img-host markdown-reading-view">
  <div class="export-img-capture">
    <div class="markdown-preview-view markdown-rendered export-img-preview">
      <div class="inline-title export-img-title"></div>
      <div class="metadata-container export-img-metadata"></div>
      <div class="markdown-preview-sizer">…</div>
    </div>
    <div class="export-img-author">…</div>
    <div class="export-img-watermark">…</div>
  </div>
</div>
```

## Fidelity checklist

Use a note containing:

- Callouts
- Fenced code with highlighting
- Local / wiki-embedded images
- `$inline$` and `$$block$$` math
- Mermaid fence
- Nested embeds

Confirm Studio settle status reaches **Ready**, then Copy/Save and compare to Reading view.
