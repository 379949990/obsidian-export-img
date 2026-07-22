import * as Obsidian from 'obsidian';
import type { PluginLocale } from './types';

type Dict = Record<string, string>;
type ResolvedLocale = 'en' | 'zh';

let localePreference: PluginLocale = 'auto';

export function setLocalePreference(pref: PluginLocale): void {
  localePreference = pref;
}

export function getLocalePreference(): PluginLocale {
  return localePreference;
}

function getObsidianLanguage(): string {
  const api = Obsidian as { getLanguage?: () => string };
  if (typeof api.getLanguage === 'function') {
    return api.getLanguage();
  }
  return typeof navigator !== 'undefined' ? navigator.language : 'en';
}

/** Simplified Chinese / Traditional Chinese → zh; otherwise en. */
export function resolveLocale(pref: PluginLocale = localePreference): ResolvedLocale {
  if (pref === 'en') return 'en';
  if (pref === 'zh') return 'zh';
  const lang = getObsidianLanguage().toLowerCase();
  return lang === 'zh' || lang.startsWith('zh-') || lang.startsWith('zh_') ? 'zh' : 'en';
}

const en: Dict = {
  'command.exportNote': 'Export note as image',
  'command.exportSelection': 'Export selection as image',
  'command.exportFolder': 'Export folder as images',
  'menu.exportNote': 'Export as image',
  'menu.exportSelection': 'Export selection as image',
  'menu.exportFolder': 'Export folder as images',
  'studio.title': 'Export image',
  'studio.fidelity': 'Options',
  'studio.width': 'Width',
  'studio.embedMaxHeight': 'Max media height',
  'studio.embedMaxHeightHint':
    'Caps how tall embedded images, Mermaid, and other wide blocks can be (they are first fitted to the content width). Does not change the studio preview size. Leave empty or 0 for no limit.',
  'studio.embedMaxHeightPlaceholder': 'No limit',
  'studio.embedAlign': 'Media alignment',
  'studio.embedAlignHint': 'Applies only to media that reaches the max height.',
  'studio.embedAlign.center': 'Center',
  'studio.embedAlign.left': 'Left',
  'studio.scale': 'Export scale',
  'studio.scaleHint':
    'Preview always uses 1× for speed. Copy and Save use this scale.',
  'studio.format': 'Format',
  'studio.theme': 'Theme',
  'studio.theme.current': 'Current',
  'studio.theme.light': 'Light',
  'studio.theme.dark': 'Dark',
  'studio.showTitle': 'Show note title',
  'studio.showMetadata': 'Show properties',
  'studio.padding': 'Padding',
  'studio.padding.top': 'Top',
  'studio.padding.right': 'Right',
  'studio.padding.bottom': 'Bottom',
  'studio.padding.left': 'Left',
  'studio.padding.vertical': 'Vertical',
  'studio.padding.horizontal': 'Horizontal',
  'studio.padding.reset': 'Match reading view',
  'studio.padding.useDocument': 'Match reading view',
  'studio.padding.usePreset': 'Use preset',
  'studio.split': 'Split long notes',
  'studio.split.none': 'Off',
  'studio.split.fixed': 'Fixed height',
  'studio.split.hr': 'At horizontal rules',
  'studio.split.auto': 'By content blocks',
  'studio.splitHeight': 'Page height',
  'studio.splitHeightHint':
    'Max content height per page (px). Default is width × 1.414 (A4). Blocks are never cut mid-element.',
  'studio.pageOf': 'Page {page} of {total}',
  'studio.decorations': 'Decorations',
  'studio.watermark': 'Watermark',
  'studio.watermarkText': 'Text',
  'studio.watermarkOpacity': 'Opacity',
  'studio.watermarkRotate': 'Rotation',
  'studio.watermarkColor': 'Color',
  'studio.author': 'Author bar',
  'studio.authorAvatar': 'Avatar',
  'studio.authorName': 'Name',
  'studio.authorRemark': 'Bio',
  'studio.authorAlign': 'Alignment',
  'studio.authorAlign.left': 'Left',
  'studio.authorAlign.center': 'Center',
  'studio.authorAlign.right': 'Right',
  'imageSource.empty': 'No image',
  'imageSource.upload': 'Upload',
  'imageSource.vault': 'Vault',
  'imageSource.url': 'URL',
  'imageSource.clear': 'Clear',
  'imageSource.vaultTitle': 'Choose vault image',
  'imageSource.vaultSearch': 'Search images…',
  'imageSource.vaultEmpty': 'No images found',
  'imageSource.urlTitle': 'Image URL',
  'imageSource.confirm': 'Use',
  'imageSource.cancel': 'Cancel',
  'imageSource.readFail': 'Could not read the image',
  'studio.settle.idle': 'Idle',
  'studio.settle.waiting': 'Rendering…',
  'studio.settle.ready': 'Ready',
  'studio.settle.timed_out': 'Timed out — export may be incomplete',
  'studio.remote.loading': 'Loading remote images {done}/{total}',
  'studio.refreshPreview': 'Refresh preview',
  'studio.copy': 'Copy',
  'studio.save': 'Save',
  'studio.rendering': 'Updating preview…',
  'studio.exporting': 'Exporting…',
  'studio.previewEmpty': 'No preview yet',
  'studio.previewHint': 'Drag to pan · Scroll to zoom · Double-click to fit',
  'notice.noActiveFile': 'Open a Markdown note first',
  'notice.noSelection': 'Select some text first',
  'notice.copySuccess': 'Copied to clipboard',
  'notice.copyFail': 'Could not copy the image',
  'notice.saveSuccess': 'Saved: {path}',
  'notice.saveFail': 'Could not save the image',
  'notice.exportFail': 'Export failed',
  'notice.batchDone': 'Exported {count} notes',
  'notice.pdfNotSupported': 'PDF is not supported in this version',
  'notice.mobileHint':
    'Mobile: Save writes into vault attachments. Clipboard copy may be unavailable — prefer Save.',
  'setting.heading.language': 'Language',
  'setting.locale': 'Interface language',
  'setting.localeDesc':
    'Auto follows Obsidian (Chinese locales use Chinese; others use English). Reload the plugin to refresh command names.',
  'setting.locale.auto': 'Auto (follow Obsidian)',
  'setting.locale.en': 'English',
  'setting.locale.zh': 'Chinese',
  'setting.width': 'Default width',
  'setting.widthDesc': 'Default export width in pixels.',
  'setting.scale': 'Default export scale',
  'setting.scaleDesc':
    'Scale used for Copy / Save (2× recommended). Studio preview stays at 1×. Higher is sharper when zoomed, but slower.',
  'setting.format': 'Default format',
  'setting.showFilename': 'Show note title by default',
  'setting.showMetadata': 'Show properties by default',
  'setting.themeMode': 'Default theme',
  'setting.padding': 'Default padding',
  'setting.paddingDesc':
    'Margins applied when Export Studio opens. You can switch to reading-view padding in the studio.',
  'setting.embedMaxHeight': 'Max media height',
  'setting.embedMaxHeightDesc':
    'Height cap for embedded images, Mermaid, and other wide blocks (fitted to content width first). Empty or 0 = no limit.',
  'setting.embedAlign': 'Media alignment',
  'setting.embedAlignDesc':
    'Left or center for media that reaches the max height. Shorter media keeps the note layout.',
  'setting.settleTimeout': 'Render wait timeout (ms)',
  'setting.settleTimeoutDesc':
    'How long to wait for images, fonts, and diagrams before treating the note as ready.',
  'setting.quickExportSelection': 'Quick-export selection',
  'setting.quickExportSelectionDesc': 'Skip the studio and copy the selection immediately.',
  'setting.heading.defaults': 'Defaults',
  'setting.heading.media': 'Media',
  'setting.heading.behavior': 'Behavior',
};

const zh: Dict = {
  'command.exportNote': '导出笔记为图片',
  'command.exportSelection': '导出选区为图片',
  'command.exportFolder': '导出文件夹为图片',
  'menu.exportNote': '导出为图片',
  'menu.exportSelection': '导出选区为图片',
  'menu.exportFolder': '导出文件夹为图片',
  'studio.title': '导出图片',
  'studio.fidelity': '导出设置',
  'studio.width': '宽度',
  'studio.embedMaxHeight': '媒体最大高度',
  'studio.embedMaxHeightHint':
    '限制笔记中图片、Mermaid 等宽内容块的高度（会先按内容区宽度适配）。不影响左侧预览窗口大小。留空或填 0 表示不限制。',
  'studio.embedMaxHeightPlaceholder': '不限制',
  'studio.embedAlign': '媒体对齐',
  'studio.embedAlignHint': '仅作用于达到媒体最大高度的元素。',
  'studio.embedAlign.center': '居中',
  'studio.embedAlign.left': '居左',
  'studio.scale': '导出倍率',
  'studio.scaleHint': '预览始终用 1×，便于快速刷新；复制 / 保存使用此处倍率。',
  'studio.format': '格式',
  'studio.theme': '主题',
  'studio.theme.current': '跟随当前',
  'studio.theme.light': '浅色',
  'studio.theme.dark': '深色',
  'studio.showTitle': '显示笔记标题',
  'studio.showMetadata': '显示属性',
  'studio.padding': '边距',
  'studio.padding.top': '上',
  'studio.padding.right': '右',
  'studio.padding.bottom': '下',
  'studio.padding.left': '左',
  'studio.padding.vertical': '上下',
  'studio.padding.horizontal': '左右',
  'studio.padding.reset': '与阅读视图一致',
  'studio.padding.useDocument': '与阅读视图一致',
  'studio.padding.usePreset': '使用预设边距',
  'studio.split': '长文分页',
  'studio.split.none': '关闭',
  'studio.split.fixed': '固定高度',
  'studio.split.hr': '按分隔线',
  'studio.split.auto': '按内容块',
  'studio.splitHeight': '每页高度',
  'studio.splitHeightHint':
    '每页内容区最大高度（像素）。默认按宽度 × 1.414（A4 比例）。不会从段落或块中间切开。',
  'studio.pageOf': '第 {page} / {total} 页',
  'studio.decorations': '装饰',
  'studio.watermark': '水印',
  'studio.watermarkText': '文字',
  'studio.watermarkOpacity': '不透明度',
  'studio.watermarkRotate': '旋转',
  'studio.watermarkColor': '颜色',
  'studio.author': '作者栏',
  'studio.authorAvatar': '头像',
  'studio.authorName': '名称',
  'studio.authorRemark': '简介',
  'studio.authorAlign': '对齐',
  'studio.authorAlign.left': '居左',
  'studio.authorAlign.center': '居中',
  'studio.authorAlign.right': '居右',
  'imageSource.empty': '暂无图片',
  'imageSource.upload': '上传',
  'imageSource.vault': '库内',
  'imageSource.url': '链接',
  'imageSource.clear': '清除',
  'imageSource.vaultTitle': '选择库内图片',
  'imageSource.vaultSearch': '搜索图片…',
  'imageSource.vaultEmpty': '未找到图片',
  'imageSource.urlTitle': '图片链接',
  'imageSource.confirm': '使用',
  'imageSource.cancel': '取消',
  'imageSource.readFail': '无法读取该图片',
  'studio.settle.idle': '待命',
  'studio.settle.waiting': '渲染中…',
  'studio.settle.ready': '就绪',
  'studio.settle.timed_out': '等待超时 — 导出结果可能不完整',
  'studio.remote.loading': '网络图片资源加载中 {done}/{total}',
  'studio.refreshPreview': '刷新预览',
  'studio.copy': '复制',
  'studio.save': '保存',
  'studio.rendering': '正在更新预览…',
  'studio.exporting': '正在导出…',
  'studio.previewEmpty': '暂无预览',
  'studio.previewHint': '拖拽平移 · 滚轮缩放 · 双击适应窗口',
  'notice.noActiveFile': '请先打开一篇 Markdown 笔记',
  'notice.noSelection': '请先选中文本',
  'notice.copySuccess': '已复制到剪贴板',
  'notice.copyFail': '复制图片失败',
  'notice.saveSuccess': '已保存：{path}',
  'notice.saveFail': '保存图片失败',
  'notice.exportFail': '导出失败',
  'notice.batchDone': '已导出 {count} 篇笔记',
  'notice.pdfNotSupported': '当前版本不支持 PDF',
  'notice.mobileHint':
    '移动端：保存会写入库内附件目录；剪贴板复制可能不可用，请优先使用保存。',
  'setting.heading.language': '语言',
  'setting.locale': '界面语言',
  'setting.localeDesc':
    '「自动」跟随 Obsidian：中文界面用中文，其余用英文。命令名称需重载插件后才会更新。',
  'setting.locale.auto': '自动（跟随 Obsidian）',
  'setting.locale.en': 'English',
  'setting.locale.zh': '中文',
  'setting.width': '默认宽度',
  'setting.widthDesc': '默认导出宽度（像素）。',
  'setting.scale': '默认导出倍率',
  'setting.scaleDesc':
    '复制 / 保存时使用的倍率（推荐 2×）。工作室预览固定为 1×。倍率越高放大后越清晰，但更慢。',
  'setting.format': '默认格式',
  'setting.showFilename': '默认显示笔记标题',
  'setting.showMetadata': '默认显示属性',
  'setting.themeMode': '默认主题',
  'setting.padding': '默认边距',
  'setting.paddingDesc':
    '打开导出工作室时使用的边距。可在工作室内切换为「与阅读视图一致」。',
  'setting.embedMaxHeight': '媒体最大高度',
  'setting.embedMaxHeightDesc':
    '限制嵌入图片、Mermaid 等宽内容块的高度（会先按内容区宽度适配）。留空或 0 表示不限制。',
  'setting.embedAlign': '媒体对齐',
  'setting.embedAlignDesc':
    '仅对达到媒体最大高度的元素生效：居左或居中。未达上限的媒体保持文档原有排版。',
  'setting.settleTimeout': '渲染等待超时（毫秒）',
  'setting.settleTimeoutDesc': '等待图片、字体、图表等就绪的最长时间。',
  'setting.quickExportSelection': '快速导出选区',
  'setting.quickExportSelectionDesc': '跳过工作室，直接复制选区图片。',
  'setting.heading.defaults': '默认值',
  'setting.heading.media': '媒体',
  'setting.heading.behavior': '行为',
};

function resolveDict(): Dict {
  return resolveLocale() === 'zh' ? zh : en;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = resolveDict();
  let text = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
