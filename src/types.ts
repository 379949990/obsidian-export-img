export type ExportFormat = 'png' | 'jpg' | 'webp';
export type ScaleMode = '1x' | '2x' | '3x';
export type ThemeMode = 'current' | 'light' | 'dark';
export type SplitMode = 'none' | 'fixed' | 'hr';
export type WatermarkType = 'text' | 'image';
export type SettleStatus = 'idle' | 'waiting' | 'ready' | 'timed_out';
/** auto follows Obsidian app language (zh* → Chinese, else English). */
export type PluginLocale = 'auto' | 'en' | 'zh';
export type EmbedAlign = 'left' | 'center';

export interface PaddingSettings {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SplitSettings {
  mode: SplitMode;
  /** 0 = resolve as width × 1.414 (A4) for fixed-height pages. */
  height: number;
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
  /** Schema version for one-shot migrations (see settings-migrate.ts). */
  settingsVersion: number;
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
  /** Default padding used when opening Export Studio. */
  padding: PaddingSettings;
  /**
   * Max rendered height (px) for embedded images, Mermaid diagrams, and other
   * wide/scrollable blocks inside the note. 0 = no clamp.
   */
  embedMaxHeight: number;
  /** Horizontal alignment for media that reaches embedMaxHeight. */
  embedAlign: EmbedAlign;
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

export interface CaptureOptions {
  scale: number;
  format: ExportFormat;
  quality?: number;
}
