# Export Img — Developer guide

Package manager: [pnpm](https://pnpm.io/) only. Current development branch: `v1.0.6`.

Agent onboarding: [HANDOFF.md](HANDOFF.md). Product overview and install: [README.md](README.md).

---

## Develop

Use a **dedicated vault** — never your daily notes vault. **Desktop Obsidian** is the supported smoke environment; mobile paths exist but are not CI-covered.

```bash
git clone https://github.com/379949990/obsidian-export-img.git
cd obsidian-export-img
pnpm install

# Symlink into the dev vault (folder name must match manifest id)
ln -s "$(pwd)" /path/to/DevVault/.obsidian/plugins/export-img

pnpm run dev
```

Enable **Export Img** in Obsidian. Keep `pnpm run dev` running (esbuild watch). Prefer [Hot Reload](https://github.com/pjeby/hot-reload), or toggle the plugin after each rebuild.

**Smoke test:** open [`fixtures/export-fidelity-lab.md`](fixtures/export-fidelity-lab.md) in the vault, run Export Studio, wait for **Ready**, compare to Reading view as a baseline (expect close, not pixel-identical), then Copy / Save. On mobile, prefer Save (vault attachments).

```bash
pnpm run build   # tsc + production bundle → main.js
pnpm run test    # vitest (hard-killed if >60s)
pnpm run verify  # tsc + test — also run by CI on PRs / version branches
```

Automated coverage (Node + `happy-dom`): markdown prep, pagination, settings migrate, Studio signatures, **embed layout CSS classes**, **page-hidden split DOM**, **mobile vault save / desktop zip**, capture mime helpers, i18n. Still **not** a substitute for the desktop fixture smoke (Obsidian `MarkdownRenderer`, Mermaid settle, real clipboard).

CI: [`.github/workflows/verify.yml`](.github/workflows/verify.yml) on `pull_request` and pushes to `main` / `v*`. Release remains [`.github/workflows/release.yml`](.github/workflows/release.yml) on `main` only.

---

## Release flow

Branch model for this repo: **`main` + `vX.Y.Z`** (no `dev`).

1. Cut `vX.Y.Z` from `main`.
2. Develop on the version branch; bump **`package.json`**, **`manifest.json`**, and **`versions.json`** to the same `x.y.z` before ship.
3. Squash → **push `main`**.

Push to `main` runs [`.github/workflows/release.yml`](.github/workflows/release.yml): build → [artifact attestation](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) for `main.js` / `styles.css` → tag **`x.y.z`** (= `manifest.json` `version`, required by Obsidian) → GitHub Release with `main.js` / `manifest.json` / `styles.css`.

Verify attested assets: `gh attestation verify main.js -R 379949990/obsidian-export-img` (same for `styles.css`).

Same version already tagged → workflow skips (no duplicate release). To rebuild a version, delete that GitHub Release + tag first.

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
