# Agent handoff — Export Img (`v1.0.6`)

> For a new coding agent. Read this first, then `README.dev.md` / `README.md`. Keep this file current when branch goals or release state change; delete obsolete claims.

**Date:** 2026-07-22  
**Branch:** `v1.0.6` (cut from `main` @ `40a4fbf` / release **1.0.5**)  
**Target ship:** `1.0.6` — bump already applied in `package.json` / `manifest.json` / `versions.json`

---

## What this is

Obsidian community plugin **id `export-img`** (folder must match; GitHub repo may stay `obsidian-export-img`). Exports notes as images via offscreen `MarkdownRenderer` → settle → overflow fit → `modern-screenshot`. UI: Export Studio (Preact).

**Not** a pixel-perfect clone of live Reading view — high-fidelity *approximation*. Product copy must stay honest (see README “Known differences”).

---

## Hard constraints (do not regress)

| Rule | Why |
| --- | --- |
| Plugin `id` = `export-img` — **never** contain `obsidian` | Community store rejection |
| Vault plugin path: `.obsidian/plugins/export-img/` | Must match `manifest.id` |
| Branch model: **`main` + `vX.Y.Z` only** (no `dev`) | Project choice |
| Release tag = plain **`x.y.z`** (= manifest version) | Obsidian BRAT / community install |
| Do **not** use Tag `Version_*` or `v1.0.6` as release tag | Conflicts with branch / store |
| Daily work on `vX.Y.Z`; **squash → push `main`** to ship | Triggers Release Action |
| No dynamic `<script>` injection in bundle | Store “obfuscation” checks → Preact + fflate |
| Prefer CSS classes / `setCssProps` over mass inline `el.style.*` | Community review |
| `pnpm` only; `pnpm run test` hard-killed if **>60s** | Agent / CI contract |
| Do not commit unless user asks (except when they request ship/cut commits) | User rule |

---

## Architecture (mental model)

```text
Command/menu → Studio | quickCopy | folderExport
  → createRenderHost (MarkdownRenderer; themeMode current mirrors body)
  → hydrateRemotes (session cache; MIME sniff + size gate; Notice on failures)
  → prepareEmbedLayout (fit wide blocks; align only when height-capped)
  → settleElement (images / fonts / Mermaid / MathJax)
  → capture (preview 1× no fonts | export N× + fonts; mobile budget/auto-split)
  → clipboard / saveAs / vault binary / ZIP (mobile multi-page → one ZIP share)
  → timed_out: Copy/Save blocked until “Export anyway”
```

| Area | Path |
| --- | --- |
| Studio UI | `src/ui/export-studio.tsx`, `fidelity-panel.tsx`, `preview-pane.tsx` |
| Capture pipeline | `src/ui/studio-pipeline.ts`, `src/pipeline/*` |
| Mobile limits | `src/pipeline/mobile-limits.ts` |
| Theme vars | `src/pipeline/theme-vars.ts` |
| Settings | `src/settings.ts`, `src/setting-tab.tsx` |
| i18n | `src/i18n.ts` |

---

## Verify

```bash
pnpm install
pnpm run verify   # tsc + test (CI: verify.yml)
pnpm run test     # vitest; wrapper kills at 60s
pnpm run build    # tsc + production bundle
pnpm run dev      # watch → main.js
```

Smoke: load fixture in **desktop** vault → Export Studio → Ready → Copy/Save. Mobile: Save → system share → Save Image / Photos; multi-page expect one ZIP share.

---

## Release (1.0.6 when ready)

1. Finish work on `v1.0.6`; keep versions at `1.0.6`.
2. `git checkout main && git pull && git merge --squash v1.0.6`
3. Commit: `release(1.0.6): <summary>`
4. `git push origin main` → [`.github/workflows/release.yml`](.github/workflows/release.yml) builds, attests `main.js`/`styles.css`, and creates tag **`1.0.6`** + assets.

If tag already exists, workflow skips. Delete GitHub Release + tag to rebuild.

Latest public release on `main`: **1.0.5** (`40a4fbf`). Push `main` if the release Action / tag `1.0.5` is not on origin yet.

---

## Shipped in 1.0.5 (context)

- Theme: copy body CSS variables for forced light/dark; code/tables keep Reading column width
- Mobile Studio: compact panel, pinch-zoom / double-tap fit; multi-page preview fits width and height
- Mobile capture safety: auto-split, scale ≤2×, ~8M canvas pixels/page, settle ≤5s, mega-block notice
- Mobile Save: Web Share → Photos; multi-page = one ZIP share; settings persist only after successful save
- Theme body class restore: exact prior `theme-dark` / `theme-light` presence
- Remote images: MIME sniff; bounded LRU cache; concurrency 3

## Shipped / fixed on `v1.0.6` (in progress)

- Mobile: restore full Split + 3×; no forced auto-pagination / scale clamp (advisory notices only)
- Mobile: settings changes do not auto-refresh preview — manual title-bar refresh + stale banner
- Mobile UI: restore modal side gutters (~92vw); preview fit back to ~94% / 3% gutters; panel label sizes restored (compact inputs only)

## Known risks / good next work (not committed as plan)

1. Theme fidelity: forced light/dark copies CSS variables from a brief body scheme swap; rules keyed only as `body.theme-* …` descendants (not variables) may still partially follow the shell
2. Remote `requestUrl` for any `http(s)` img — no allowlist (MIME/size only)
3. Bundle size large (`modern-screenshot` + Preact)
4. `obsidian` types still `"latest"` in package.json — prefer pin
5. Extremely large notes / 3× on low-RAM devices may still OOM — plugin warns and leaves Split/scale under user control
6. Settle / remote-images / render-host still need Obsidian runtime or heavier mocks for full coverage

---

## Agent workflow tips

- Prefer smallest diff; match existing Preact / pipeline patterns.
- After meaningful logic change: `pnpm run verify` (must finish **under 60s**).
- Update this handoff when: version branch changes, release model changes, or P0 risks are fixed/invalidated.
- User-facing behavior changes → update `README.md`; contributor ops → `README.dev.md`.

---

## Pointers

- Product: [README.md](README.md)
- Develop / release: [README.dev.md](README.dev.md)
- CI: `.github/workflows/verify.yml`, `.github/workflows/release.yml`
