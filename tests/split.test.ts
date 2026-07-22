import { describe, expect, it } from 'vitest';
import {
  defaultSplitHeight,
  paginateBlocks,
  resolveSplitHeight,
  type SplitBlock,
} from '../src/pipeline/split';

function block(height: number, hr = false): SplitBlock {
  return {
    el: {
      matches: (sel: string) => hr && (sel.includes('hr') || sel.includes('.hr')),
      querySelector: () => null,
    } as unknown as HTMLElement,
    height,
  };
}

describe('resolveSplitHeight', () => {
  it('uses A4 ratio when height is 0', () => {
    expect(defaultSplitHeight(800)).toBe(Math.round(800 * 1.414));
    expect(resolveSplitHeight({ mode: 'fixed', height: 0 }, 800)).toBe(
      Math.round(800 * 1.414),
    );
  });

  it('respects explicit height (min 200)', () => {
    expect(resolveSplitHeight({ mode: 'fixed', height: 500 }, 800)).toBe(500);
    expect(resolveSplitHeight({ mode: 'fixed', height: 10 }, 800)).toBe(200);
  });
});

describe('paginateBlocks', () => {
  it('returns a single empty page for no blocks', () => {
    expect(paginateBlocks([], 1000, 'fixed')).toEqual([[]]);
  });

  it('keeps all blocks on one page for mode none', () => {
    const blocks = [block(100), block(100)];
    expect(paginateBlocks(blocks, 50, 'none')).toEqual([blocks]);
  });

  it('packs by max height for fixed mode', () => {
    const a = block(100);
    const b = block(100);
    const c = block(100);
    expect(paginateBlocks([a, b, c], 200, 'fixed')).toEqual([[a, b], [c]]);
  });

  it('keeps an oversized block intact on its own page', () => {
    const tall = block(500);
    const next = block(100);
    expect(paginateBlocks([tall, next], 200, 'fixed')).toEqual([[tall], [next]]);
  });

  it('splits on HR and drops HR markers from pages', () => {
    const a = block(50);
    const hr = block(10, true);
    const b = block(50);
    expect(paginateBlocks([a, hr, b], 1000, 'hr')).toEqual([[a], [b]]);
  });
});
