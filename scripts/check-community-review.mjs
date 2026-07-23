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

function main() {
  const config = JSON.parse(readFileSync(rulesPath, 'utf8'));
  /** @type {Rule[]} */
  const rules = config.rules ?? [];

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
    console.log('[community-review] ok — no forbidden patterns');
    if (Array.isArray(config.accepted) && config.accepted.length > 0) {
      console.log(
        `[community-review] accepted (documented): ${config.accepted.map((a) => a.id).join(', ')}`,
      );
    }
    process.exit(0);
  }

  console.error('[community-review] failed — see docs/community-review.md\n');
  for (const h of hits) {
    console.error(`  ${h.id}  ${h.file}:${h.line}`);
    console.error(`    ${h.description}`);
    console.error(`    ${h.text}\n`);
  }
  process.exit(1);
}

main();
