# Agent handoff — Export Img (`v1.0.5`)

> For a new coding agent. Read this first, then `README.dev.md` / `README.md`. Keep this file current when branch goals or release state change; delete obsolete claims.

**Date:** 2026-07-22  
**Branch:** `v1.0.5` (cut from `main` @ `7684f10` / release **1.0.4**)  
**Target ship:** `1.0.5` — bump already applied in `package.json` / `manifest.json` / `versions.json`

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
| Do **not** use Tag `Version_*` or `v1.0.5` as release tag | Conflicts with branch / store |
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
  → hydrateRemotes (session cache; MIME + ~12MB gate; Notice on failures)
  → prepareEmbedLayout (fit wide blocks; align only when height-capped)
  → settleElement (images / fonts / Mermaid / MathJax)
  → capture (preview 1× no fonts | export N× + fonts)
  → clipboard / saveAs / vault binary / ZIP
  → timed_out: Copy/Save blocked until “Export anyway”
```

| Area | Path |
| --- | --- |
| Entry | `src/main.ts` |
| Pipeline | `src/pipeline/*` |
| Studio UI | `src/ui/export-studio.tsx`, `preview-pane.tsx`, `fidelity-panel.tsx` |
| Phase helpers | `src/ui/studio-pipeline.ts` (`rebuild` / `recapture` / export cache) |
| Settings + migrate | `src/settings.ts`, `src/settings-migrate.ts` (`settingsVersion`) |
| Styles | `styles.css` |
| Manual fixture | `fixtures/export-fidelity-lab.md` |
| Unit / DOM tests | `tests/*.test.ts` (+ `tests/helpers`, `tests/mocks/obsidian.ts`) |

**Studio phases:** `resolvePreviewPhase` → rebuild DOM vs recapture-only; export uses `getExportCacheKey` (includes scale).

---

## Commands

```bash
pnpm install
pnpm run dev      # watch → main.js
pnpm run build    # tsc + production bundle
pnpm run test     # vitest; wrapper kills at 60s
pnpm run verify   # tsc + test (CI: verify.yml)
```

Smoke: load fixture in **desktop** vault → Export Studio → Ready → Copy/Save. Mobile: prefer Save (vault attachments).

---

## Release (1.0.5 when ready)

1. Finish work on `v1.0.5`; keep versions at `1.0.5`.
2. `git checkout main && git pull && git merge --squash v1.0.5`
3. Commit: `release(1.0.5): <summary>`
4. `git push origin main` → [`.github/workflows/release.yml`](.github/workflows/release.yml) builds, attests `main.js`/`styles.css`, and creates tag **`1.0.5`** + assets.

If tag already exists, workflow skips. Delete GitHub Release + tag to rebuild.

Latest public release: [1.0.4](https://github.com/379949990/obsidian-export-img/releases/tag/1.0.4).

---

## Shipped in 1.0.1 (context)

- Community review: Preact, fflate, CSS props, `minAppVersion` **1.5.7**, preview debounce 400ms
- Preview pan/zoom fit margins (3% of displayed width); dblclick reframe
- Docs: fidelity claims toned down; mobile desktop-primary documented
- Tests + verify CI; Studio pipeline extraction
- Layout **before** settle; image timeout ≠ success; `settingsVersion` for migrations

---

## Shipped / fixed on `v1.0.5` (in progress)

- Theme: copy body CSS variables for forced light/dark; code/tables keep Reading column width
- Mobile Studio: larger refresh hit target, shorter preview, compact panel, avatar 2×2 actions
- Preview: pinch-zoom + double-tap fit on touch
- Mobile capture safety: auto-split tall notes; export scale capped at 2×; shorter settle timeout

## Known risks / good next work (not committed as plan)

1. Theme fidelity: forced light/dark copies CSS variables from a brief body scheme swap; rules keyed only as `body.theme-* …` descendants (not variables) may still partially follow the shell
2. Remote `requestUrl` for any `http(s)` img — no allowlist (MIME/size only)
3. Bundle size large (`modern-screenshot` + Preact)
4. `obsidian` types still `"latest"` in package.json — prefer pin
5. Extremely large notes on low-RAM devices may still struggle even with auto-split
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
