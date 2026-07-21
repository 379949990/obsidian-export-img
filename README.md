<p align="center">
  <img src="https://socialify.git.ci/379949990/obsidian-export-img/image?description=1&amp;font=KoHo&amp;language=1&amp;logo=https%3A%2F%2Fobsidian.md%2Fimages%2Fobsidian-logo-gradient.svg&amp;name=1&amp;owner=1&amp;pattern=Plus&amp;theme=Auto" alt="Export Img" width="100%" />
</p>

<p align="center">
  <strong>Export Img</strong> — a high-fidelity <em>approximation</em> of Reading view as an image.<br/>
  Theme · Callouts · Code · Math · Mermaid · Embeds · Properties
</p>

<p align="center">
  <a href="https://github.com/379949990/obsidian-export-img/releases"><img alt="release" src="https://img.shields.io/github/v/release/379949990/obsidian-export-img?include_prereleases&amp;style=flat-square" /></a>
  <img alt="obsidian" src="https://img.shields.io/badge/Obsidian-1.5.7%2B-7c3aed?style=flat-square" />
  <img alt="pnpm" src="https://img.shields.io/badge/package%20manager-pnpm-f69220?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

---

## Why this plugin

Most “export as image” tools screenshot a flattened DOM and hope for the best. **Export Img** uses Reading view as the **visual target**, then rebuilds a capture host:

1. **Render** with Obsidian’s own `MarkdownRenderer`
2. **Settle** until images, fonts, and async diagrams are ready (soft timeouts — see below)
3. **Fit** wide blocks (Mermaid, tables, code) to the content width
4. **Capture** with `modern-screenshot` at the resolution you choose for export

Studio preview stays at **1×** so iteration stays fast. **Copy / Save** use your configured multiplier (default **2×**). Preview and export are intentionally not identical (scale + font embedding).

---

## Features

| Capability | Detail |
| --- | --- |
| Export Studio | Live bitmap preview with pan / zoom; shared controls with export |
| SettleGate | Waits for media & Mermaid before Ready; slow assets may soft-timeout |
| Theme modes | Current · Light · Dark (core CSS variables; community themes may diverge) |
| Chrome | Note title, Properties, padding (preset ↔ document) |
| Media limits | Max height + align for embeds / Mermaid / wide blocks |
| Long notes | Split by fixed height (A4 default), HR, or block boundaries — never mid-element |
| Decorations | Text / image watermark, author bar |
| Batch | Folder → ZIP of images |
| Selection | Export selection; optional quick copy |

---

## Known differences vs Reading view

Exports are **not** a pixel-perfect clone of the open Reading pane:

- Capture uses an offscreen host, not the live Reading DOM
- Wide blocks are scaled/fitted for the chosen export width
- Community themes and plugin-rendered blocks may look different
- Studio preview is 1× without font embedding; Copy/Save use your scale with fonts
- Settle can proceed after soft timeouts (slow remote images / Mermaid)

Use Reading view as the baseline for visual QA, not as a guarantee of identity.

---

## Install (users)

1. Community plugins → search **Export Img** *(after first publish)*, or
2. Manual: download `main.js` + `manifest.json` + `styles.css` from [Releases](https://github.com/379949990/obsidian-export-img/releases) into `.obsidian/plugins/export-img/`

Requires Obsidian **1.5.7+**. Contributors: see [README.dev.md](README.dev.md).

---

## Desktop & mobile

**Desktop is the primary target** (Export Studio, ZIP download, clipboard).

On **mobile** (`isDesktopOnly: false`):

- **Save** writes image files into the vault via `getAvailablePathForAttachment` (not a system download dialog)
- **Copy** may fail when the clipboard image API is unavailable — prefer Save
- Multi-page / folder exports save images individually (no ZIP)
- Large notes and high scale multipliers are heavier; expect slower Ready and more memory use

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

## Credits

Capture powered by [modern-screenshot](https://github.com/qq15725/modern-screenshot). Inspired by the broader Obsidian export-image ecosystem; this project prioritizes a **faithful Reading-view-like** export over feature sprawl.

## License

MIT · Egoism ([@379949990](https://github.com/379949990))
