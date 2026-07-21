import * as Obsidian from 'obsidian';

type Dict = Record<string, string>;

function getLocale(): string {
  const api = Obsidian as { getLanguage?: () => string };
  if (typeof api.getLanguage === 'function') {
    return api.getLanguage();
  }
  return typeof navigator !== 'undefined' ? navigator.language : 'en';
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
  'studio.split': 'Split long note',
  'studio.split.none': 'None',
  'studio.split.fixed': 'Fixed height',
  'studio.split.hr': 'Horizontal rules',
  'studio.split.auto': 'Block boundaries',
  'studio.splitHeight': 'Split height',
  'studio.decorations': 'Decorations',
  'studio.watermark': 'Watermark',
  'studio.watermarkText': 'Watermark text',
  'studio.author': 'Author bar',
  'studio.authorName': 'Author name',
  'studio.settle.idle': 'Idle',
  'studio.settle.waiting': 'Waiting for render…',
  'studio.settle.ready': 'Ready',
  'studio.settle.timed_out': 'Timed out — export may be incomplete',
  'studio.copy': 'Copy',
  'studio.save': 'Save',
  'studio.rendering': 'Rendering…',
  'studio.exporting': 'Exporting…',
  'notice.noActiveFile': 'No active Markdown file',
  'notice.noSelection': 'No text selected',
  'notice.copySuccess': 'Copied to clipboard',
  'notice.copyFail': 'Failed to copy image',
  'notice.saveSuccess': 'Saved: {path}',
  'notice.saveFail': 'Failed to save image',
  'notice.exportFail': 'Export failed',
  'notice.batchDone': 'Exported {count} notes',
  'notice.pdfNotSupported': 'PDF is not supported in this version',
  'setting.width': 'Default width',
  'setting.widthDesc': 'Default export width in pixels.',
  'setting.scale': 'Default resolution',
  'setting.scaleDesc': 'Higher values look sharper on high-DPI screens.',
  'setting.format': 'Default format',
  'setting.showFilename': 'Show note title by default',
  'setting.showMetadata': 'Show properties by default',
  'setting.themeMode': 'Default theme mode',
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
  'studio.split': '长文分页',
  'studio.split.none': '不分页',
  'studio.split.fixed': '固定高度',
  'studio.split.hr': '按分隔线',
  'studio.split.auto': '按块边界',
  'studio.splitHeight': '分页高度',
  'studio.decorations': '装饰',
  'studio.watermark': '水印',
  'studio.watermarkText': '水印文字',
  'studio.author': '作者栏',
  'studio.authorName': '作者名',
  'studio.settle.idle': '空闲',
  'studio.settle.waiting': '等待渲染…',
  'studio.settle.ready': '就绪',
  'studio.settle.timed_out': '超时 — 导出可能不完整',
  'studio.copy': '复制',
  'studio.save': '保存',
  'studio.rendering': '渲染中…',
  'studio.exporting': '导出中…',
  'notice.noActiveFile': '没有活动的 Markdown 文件',
  'notice.noSelection': '没有选中文本',
  'notice.copySuccess': '已复制到剪贴板',
  'notice.copyFail': '复制失败',
  'notice.saveSuccess': '已保存：{path}',
  'notice.saveFail': '保存失败',
  'notice.exportFail': '导出失败',
  'notice.batchDone': '已导出 {count} 篇笔记',
  'notice.pdfNotSupported': '当前版本不支持 PDF',
  'setting.width': '默认宽度',
  'setting.widthDesc': '默认导出宽度（像素）。',
  'setting.scale': '默认分辨率',
  'setting.scaleDesc': '更高倍率在高 DPI 屏幕上更清晰。',
  'setting.format': '默认格式',
  'setting.showFilename': '默认显示笔记标题',
  'setting.showMetadata': '默认显示 Properties',
  'setting.themeMode': '默认主题模式',
  'setting.settleTimeout': 'Settle 超时（毫秒）',
  'setting.settleTimeoutDesc': '等待图片、字体与异步块就绪的最长时间。',
  'setting.quickExportSelection': '快速导出选区',
  'setting.quickExportSelectionDesc': '跳过工作室，直接复制选区图片。',
  'setting.heading.defaults': '默认值',
  'setting.heading.behavior': '行为',
};

function resolveDict(): Dict {
  const lang = getLocale();
  return lang.startsWith('zh') ? zh : en;
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
