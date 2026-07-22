# Agent handoff — Export Img (`v1.0.7`)

> For a new coding agent. Read this first, then `README.dev.md` / `README.md`. Keep this file current when branch goals or release state change; delete obsolete claims.

**Date:** 2026-07-22  
**Branch:** `v1.0.7` (cut from `main` @ `6e73389` / release **1.0.6**)  
**Target ship:** `1.0.7` — bump already applied in `package.json` / `manifest.json` / `versions.json`

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
| Do **not** use Tag `Version_*` or `v1.0.7` as release tag | Conflicts with branch / store |
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
  → clipboard / saveAs (desktop) / vault binary (mobile) / ZIP (desktop multi only)
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

Smoke: load fixture in **desktop** vault → Export Studio → Ready → Copy/Save. Mobile: Save → vault attachment (Notice path); multi-page = one file per page in Attachments.

---

## Release (1.0.7 when ready)

1. Finish work on `v1.0.7`; keep versions at `1.0.7`.
2. `git checkout main && git pull && git merge --squash v1.0.7`
3. Commit: `release(1.0.7): <summary>`
4. `git push origin main` → [`.github/workflows/release.yml`](.github/workflows/release.yml) builds, attests `main.js`/`styles.css`, and creates tag **`1.0.7`** + assets.

If tag already exists, workflow skips. Delete GitHub Release + tag to rebuild.

Latest public release on `main`: **1.0.6** (`6e73389`).

---

## Shipped in 1.0.6 (context)

- Mobile: restore full Split + 3×; no forced auto-pagination / scale clamp (advisory notices only)
- Mobile: settings changes do not auto-refresh preview — manual title-bar refresh + stale banner
- Mobile UI: restore modal side gutters (~92vw); preview fit ~94% / 3% gutters (width-based); panel label sizes restored
- Mobile Save: vault attachments (per page); all-or-nothing for settings persist
- Hygiene: live `current` theme via css-change + scheme in render sig; dead mobile flags / i18n / stubs removed

## Shipped / fixed on `v1.0.7` (in progress)

- Studio preview: keep pan/zoom across updates — **only** first open + double-click/tap apply 94%/3% fit (refresh does not reset)
- Author bar: host CSS forces sizer children into normal flow (v1.0.4 sibling model); `layoutAuthorBar` extends sizer `min-height` for overflow tables
- Watermark: canvas stamp, font-weight **400**, default size **22px**, tile across diagonal AABB; defaults text `Watermark`, rotate **30°**, opacity **15%**
- Author presets: name `Your Name`, remark `The Description` (toggles still off by default)
- Refresh control: preview pane bottom-right `mod-cta`「更新预览」; hint chip shrinks to text width
- Copy / Save: never blocked by stale preview — refresh host to current draft first, then export
- Watermark/author toggles: session-only — Studio always opens unchecked; Save does not persist checked state (migrate v4)
- Config → preview: `autoRerenderPreview` default **desktop on / mobile off** (migrate v5); sliders on release, text on blur
- Preview loading: phase progress bar (hydrate / settle / capture pages)
- Settings: sliders show live `%` / `°`; **Restore defaults** button

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
