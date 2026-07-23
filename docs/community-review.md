# Community review checklist (Export Img)

Canonical list of Obsidian community-plugin review findings for this repo.
Agents and humans update this file when a new Review report lands; keep **Status** current.

Machine checks live in [`scripts/community-review-rules.json`](../scripts/community-review-rules.json)
and are enforced by [`scripts/check-community-review.mjs`](../scripts/check-community-review.mjs)
(via `pnpm run check:community-review`, `pnpm run verify`, and Husky on `main` commits).

---

## Severity legend

| Level | Meaning |
| --- | --- |
| **Error** | Must fix before store / release acceptance |
| **Warning** | Should fix; often blocks polish reviews |
| **Recommendation** | Product or API guidance; either fix or document as accepted |

---

## Behavior (product)

| ID | Finding | Status | Notes |
| --- | --- | --- | --- |
| B-vault-enum | Vault enumeration (`getFiles` / `getMarkdownFiles`) | **Accepted** | Avatar/vault image picker and folder export need vault file lists. Scope stays Obsidian API; no arbitrary FS. |
| B-clipboard | Clipboard read/write | **Accepted** | Core Copy feature writes PNG/JPEG via `navigator.clipboard` / `ClipboardItem`. |
| B-vault-read | Vault read (`vault.read` / `cachedRead`) | **Pass** | Expected for note export. |

---

## Source / CSS (engineering)

| ID | Finding | Rule / signal | Status | Mitigation |
| --- | --- | --- | --- | --- |
| S-static-style | Direct `el.style.*` assignment | `obsidianmd/no-static-styles-assignment` | **Fixed** | Prefer classes + `setCssProps` (see `layoutAuthorBar`, `applyHostTheme`). |
| S-instanceof | `instanceof HTMLElement` | Prefer `.instanceOf(HTMLElement)` | **Fixed** | Use Obsidian `instanceOf` for cross-window safety. |
| S-create-el | `document.createElement` | `obsidianmd/prefer-create-el` | **Fixed** | Use `createEl` (e.g. watermark canvas). |
| S-set-warning | `setWarning` deprecated | Prefer `setDestructive` | **Fixed** | `applyDestructiveButton` uses `setDestructive` when present, else `setWarning` (minAppVersion 1.5.7). |
| S-display | `display()` deprecated | Prefer `getSettingDefinitions` | **Accepted (Path B)** | Dual path: `getSettingDefinitions` for 1.13+; keep `display()` until `minAppVersion` ≥ 1.13.0. |
| S-dynamic-tooltip | `setDynamicTooltip` deprecated | Value shown inline | **Fixed** | Removed; labels already show live `%` / `°`. |
| C-important | CSS `!important` | Prefer specificity / variables | **Fixed** | Author/sizer flow overrides use longer selectors, not `!important`. |

---

## Releases / build (CI)

| ID | Finding | Status |
| --- | --- | --- |
| R-attest-main | `main.js` attestation | **Pass** (Release workflow) |
| R-attest-css | `styles.css` attestation | **Pass** (Release workflow) |
| R-repro | Byte-for-byte `main.js` rebuild | **Pass** (Release workflow) |
| D-vuln | Vulnerable dependencies | **Pass** (keep `pnpm` deps current) |

---

## How to update after a new Review

1. Paste new rows into the tables above (or mark Status).
2. Add/adjust patterns in `scripts/community-review-rules.json` when the finding is mechanically checkable.
3. Run `pnpm run check:community-review` and fix failures.
4. Note the Review date briefly in [HANDOFF.md](../HANDOFF.md) if it changes release blockers.

---

## Local enforcement

```bash
pnpm run check:community-review   # standalone
pnpm run verify                   # includes this check
```

Husky `pre-commit` runs the check when the current branch is **`main`** (covers squash-release commits). Do not bypass with `--no-verify` for store releases.
