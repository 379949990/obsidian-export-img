import type { ExportImgSettings } from '../types';
import { captureElement } from '../pipeline/capture';
import {
  prepareEmbedLayout,
  waitForNextPaint,
} from '../pipeline/overflow';
import {
  hasMobileMegaBlock,
  isMobileCanvasRisk,
  MOBILE_ADVISORY_PAGE_HEIGHT,
  resolveCaptureScale,
  resolveMobileSplitPlan,
} from '../pipeline/mobile-limits';
import { resolveThemeScheme } from '../pipeline/theme-vars';
import type { RenderHostHandle } from '../pipeline/render-host';
import {
  applyPageBlocks,
  getAtomicBlocks,
  paginateBlocks,
  resetPageBlocks,
  resolveSplitHeight,
} from '../pipeline/split';

/** Preview work: rebuild offscreen DOM, or only re-capture an existing host. */
export type StudioPreviewPhase = 'rebuild' | 'recapture';

export function getRenderSignature(settings: ExportImgSettings): string {
  return JSON.stringify({
    width: settings.width,
    themeMode: settings.themeMode,
    /** Live shell scheme when themeMode is `current` — invalidates on css-change. */
    themeScheme: resolveThemeScheme(settings.themeMode),
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
    scale: settings.scale,
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
  /** At least one atomic block is extremely tall (advisory). */
  mobileMegaBlock: boolean;
  /** Capture canvas likely heavy on mobile (advisory). */
  mobileCanvasRisk: boolean;
}

/**
 * Capture the current host as preview (1×, no fonts) or export (configured scale).
 * Callers own settle / layout timing; pass skipPrepare when layout already ran.
 * Mobile keeps full split / scale capability; risks are reported, not forced away.
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

  const preferredScale = resolveCaptureScale(settings, kind);
  const skipFontEmbed = kind === 'preview';

  const splitPlan = resolveMobileSplitPlan(settings);
  const effectiveSplit = {
    mode: splitPlan.mode,
    height: splitPlan.height,
  };

  const allBlocks =
    effectiveSplit.mode === 'none' ? [] : getAtomicBlocks(contentEl);

  if (effectiveSplit.mode === 'none') {
    const contentH = Math.max(1, captureEl.scrollHeight);
    const blob = await captureElement(
      captureEl,
      { scale: preferredScale, format: settings.format },
      { skipFontEmbed },
    );
    return {
      parts: [{ blob }],
      mobileMegaBlock: hasMobileMegaBlock([contentH], MOBILE_ADVISORY_PAGE_HEIGHT),
      mobileCanvasRisk: isMobileCanvasRisk(
        settings.width,
        contentH,
        preferredScale,
      ),
    };
  }

  const maxH = resolveSplitHeight(effectiveSplit, settings.width);
  const pages = paginateBlocks(allBlocks, maxH, effectiveSplit.mode);
  const mobileMegaBlock = hasMobileMegaBlock(
    allBlocks.map((b) => b.height),
    maxH,
  );

  let tallest = 0;
  for (const page of pages) {
    const h = page.reduce((sum, b) => sum + b.height, 0);
    if (h > tallest) tallest = h;
  }
  if (tallest <= 0) tallest = maxH;

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
    mobileMegaBlock,
    mobileCanvasRisk: isMobileCanvasRisk(settings.width, tallest, preferredScale),
  };
}

export function assertNonEmptyCapture(parts: CapturePagePart[], label: string): void {
  if (!parts[0]?.blob || parts[0].blob.size < 32) {
    throw new Error(`${label} returned an empty image`);
  }
}
