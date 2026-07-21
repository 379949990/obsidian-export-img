<p align="center">
  <img src="https://socialify.git.ci/379949990/obsidian-export-img/image?description=1&amp;font=KoHo&amp;language=1&amp;logo=https%3A%2F%2Fobsidian.md%2Fimages%2Fobsidian-logo-gradient.svg&amp;name=1&amp;owner=1&amp;pattern=Plus&amp;theme=Auto" alt="Export Img" width="100%" />
</p>

<p align="center">
  <strong>Export Img</strong> — reading-view fidelity, then a pixel-perfect image.<br/>
  Theme · Callouts · Code · Math · Mermaid · Embeds · Properties
</p>

<p align="center">
  <a href="https://github.com/379949990/obsidian-export-img/releases"><img alt="release" src="https://img.shields.io/github/v/release/379949990/obsidian-export-img?include_prereleases&amp;style=flat-square" /></a>
  <img alt="obsidian" src="https://img.shields.io/badge/Obsidian-1.5%2B-7c3aed?style=flat-square" />
  <img alt="pnpm" src="https://img.shields.io/badge/package%20manager-pnpm-f69220?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

---

## Why this plugin

Most “export as image” tools screenshot a flattened DOM and hope for the best. **Export Img** treats the Reading view as the source of truth:

1. **Render** with Obsidian’s own `MarkdownRenderer`
2. **Settle** until images, fonts, and async diagrams are ready
3. **Fit** wide blocks (Mermaid, tables, code) to the content width
4. **Capture** with `modern-screenshot` at the resolution you choose for export

Studio preview stays at **1×** so iteration stays fast. **Copy / Save** use your configured multiplier (default **2×**).

**Current development branch:** `v1.0.0` · **Package manager:** [pnpm](https://pnpm.io/) only

---

## Features

| Capability | Detail |
| --- | --- |
| Export Studio | Live bitmap preview with pan / zoom; WYSIWYG controls |
| SettleGate | Waits for media & Mermaid before declaring Ready |
| Theme modes | Current · Light · Dark |
| Chrome | Note title, Properties, padding (preset ↔ document) |
| Media limits | Max height + align for embeds / Mermaid / wide blocks |
| Long notes | Split by fixed height (A4 default), HR, or block boundaries — never mid-element |
| Decorations | Text / image watermark, author bar |
| Batch | Folder → ZIP of images |
| Selection | Export selection; optional quick copy |

---

## Install (users)

1. Community plugins → search **Export Img** *(after first publish)*, or
2. Manual: download `main.js` + `manifest.json` + `styles.css` from [Releases](https://github.com/379949990/obsidian-export-img/releases) into `.obsidian/plugins/obsidian-export-img/`

---

## Develop

Use a **dedicated vault** — never your daily notes vault.

```bash
git clone https://github.com/379949990/obsidian-export-img.git
cd obsidian-export-img
pnpm install

# Symlink into the dev vault
ln -s "$(pwd)" /path/to/DevVault/.obsidian/plugins/obsidian-export-img

pnpm run dev
```

Enable **Export Img** in Obsidian. Keep `pnpm run dev` running (esbuild watch). Prefer [Hot Reload](https://github.com/pjeby/hot-reload), or toggle the plugin after each rebuild.

**Smoke test:** open [`fixtures/export-fidelity-lab.md`](fixtures/export-fidelity-lab.md) in the vault, run Export Studio, wait for **Ready**, compare to Reading view, then Copy / Save.

```bash
pnpm run build   # tsc + production bundle → main.js
```

---

## Resolution & performance

| Path | Scale | Fonts embedded | Intent |
| --- | ---: | --- | --- |
| Studio preview | **1×** | No | Fast Ready feedback |
| Copy / Save | **1× / 2× / 3×** | Yes (WOFF2 preferred) | Export sharpness |

Higher multipliers cost more time roughly with pixel area — choose 2× for sharing, 3× when you will crop/zoom.

---

## Long-note split

- **Fixed / Auto:** pack whole blocks into pages; default page content height = `width × 1.414` (A4).
- **HR:** cut on horizontal rules.
- Each page keeps its own padding; blocks are never sliced mid-element (a single oversized block may exceed the target height).

---

## Release flow

Daily work on `vX.Y.Z` → merge `dev` → tag **`Version_X.Y.Z`** (not `vX.Y.Z`) → squash to `main`.

Align `package.json` / `manifest.json` / `versions.json`, then:

```bash
pnpm run build
# Attach main.js, manifest.json, styles.css to the GitHub Release
```

---

## DOM hooks (custom CSS)

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

---

## Credits

Capture powered by [modern-screenshot](https://github.com/qq15725/modern-screenshot). Inspired by the broader Obsidian export-image ecosystem; this project prioritizes **reading-view fidelity** over feature sprawl.

## License

MIT · Egoism ([@379949990](https://github.com/379949990))
