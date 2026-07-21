import type { ExportImgSettings } from '../types';
import { scaleToNumber } from '../settings';
import { captureElement } from '../pipeline/capture';
import {
  prepareEmbedLayout,
  waitForNextPaint,
} from '../pipeline/overflow';
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

/**
 * Capture the current host as preview (1×, no fonts) or export (configured scale).
 * Callers own settle / layout timing; pass skipPrepare when layout already ran.
 */
export async function captureStudioPages(
  host: RenderHostHandle,
  settings: ExportImgSettings,
  kind: CaptureKind,
  opts?: { skipPrepare?: boolean },
): Promise<CapturePagePart[]> {
  const { captureEl, contentEl } = host;

  if (!opts?.skipPrepare) {
    prepareEmbedLayout(host.rootEl, settings.embedMaxHeight, settings.embedAlign);
    await waitForNextPaint();
  }

  const scale = kind === 'preview' ? 1 : scaleToNumber(settings.scale);
  const skipFontEmbed = kind === 'preview';
  const captureOpts = { scale, format: settings.format };

  if (settings.split.mode === 'none') {
    const blob = await captureElement(captureEl, captureOpts, { skipFontEmbed });
    return [{ blob }];
  }

  const maxH = resolveSplitHeight(settings.split, settings.width);
  const allBlocks = getAtomicBlocks(contentEl);
  const pages = paginateBlocks(allBlocks, maxH, settings.split.mode);
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

  return results.length > 0
    ? results
    : [
        {
          blob: await captureElement(captureEl, captureOpts, { skipFontEmbed }),
        },
      ];
}

export function assertNonEmptyCapture(parts: CapturePagePart[], label: string): void {
  if (!parts[0]?.blob || parts[0].blob.size < 32) {
    throw new Error(`${label} returned an empty image`);
  }
}
