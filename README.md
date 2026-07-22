<p align="center">
  <img src="https://socialify.git.ci/379949990/obsidian-export-img/image?description=1&amp;font=KoHo&amp;language=1&amp;logo=https%3A%2F%2Fobsidian.md%2Fimages%2Fobsidian-logo-gradient.svg&amp;name=1&amp;owner=1&amp;pattern=Plus&amp;theme=Auto" alt="Export Img" width="100%" />
</p>

<p align="center">
  <strong>Export Img</strong> — export Markdown notes as images that approximate Obsidian Reading view.<br/>
  Themes · Callouts · Code · Math · Mermaid · Embeds · Properties · Author · Watermark
</p>

<p align="center">
  <a href="https://github.com/379949990/obsidian-export-img/releases"><img alt="release" src="https://img.shields.io/github/v/release/379949990/obsidian-export-img?include_prereleases&amp;style=flat-square" /></a>
  <img alt="obsidian" src="https://img.shields.io/badge/Obsidian-1.5.7%2B-7c3aed?style=flat-square" />
  <img alt="pnpm" src="https://img.shields.io/badge/package%20manager-pnpm-f69220?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

---

## What it does

Export Img opens an **Export Studio** that:

1. Renders the note with Obsidian’s `MarkdownRenderer`
2. Loads remote images through Obsidian `requestUrl` into a **session cache** (status shows progress; first preview waits until they are ready)
3. Fits wide blocks to the export width and optionally clamps media height
4. Settles images, fonts, and diagrams, then captures with [modern-screenshot](https://github.com/qq15725/modern-screenshot)

Studio **preview** stays at **1×** for speed. **Copy / Save** use your export scale (default **2×**) with font embedding.

---

## Install

1. Community plugins → search **Export Img** *(after publish)*, or
2. Manual: put `main.js`, `manifest.json`, and `styles.css` from [Releases](https://github.com/379949990/obsidian-export-img/releases) into `.obsidian/plugins/export-img/`

Requires Obsidian **1.5.7+**. Plugin id: `export-img`.

Contributors and branch model: [README.dev.md](README.dev.md) · [HANDOFF.md](HANDOFF.md).

**Current development branch:** `v1.0.4`

---

## Usage

| Action | How |
| --- | --- |
| Export note | Command / file menu → Export Img |
| Export selection | Command / editor menu (optional quick-copy skips Studio) |
| Export folder | Folder menu → ZIP of images (desktop) |
| Refresh preview | Title-bar refresh control when status is idle / ready |

Settings open from **Settings → Export Img**. Values there are the defaults Studio loads on open; Studio can still override them for the session and writes back on Copy/Save when that path persists settings.

---

## Features

### Export Studio

- Live bitmap preview with pan / zoom
- Shared controls for width, theme, padding, split, media limits, decorations
- Settle status (idle / rendering / ready / timed out) plus remote-image loading progress
- Manual **refresh** to rebuild the capture host

### Media layout

| Setting | Behavior |
| --- | --- |
| **Max media height** | Caps embeds, Mermaid, and other wide blocks after width fit. `0` / empty = no limit |
| **Media alignment** | **Left** or **Center**, applied only to media that **reaches** that height cap. Shorter media keeps the note’s own layout |

HTML badge rows (several inline `<img>`s in one paragraph) stay **horizontal** — only Obsidian embed images use block layout.

### Remote images

- Network `http(s)` images are fetched once per plugin session and reused from an in-memory blob cache
- Title bar shows `Loading remote images…` until hydrate finishes, then the first preview is captured
- Cache is cleared when the plugin unloads

### Decorations

- **Author bar** — toggle, name, bio, alignment, **avatar** (upload / vault file as data URL / remote URL)
- **Watermark** — text or image, opacity and rotation

Both can be preconfigured in plugin settings and adjusted in Studio.

### Long notes

- Split: off · fixed height · horizontal rules · by content blocks
- Default fixed/auto page height ≈ `width × 1.414` (A4). Blocks are never cut mid-element.

### Batch & selection

- Folder export → ZIP on desktop; individual vault saves on mobile
- Selection export; optional quick copy without opening Studio

---

## Desktop & mobile

**Desktop** is the primary target (Studio, clipboard, ZIP).

On **mobile**:

- **Save** writes into the vault via `getAvailablePathForAttachment`
- **Copy** may be unavailable — prefer Save
- Multi-page / folder exports save files individually (no ZIP)
- Large notes and 3× scale use more memory and take longer to settle

---

## Resolution

| Path | Scale | Fonts | Intent |
| --- | ---: | --- | --- |
| Studio preview | 1× | No | Fast feedback |
| Copy / Save | 1× / 2× / 3× | Yes | Shareable sharpness |

---

## Limits vs Reading view

Exports approximate Reading view; they are not a screenshot of the open pane:

- Offscreen render host, not the live Reading DOM
- Wide blocks are fitted to the chosen width
- Community themes and plugin widgets may differ
- Preview is 1× without fonts; export uses your scale with fonts
- Slow assets may soft-timeout (status: Timed out)

---

## Credits

Inspired by the community [Export Image](https://community.obsidian.md/plugins/obsidian-export-image) plugin — this project is a **full rewrite and enhancement**, focused on Reading-view fidelity.

Capture: [modern-screenshot](https://github.com/qq15725/modern-screenshot).

## License

MIT · Egoism ([@379949990](https://github.com/379949990))
