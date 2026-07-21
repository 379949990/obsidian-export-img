import { describe, expect, it } from 'vitest';
import { prepareMarkdown } from '../src/pipeline/prepare';

describe('prepareMarkdown', () => {
  it('strips YAML frontmatter from the body', () => {
    const md = `---
title: Hello
---
# Body`;
    expect(prepareMarkdown(md)).toBe('# Body');
  });

  it('leaves content without frontmatter unchanged (trimStart only)', () => {
    expect(prepareMarkdown('  # Hi')).toBe('# Hi');
  });

  it('removes excalidraw-plugin lines when frontmatter flag is set', () => {
    const md = 'excalidraw-plugin: parsed\n\n# Note';
    expect(prepareMarkdown(md, { 'excalidraw-plugin': true })).toBe('# Note');
  });

  it('keeps excalidraw-plugin lines when frontmatter flag is absent', () => {
    const md = 'excalidraw-plugin: parsed\n\n# Note';
    expect(prepareMarkdown(md)).toBe(md);
  });
});
