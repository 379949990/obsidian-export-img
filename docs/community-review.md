# Community review checklist (Export Img)

Canonical list of Obsidian community-plugin review findings for this repo.
Agents and humans update this file when a new Review report lands; keep **Status** current.

**Machine checks** use the community package
[`obsidian-plugin-validator`](https://github.com/philpalmieri/obsidian-plugin-validator)
(`pnpm run check:plugin`, also part of `pnpm run verify` and Husky on `main` commits).
This document is the **human / Accepted** record only — do not maintain a parallel rule table.

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
| S-static-style | Direct `el.style.*` / static style keys | `obsidianmd/no-static-styles-assignment` | **Fixed** | Classes + CSS vars only via `setCssProps(--*)`. |
| S-instanceof | `instanceof HTMLElement` | Prefer `.instanceOf(HTMLElement)` | **Fixed** | Use Obsidian `instanceOf` for cross-window safety. |
| S-create-el | `document.createElement` | `obsidianmd/prefer-create-el` | **Fixed** | Use `createEl` / `createDiv`. |
| S-set-warning | `setWarning` deprecated | Prefer `setDestructive` | **Fixed** | `applyDestructiveButton` prefers `setDestructive`. |
| S-display | `display()` deprecated | Prefer `getSettingDefinitions` | **Accepted (Path B)** | Dual path until `minAppVersion` ≥ 1.13.0; see validator / eslint notes if flagged. |
| S-dynamic-tooltip | `setDynamicTooltip` deprecated | Value shown inline | **Fixed** | Removed. |
| C-important | CSS `!important` | Prefer specificity / variables | **Fixed** | Longer selectors, not `!important` (not covered by validator; keep by convention). |

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
2. Prefer fixing code so `pnpm run check:plugin` stays green; only document **Accepted** product exceptions here.
3. Run `pnpm run verify` before squash → `main`.
4. Note the Review date briefly in [HANDOFF.md](../HANDOFF.md) if it changes release blockers.

---

## Local enforcement

```bash
pnpm run check:plugin   # obsidian-plugin-validator (manifest + eslint-plugin-obsidianmd)
pnpm run verify         # tsc + check:plugin + test
```

Husky `pre-commit` runs `check:plugin` when the current branch is **`main`** (covers squash-release commits). Do not bypass with `--no-verify` for store releases.
