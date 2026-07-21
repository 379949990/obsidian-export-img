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
  'studio.fidelity': 'Fidelity',
  'studio.width': 'Width',
  'studio.scale': 'Resolution',
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
  'studio.padding.reset': 'Use document padding',
  'studio.split': 'Split long note',
  'studio.split.none': 'None',
  'studio.split.fixed': 'Fixed height',
  'studio.split.hr': 'Horizontal rules',
  'studio.split.auto': 'Block boundaries',
  'studio.splitHeight': 'Split height',
  'studio.decorations': 'Decorations',
  'studio.watermark': 'Watermark',
  'studio.watermarkText': 'Text',
  'studio.watermarkOpacity': 'Opacity',
  'studio.watermarkRotate': 'Rotation',
  'studio.watermarkColor': 'Color',
  'studio.author': 'Author bar',
  'studio.authorName': 'Name',
  'studio.authorRemark': 'Remark',
  'studio.authorAlign': 'Align',
  'studio.authorAlign.left': 'Left',
  'studio.authorAlign.center': 'Center',
  'studio.authorAlign.right': 'Right',
  'studio.settle.idle': 'Idle',
  'studio.settle.waiting': 'Waiting for render…',
  'studio.settle.ready': 'Ready',
  'studio.settle.timed_out': 'Timed out — export may be incomplete',
  'studio.copy': 'Copy',
  'studio.save': 'Save',
  'studio.rendering': 'Rendering preview…',
  'studio.exporting': 'Exporting…',
  'studio.previewEmpty': 'No preview yet',
  'studio.previewHint': 'Drag to pan · Scroll to zoom · Double-click to fit',
  'notice.noActiveFile': 'No active Markdown file',
  'notice.noSelection': 'No text selected',
  'notice.copySuccess': 'Copied to clipboard',
  'notice.copyFail': 'Failed to copy image',
  'notice.saveSuccess': 'Saved: {path}',
  'notice.saveFail': 'Failed to save image',
  'notice.exportFail': 'Export failed',
  'notice.batchDone': 'Exported {count} notes',
  'notice.pdfNotSupported': 'PDF is not supported in this version',
  'setting.heading.language': 'Language',
  'setting.locale': 'Interface language',
  'setting.localeDesc': 'Auto follows Obsidian (Simplified/Traditional Chinese → Chinese, otherwise English). Command names update after reload.',
  'setting.locale.auto': 'Auto (follow Obsidian)',
  'setting.locale.en': 'English',
  'setting.locale.zh': 'Chinese',
  'setting.width': 'Default width',
  'setting.widthDesc': 'Default export width in pixels.',
  'setting.scale': 'Default resolution',
  'setting.scaleDesc': 'Higher values look sharper on high-DPI screens.',
  'setting.format': 'Default format',
  'setting.showFilename': 'Show note title by default',
  'setting.showMetadata': 'Show properties by default',
  'setting.themeMode': 'Default theme mode',
  'setting.padding': 'Fallback padding',
  'setting.paddingDesc': 'Used when reading-view padding cannot be measured. Opening Export Studio still prefers the live document padding.',
  'setting.settleTimeout': 'Settle timeout (ms)',
  'setting.settleTimeoutDesc': 'How long to wait for images, fonts, and async blocks before exporting.',
  'setting.quickExportSelection': 'Quick export selection',
  'setting.quickExportSelectionDesc': 'Skip the studio and copy the selection immediately.',
  'setting.heading.defaults': 'Defaults',
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
  'studio.fidelity': '保真',
  'studio.width': '宽度',
  'studio.scale': '分辨率',
  'studio.format': '格式',
  'studio.theme': '主题',
  'studio.theme.current': '当前',
  'studio.theme.light': '浅色',
  'studio.theme.dark': '深色',
  'studio.showTitle': '显示笔记标题',
  'studio.showMetadata': '显示 Properties',
  'studio.padding': '边距',
  'studio.padding.top': '上',
  'studio.padding.right': '右',
  'studio.padding.bottom': '下',
  'studio.padding.left': '左',
  'studio.padding.reset': '使用文档边距',
  'studio.split': '长文分页',
  'studio.split.none': '不分页',
  'studio.split.fixed': '固定高度',
  'studio.split.hr': '按分隔线',
  'studio.split.auto': '按块边界',
  'studio.splitHeight': '分页高度',
  'studio.decorations': '装饰',
  'studio.watermark': '水印',
  'studio.watermarkText': '文字',
  'studio.watermarkOpacity': '不透明度',
  'studio.watermarkRotate': '旋转角度',
  'studio.watermarkColor': '颜色',
  'studio.author': '作者栏',
  'studio.authorName': '名称',
  'studio.authorRemark': '备注',
  'studio.authorAlign': '对齐',
  'studio.authorAlign.left': '左',
  'studio.authorAlign.center': '居中',
  'studio.authorAlign.right': '右',
  'studio.settle.idle': '空闲',
  'studio.settle.waiting': '等待渲染…',
  'studio.settle.ready': '就绪',
  'studio.settle.timed_out': '超时 — 导出可能不完整',
  'studio.copy': '复制',
  'studio.save': '保存',
  'studio.rendering': '正在渲染预览…',
  'studio.exporting': '正在导出…',
  'studio.previewEmpty': '暂无预览',
  'studio.previewHint': '拖拽平移 · 滚轮缩放 · 双击适应窗口',
  'notice.noActiveFile': '没有活动的 Markdown 文件',
  'notice.noSelection': '没有选中文本',
  'notice.copySuccess': '已复制到剪贴板',
  'notice.copyFail': '复制失败',
  'notice.saveSuccess': '已保存：{path}',
  'notice.saveFail': '保存失败',
  'notice.exportFail': '导出失败',
  'notice.batchDone': '已导出 {count} 篇笔记',
  'notice.pdfNotSupported': '当前版本不支持 PDF',
  'setting.heading.language': '语言',
  'setting.locale': '界面语言',
  'setting.localeDesc': '自动跟随 Obsidian（简体/繁体中文 → 中文，否则英文）。命令名称需重载插件后更新。',
  'setting.locale.auto': '自动（跟随 Obsidian）',
  'setting.locale.en': 'English',
  'setting.locale.zh': '中文',
  'setting.width': '默认宽度',
  'setting.widthDesc': '默认导出宽度（像素）。',
  'setting.scale': '默认分辨率',
  'setting.scaleDesc': '更高倍率在高 DPI 屏幕上更清晰。',
  'setting.format': '默认格式',
  'setting.showFilename': '默认显示笔记标题',
  'setting.showMetadata': '默认显示 Properties',
  'setting.themeMode': '默认主题模式',
  'setting.padding': '备用边距',
  'setting.paddingDesc': '无法测量阅读视图边距时使用。打开导出工作室时仍优先使用当前文档边距。',
  'setting.settleTimeout': 'Settle 超时（毫秒）',
  'setting.settleTimeoutDesc': '等待图片、字体与异步块就绪的最长时间。',
  'setting.quickExportSelection': '快速导出选区',
  'setting.quickExportSelectionDesc': '跳过工作室，直接复制选区图片。',
  'setting.heading.defaults': '默认值',
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
