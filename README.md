# Export Img (obsidian-export-img)

Export Obsidian notes as images with **reading-view fidelity** — theme, callouts, code blocks, math, Mermaid, and embeds.

## Features (v0.1)

- Export Studio: live preview is the capture target
- SettleGate waits for images, fonts, and layout stability
- Theme mode: current / light / dark
- Title & properties toggles
- Selection export (optional quick copy)
- Long-note split: fixed / hr / block boundaries
- Watermark & author bar (decorations)
- Folder batch export

## Develop

1. Clone into a vault plugin folder or symlink this repo to `.obsidian/plugins/obsidian-export-img`
2. `npm install`
3. `npm run dev`
4. Enable **Export Img** in Community plugins (safe mode off)
5. Use a **separate development vault**

## Build

```bash
npm run build
```

Produces `main.js` next to `manifest.json` and `styles.css`.

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
