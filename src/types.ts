export type ExportFormat = 'png' | 'jpg' | 'webp';
export type ScaleMode = '1x' | '2x' | '3x';
export type ThemeMode = 'current' | 'light' | 'dark';
export type SplitMode = 'none' | 'fixed' | 'hr' | 'auto';
export type WatermarkType = 'text' | 'image';
export type SettleStatus = 'idle' | 'waiting' | 'ready' | 'timed_out';
/** auto follows Obsidian app language (zh* → Chinese, else English). */
export type PluginLocale = 'auto' | 'en' | 'zh';

export interface PaddingSettings {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SplitSettings {
  mode: SplitMode;
  height: number;
  overlap: number;
}

export interface WatermarkSettings {
  enable: boolean;
  type: WatermarkType;
  text: string;
  fontSize: number;
  color: string;
  imageSrc: string;
  opacity: number;
  rotate: number;
}

export interface AuthorSettings {
  show: boolean;
  name: string;
  remark: string;
  avatarSrc: string;
  align: 'left' | 'center' | 'right';
}

export interface ExportImgSettings {
  width: number;
  scale: ScaleMode;
  format: ExportFormat;
  showFilename: boolean;
  showMetadata: boolean;
  themeMode: ThemeMode;
  settleTimeoutMs: number;
  quickExportSelection: boolean;
  /** UI language preference. */
  locale: PluginLocale;
  /**
   * Fallback padding stored in settings.
   * Opening Export Studio seeds draft padding from the live reading view instead.
   */
  padding: PaddingSettings;
  split: SplitSettings;
  watermark: WatermarkSettings;
  author: AuthorSettings;
}

export interface SettleDiagnostic {
  status: SettleStatus;
  pendingImages: number;
  pendingFonts: boolean;
  layoutStable: boolean;
  elapsedMs: number;
  warnings: string[];
}

export interface ExportSession {
  markdown: string;
  sourcePath: string;
  title: string;
  type: 'file' | 'selection';
}

export interface CaptureOptions {
  scale: number;
  format: ExportFormat;
  quality?: number;
}

export interface SplitPosition {
  startY: number;
  height: number;
}
