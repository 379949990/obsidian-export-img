# Agent handoff — Export Img (`v1.0.4`)

> For a new coding agent. Read this first, then `README.dev.md` / `README.md`. Keep this file current when branch goals or release state change; delete obsolete claims.

**Date:** 2026-07-22  
**Branch:** `v1.0.4` (cut from `main` @ `2eec8dc` / release **1.0.3**)  
**Target ship:** `1.0.4` — bump already applied in `package.json` / `manifest.json` / `versions.json`

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
| Do **not** use Tag `Version_*` or `v1.0.4` as release tag | Conflicts with branch / store |
| Daily work on `vX.Y.Z`; **squash → push `main`** to ship | Triggers Release Action |
| No dynamic `<script>` injection in bundle | Store “obfuscation” checks → Preact + fflate |
| Prefer CSS classes / `setCssProps` over mass inline `el.style.*` | Community review |
| `pnpm` only; `pnpm run test` hard-killed if **>60s** | Agent / CI contract |
| Do not commit unless user asks (except when they request ship/cut commits) | User rule |

---

## Architecture (mental model)

```text
Command/menu → Studio | quickCopy | folderExport
  → createRenderHost (MarkdownRenderer)
  → hydrateRemotes (session-cached blob URLs; status before first capture)
  → prepareEmbedLayout (fit wide blocks; align only when height-capped)
  → settleElement (images / fonts / Mermaid)
  → capture (preview 1× no fonts | export N× + fonts)
  → clipboard / saveAs / vault binary / ZIP
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

## Release (1.0.4 when ready)

1. Finish work on `v1.0.4`; keep versions at `1.0.4`.
2. `git checkout main && git pull && git merge --squash v1.0.4`
3. Commit: `release(1.0.4): <summary>`
4. `git push origin main` → [`.github/workflows/release.yml`](.github/workflows/release.yml) builds, attests `main.js`/`styles.css`, and creates tag **`1.0.4`** + assets.

If tag already exists, workflow skips. Delete GitHub Release + tag to rebuild.

Latest public release: [1.0.3](https://github.com/379949990/obsidian-export-img/releases/tag/1.0.3).

---

## Shipped in 1.0.1 (context)

- Community review: Preact, fflate, CSS props, `minAppVersion` **1.5.7**, preview debounce 400ms
- Preview pan/zoom fit margins (3% of displayed width); dblclick reframe
- Docs: fidelity claims toned down; mobile desktop-primary documented
- Tests + verify CI; Studio pipeline extraction
- Layout **before** settle; image timeout ≠ success; `settingsVersion` for migrations

---

## Known risks / good next work (not committed as plan)

Priority leftovers from first-principles review (pick with user, don’t silent-scope):

1. Dead / confusing: `split.overlap` unused; `fixed` ≡ `auto` in `paginateBlocks`
2. Theme fidelity still limited to a few CSS vars — community themes diverge
3. Remote `requestUrl` for any `http(s)` img — no allowlist
4. Bundle size large (`modern-screenshot` + Preact)
5. `obsidian` types still `"latest"` in package.json — prefer pin
6. Watermark image / author avatar settings renderable but weak/no Studio UI
7. Settle / remote-images / render-host still need Obsidian runtime or heavier mocks (unit suite now covers layout classes, split DOM, mobile save, migrate edges)

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
