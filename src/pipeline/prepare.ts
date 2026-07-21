import type { FrontMatterCache } from 'obsidian';

/** Light preprocessing so reading-view render stays clean. */
export function prepareMarkdown(
  markdown: string,
  frontmatter?: FrontMatterCache,
): string {
  let content = markdown;

  // Strip YAML frontmatter block from body when present as raw text
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      content = content.slice(end + 4).replace(/^\r?\n/, '');
    }
  }

  if (frontmatter?.['excalidraw-plugin']) {
    content = content.replace(/^[ \t]*excalidraw-plugin:.*(\r?\n)?/gm, '');
  }

  return content.trimStart();
}
