import type { ExportImgSettings } from '../types';
import { captureElement } from '../pipeline/capture';
import {
  prepareEmbedLayout,
  waitForNextPaint,
} from '../pipeline/overflow';
import {
  clampMobileExportScale,
  hasMobileMegaBlock,
  resolveBudgetedCaptureScale,
  resolveCaptureScale,
  resolveMobileSplitPlan,
} from '../pipeline/mobile-limits';
import type { RenderHostHandle } from '../pipeline/render-host';
import {
  applyPageBlocks,
  getAtomicBlocks,
  paginateBlocks,
  resetPageBlocks,
  resolveSplitHeight,
  type SplitBlock,
} from '../pipeline/split';

/** Preview work: rebuild offscreen DOM, or only re-capture an existing host. */
export type StudioPreviewPhase = 'rebuild' | 'recapture';

export function getRenderSignature(settings: ExportImgSettings): string {
  return JSON.stringify({
    width: settings.width,
    themeMode: settings.themeMode,
    showFilename: settings.showFilename,
    showMetadata: settings.showMetadata,
    padding: settings.padding,
    embedMaxHeight: settings.embedMaxHeight,
    embedAlign: settings.embedAlign,
    watermark: settings.watermark,
    author: settings.author,
    settleTimeoutMs: settings.settleTimeoutMs,
  });
}

export function getCaptureSignature(settings: ExportImgSettings): string {
  // Scale is export-only — preview always captures at 1× for speed.
  return JSON.stringify({
    format: settings.format,
    split: settings.split,
  });
}

export function getExportCacheKey(settings: ExportImgSettings): string {
  return JSON.stringify({
    render: getRenderSignature(settings),
    format: settings.format,
    scale: clampMobileExportScale(settings.scale),
    split: settings.split,
  });
}

export function getWorkSignature(settings: ExportImgSettings): string {
  return `${getRenderSignature(settings)}@@${getCaptureSignature(settings)}`;
}

/** Decide whether Studio must remount Markdown or can reuse the settled host. */
export function resolvePreviewPhase(
  host: RenderHostHandle | null,
  appliedRenderSig: string,
  settings: ExportImgSettings,
): { phase: StudioPreviewPhase; renderSig: string } {
  const renderSig = getRenderSignature(settings);
  if (!host || appliedRenderSig !== renderSig) {
    return { phase: 'rebuild', renderSig };
  }
  return { phase: 'recapture', renderSig };
}

export type CaptureKind = 'preview' | 'export';

export interface CapturePagePart {
  blob: Blob;
  index?: number;
}

export interface CaptureStudioResult {
  parts: CapturePagePart[];
  /** Tall note was auto-paginated on mobile for memory safety. */
  mobileAutoSplit: boolean;
  /** User asked for 3× but mobile capped to 2×. */
  mobileScaleCapped: boolean;
  /** Scale further reduced to fit canvas pixel budget. */
  mobileScaleBudgeted: boolean;
  /** At least one atomic block exceeds a single safe page height. */
  mobileMegaBlock: boolean;
}

function tallestPageHeight(pages: SplitBlock[][], fallback: number): number {
  let max = 0;
  for (const page of pages) {
    const h = page.reduce((sum, b) => sum + b.height, 0);
    if (h > max) max = h;
  }
  return max > 0 ? max : fallback;
}

/**
 * Capture the current host as preview (1×, no fonts) or export (configured scale).
 * Callers own settle / layout timing; pass skipPrepare when layout already ran.
 * On mobile: auto-paginate tall notes, cap scale, and budget canvas pixels.
 */
export async function captureStudioPages(
  host: RenderHostHandle,
  settings: ExportImgSettings,
  kind: CaptureKind,
  opts?: { skipPrepare?: boolean },
): Promise<CaptureStudioResult> {
  const { captureEl, contentEl } = host;

  if (!opts?.skipPrepare) {
    prepareEmbedLayout(host.rootEl, settings.embedMaxHeight, settings.embedAlign);
    await waitForNextPaint();
  }

  let preferredScale = resolveCaptureScale(settings, kind);
  const mobileScaleCapped =
    kind === 'export' && settings.scale === '3x' && preferredScale < 3;
  const skipFontEmbed = kind === 'preview';

  const splitPlan = resolveMobileSplitPlan(
    settings,
    captureEl.scrollHeight,
    preferredScale,
  );
  const effectiveSplit = {
    mode: splitPlan.mode,
    height: splitPlan.height,
  };

  const allBlocks =
    effectiveSplit.mode === 'none' ? [] : getAtomicBlocks(contentEl);
  const mobileMegaBlock = hasMobileMegaBlock(
    allBlocks.map((b) => b.height),
    resolveSplitHeight(effectiveSplit, settings.width),
  );

  if (effectiveSplit.mode === 'none') {
    const contentH = Math.max(1, captureEl.scrollHeight);
    const budgeted = resolveBudgetedCaptureScale(
      settings.width,
      contentH,
      preferredScale,
    );
    preferredScale = budgeted.scale;
    const blob = await captureElement(
      captureEl,
      { scale: preferredScale, format: settings.format },
      { skipFontEmbed },
    );
    return {
      parts: [{ blob }],
      mobileAutoSplit: false,
      mobileScaleCapped,
      mobileScaleBudgeted: budgeted.reduced,
      mobileMegaBlock: hasMobileMegaBlock([contentH], splitPlan.height || 2400),
    };
  }

  const maxH = resolveSplitHeight(effectiveSplit, settings.width);
  const pages = paginateBlocks(allBlocks, maxH, effectiveSplit.mode);
  const tallest = tallestPageHeight(pages, maxH);
  const budgeted = resolveBudgetedCaptureScale(
    settings.width,
    tallest,
    preferredScale,
  );
  preferredScale = budgeted.scale;

  const captureOpts = { scale: preferredScale, format: settings.format };
  const results: CapturePagePart[] = [];

  try {
    for (let i = 0; i < pages.length; i++) {
      const pageBlocks = pages[i]!;
      if (pageBlocks.length === 0) continue;
      applyPageBlocks(allBlocks, pageBlocks, captureEl, settings.padding);
      await waitForNextPaint();
      const blob = await captureElement(captureEl, captureOpts, { skipFontEmbed });
      results.push({
        blob,
        index: pages.length > 1 ? i + 1 : undefined,
      });
    }
  } finally {
    resetPageBlocks(allBlocks, captureEl, settings.padding);
  }

  const parts =
    results.length > 0
      ? results
      : [
          {
            blob: await captureElement(captureEl, captureOpts, { skipFontEmbed }),
          },
        ];

  return {
    parts,
    mobileAutoSplit: splitPlan.autoSplit,
    mobileScaleCapped,
    mobileScaleBudgeted: budgeted.reduced,
    mobileMegaBlock,
  };
}

export function assertNonEmptyCapture(parts: CapturePagePart[], label: string): void {
  if (!parts[0]?.blob || parts[0].blob.size < 32) {
    throw new Error(`${label} returned an empty image`);
  }
}
