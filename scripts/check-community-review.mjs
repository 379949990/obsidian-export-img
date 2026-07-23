#!/usr/bin/env node
/**
 * Enforce docs/community-review.md mechanically via scripts/community-review-rules.json.
 * Exit 1 on any matching forbidden pattern (after allowPaths / inline allow comments).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = path.join(root, 'scripts/community-review-rules.json');

/** @typedef {{ id: string, severity: string, description: string, glob: string, pattern: string, allowPaths?: string[] }} Rule */
/** @typedef {{ id: string, note: string }} Accepted */

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, exts, out);
      continue;
    }
    if (exts.some((ext) => name.endsWith(ext))) out.push(full);
  }
  return out;
}

/** @param {'ts' | 'css'} kind */
function filesForGlob(kind) {
  if (kind === 'ts') return walk(path.join(root, 'src'), ['.ts', '.tsx']);
  if (kind === 'css') return [path.join(root, 'styles.css')];
  return [];
}

function isAllowed(fileAbs, allowPaths = []) {
  const rel = path.relative(root, fileAbs).split(path.sep).join('/');
  return allowPaths.some((a) => rel === a || rel.startsWith(`${a}/`));
}

function printBanner() {
  console.log('Community review check');
  console.log(
    '  What:  Scans plugin source for patterns Obsidian community-plugin Review often flags.',
  );
  console.log('  Guide: docs/community-review.md');
  console.log('  Rules: scripts/community-review-rules.json');
  console.log('');
}

/**
 * @param {Rule[]} rules
 * @param {number} tsCount
 * @param {number} cssCount
 */
function printScanSummary(rules, tsCount, cssCount) {
  console.log('Scan');
  console.log(`  TypeScript/TSX files under src/: ${tsCount}`);
  console.log(`  CSS files:                       ${cssCount}`);
  console.log(`  Forbidden-pattern rules:         ${rules.length}`);
  for (const rule of rules) {
    console.log(`    · ${rule.id} — ${rule.description}`);
  }
  console.log('');
}

/**
 * @param {Accepted[]} accepted
 */
function printAccepted(accepted) {
  if (!accepted.length) return;
  console.log('Documented exceptions (Accepted — do not fail this check)');
  console.log(
    '  These behaviors may still appear in a human Review report, but this project',
  );
  console.log(
    '  keeps them on purpose. Full rationale: docs/community-review.md',
  );
  console.log('');
  for (const item of accepted) {
    console.log(`  · ${item.id}`);
    console.log(`      ${item.note}`);
  }
  console.log('');
}

function main() {
  const config = JSON.parse(readFileSync(rulesPath, 'utf8'));
  /** @type {Rule[]} */
  const rules = config.rules ?? [];
  /** @type {Accepted[]} */
  const accepted = Array.isArray(config.accepted) ? config.accepted : [];

  const tsFiles = filesForGlob('ts');
  const cssFiles = filesForGlob('css');

  printBanner();
  printScanSummary(rules, tsFiles.length, cssFiles.length);

  /** @type {{ id: string, file: string, line: number, text: string, description: string }[]} */
  const hits = [];

  for (const rule of rules) {
    const re = new RegExp(rule.pattern);
    for (const file of filesForGlob(/** @type {'ts' | 'css'} */ (rule.glob))) {
      if (isAllowed(file, rule.allowPaths)) continue;
      let text;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const lines = text.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (line.includes('community-review-allow')) return;
        if (re.test(line)) {
          hits.push({
            id: rule.id,
            file: path.relative(root, file).split(path.sep).join('/'),
            line: i + 1,
            text: line.trim(),
            description: rule.description,
          });
        }
      });
    }
  }

  if (hits.length === 0) {
    console.log('Result: PASS');
    console.log(
      '  No forbidden patterns found. Safe for verify / squash-to-main from this gate.',
    );
    console.log('');
    printAccepted(accepted);
    process.exit(0);
  }

  console.error('Result: FAIL');
  console.error(
    `  Found ${hits.length} match(es). Fix them (or document + allow) before release.`,
  );
  console.error('  See docs/community-review.md\n');
  for (const h of hits) {
    console.error(`  · ${h.id}  ${h.file}:${h.line}`);
    console.error(`      ${h.description}`);
    console.error(`      ${h.text}\n`);
  }
  printAccepted(accepted);
  process.exit(1);
}

main();
