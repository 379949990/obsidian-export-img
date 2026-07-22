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
  'studio.scaleHintMobile':
    'Preview is 1×. Copy / Save use this scale (1× / 2× / 3×). For very long notes, enable Split or lower scale if the app struggles.',
  'studio.mobileManualRefreshHint':
    'On mobile, changing settings does not auto-refresh the preview. Tap Update preview when ready, or Copy / Save (they refresh first).',
  'studio.mobileRefreshRequired':
    'Settings changed — preview is out of date. Tap Update preview, or Copy / Save to refresh then export.',
  'studio.manualRefreshHint':
    'Auto re-render is off. Tap Update preview after edits, or Copy / Save to refresh then export.',
  'studio.refreshRequired':
    'Settings changed — preview is out of date. Tap Update preview, or Copy / Save to refresh then export.',
  'studio.progress.render': 'Preparing…',
  'studio.progress.hydrate': 'Remote images {done}/{total}',
  'studio.progress.settle': 'Waiting for layout…',
  'studio.progress.capture': 'Capturing…',
  'studio.progress.capturePage': 'Capturing page {page}/{total}',
  'studio.format': 'Format',
  'studio.theme': 'Theme',
  'studio.theme.current': 'Current',
  'studio.theme.light': 'Light',
  'studio.theme.dark': 'Dark',
  'studio.showTitle': 'Show note title',
  'studio.showMetadata': 'Show properties',
  'studio.padding': 'Padding',
  'studio.padding.vertical': 'Vertical',
  'studio.padding.horizontal': 'Horizontal',
  'studio.padding.useDocument': 'Match reading view',
  'studio.padding.usePreset': 'Use preset',
  'studio.split': 'Split long notes',
  'studio.split.none': 'Off',
  'studio.split.fixed': 'Fixed height',
  'studio.split.hr': 'At horizontal rules',
  'studio.splitHeight': 'Page height',
  'studio.splitHeightHint':
    'Max content height per page (px). Default is width × 1.414 (A4). Blocks are never cut mid-element.',
  'studio.pageOf': 'Page {page} of {total}',
  'studio.decorations': 'Decorations',
  'studio.watermark': 'Watermark',
  'studio.watermarkType': 'Type',
  'studio.watermarkText': 'Text',
  'studio.watermarkImage': 'Image',
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
  'studio.exportDespiteTimeout': 'Export anyway (incomplete render)',
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
  'studio.refreshPreview': 'Update preview',
  'studio.copy': 'Copy',
  'studio.save': 'Save',
  'studio.rendering': 'Updating preview…',
  'studio.previewEmpty': 'No preview yet',
  'studio.previewHint': 'Drag to pan · Scroll to zoom · Double-click to fit',
  'studio.previewHintMobile': 'Drag to pan · Pinch to zoom · Double-tap to fit',
  'notice.noActiveFile': 'Open a Markdown note first',
  'notice.noSelection': 'Select some text first',
  'notice.copySuccess': 'Copied to clipboard',
  'notice.copyFail': 'Could not copy the image',
  'notice.saveSuccess': 'Saved: {path}',
  'notice.saveFail': 'Could not save the image',
  'notice.savePagesSuccess': 'Saved {count} images to the vault',
  'notice.savePartialFail':
    'Save stopped after {saved} of {total} images — settings were not updated',
  'notice.exportFail': 'Export failed',
  'notice.batchDone': 'Exported {count} notes',
  'notice.remotePartial': 'Some remote images failed ({count}). Preview may be incomplete.',
  'notice.mobileHint':
    'Mobile: Save writes images into your vault as attachments (path shown in the notice). Clipboard copy may be unavailable. Change settings, then tap refresh to update the preview.',
  'notice.mobileRefreshFirst':
    'Preview was out of date — tap Update preview, or Copy / Save to refresh then export.',
  'notice.refreshFirst':
    'Preview was out of date — tap Update preview, or Copy / Save to refresh then export.',
  'notice.mobileMegaBlock':
    'A single block (e.g. a tall image or code fence) is very tall — consider Split or a lower scale if capture fails.',
  'notice.mobileCanvasRisk':
    'This export is large for mobile memory. If the app struggles, enable Split or lower the export scale.',
  'notice.settleTimeout': 'Render wait timed out — export may be incomplete.',
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
    'Scale used for Copy / Save (2× recommended). Studio preview stays at 1×. Higher is sharper when zoomed, but slower and more memory-hungry on mobile.',
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
    'How long to wait for images, fonts, and diagrams before treating the note as ready. On mobile this is capped at 5s.',
  'setting.quickExportSelection': 'Quick-export selection',
  'setting.quickExportSelectionDesc': 'Skip the studio and copy the selection immediately.',
  'setting.autoRerenderPreview': 'Auto re-render preview on config change',
  'setting.autoRerenderPreviewDesc':
    'When enabled, Export Studio refreshes the preview after committed setting changes (sliders on release, text on blur, selects immediately). Default is on for desktop and off for mobile. Can increase CPU/GPU use and may feel jumpy on long notes. When off, use Update preview, or Copy / Save (they refresh the host first).',
  'setting.restoreDefaults': 'Restore defaults',
  'setting.restoreDefaultsDesc':
    'Reset all plugin settings to built-in defaults (width, theme, watermark presets, author presets, behavior flags, and more).',
  'setting.heading.defaults': 'Defaults',
  'setting.heading.media': 'Media',
  'setting.heading.author': 'Author',
  'setting.heading.watermark': 'Watermark',
  'setting.heading.behavior': 'Behavior',
  'setting.authorAvatar': 'Avatar',
  'setting.authorName': 'Name',
  'setting.authorRemark': 'Bio',
  'setting.authorAlign': 'Alignment',
  'setting.authorPreconfigDesc':
    'Used when the author bar is enabled in Export Studio (toggle is only in the studio).',
  'setting.watermarkType': 'Watermark type',
  'setting.watermarkType.text': 'Text',
  'setting.watermarkType.image': 'Image',
  'setting.watermarkPreconfigDesc':
    'Used when the watermark is enabled in Export Studio (toggle is only in the studio).',
  'setting.watermarkText': 'Watermark text',
  'setting.watermarkImage': 'Watermark image',
  'setting.watermarkColor': 'Text color',
  'setting.watermarkOpacity': 'Opacity',
  'setting.watermarkRotate': 'Rotation',
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
  'studio.scaleHintMobile':
    '预览为 1×。复制 / 保存使用此处倍率（1× / 2× / 3×）。超长笔记若卡顿，可开启分页或降低倍率。',
  'studio.mobileManualRefreshHint':
    '移动端修改配置后不会自动刷新预览。可点「更新预览」，或直接复制 / 保存（会先按当前配置刷新再导出）。',
  'studio.mobileRefreshRequired':
    '配置已更改 — 预览未更新。可点「更新预览」，或直接复制 / 保存（会先刷新再导出）。',
  'studio.manualRefreshHint':
    '当前未开启「配置变更自动重新渲染」。可点「更新预览」，或直接复制 / 保存（会先刷新再导出）。',
  'studio.refreshRequired':
    '配置已更改 — 预览未更新。可点「更新预览」，或直接复制 / 保存（会先刷新再导出）。',
  'studio.progress.render': '准备中…',
  'studio.progress.hydrate': '网络图片 {done}/{total}',
  'studio.progress.settle': '等待排版稳定…',
  'studio.progress.capture': '截取预览…',
  'studio.progress.capturePage': '截取第 {page}/{total} 页',
  'studio.format': '格式',
  'studio.theme': '主题',
  'studio.theme.current': '跟随当前',
  'studio.theme.light': '浅色',
  'studio.theme.dark': '深色',
  'studio.showTitle': '显示笔记标题',
  'studio.showMetadata': '显示属性',
  'studio.padding': '边距',
  'studio.padding.vertical': '上下',
  'studio.padding.horizontal': '左右',
  'studio.padding.useDocument': '与阅读视图一致',
  'studio.padding.usePreset': '使用预设边距',
  'studio.split': '长文分页',
  'studio.split.none': '关闭',
  'studio.split.fixed': '固定高度',
  'studio.split.hr': '按分隔线',
  'studio.splitHeight': '每页高度',
  'studio.splitHeightHint':
    '每页内容区最大高度（像素）。默认按宽度 × 1.414（A4 比例）。不会从段落或块中间切开。',
  'studio.pageOf': '第 {page} / {total} 页',
  'studio.decorations': '装饰',
  'studio.watermark': '水印',
  'studio.watermarkType': '类型',
  'studio.watermarkText': '文字',
  'studio.watermarkImage': '图片',
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
  'studio.exportDespiteTimeout': '仍要导出（渲染可能不完整）',
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
  'studio.refreshPreview': '更新预览',
  'studio.copy': '复制',
  'studio.save': '保存',
  'studio.rendering': '正在更新预览…',
  'studio.previewEmpty': '暂无预览',
  'studio.previewHint': '拖拽平移 · 滚轮缩放 · 双击适应窗口',
  'studio.previewHintMobile': '拖拽平移 · 双指缩放 · 双击适应窗口',
  'notice.noActiveFile': '请先打开一篇 Markdown 笔记',
  'notice.noSelection': '请先选中文本',
  'notice.copySuccess': '已复制到剪贴板',
  'notice.copyFail': '复制图片失败',
  'notice.saveSuccess': '已保存：{path}',
  'notice.saveFail': '保存图片失败',
  'notice.savePagesSuccess': '已保存 {count} 张图片到库附件',
  'notice.savePartialFail': '保存中断：已写入 {saved}/{total} 张，设置未更新',
  'notice.exportFail': '导出失败',
  'notice.batchDone': '已导出 {count} 篇笔记',
  'notice.remotePartial': '部分网络图片加载失败（{count}）。预览可能不完整。',
  'notice.mobileHint':
    '移动端：保存会写入库附件（Notice 会显示路径）；剪贴板复制可能不可用。修改配置后请点刷新更新预览。',
  'notice.mobileRefreshFirst':
    '预览未更新 — 可点「更新预览」，或直接复制 / 保存（会先刷新再导出）。',
  'notice.refreshFirst':
    '预览未更新 — 可点「更新预览」，或直接复制 / 保存（会先刷新再导出）。',
  'notice.mobileMegaBlock':
    '存在特别高的整块内容（如超高图片或代码块）。若捕获失败，可开启分页或降低倍率。',
  'notice.mobileCanvasRisk':
    '本次导出体积较大，移动端内存压力较高。若卡顿或闪退，请开启分页或降低导出倍率。',
  'notice.settleTimeout': '渲染等待超时 — 导出结果可能不完整。',
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
    '复制 / 保存时使用的倍率（推荐 2×）。工作室预览固定为 1×。倍率越高越清晰，移动端也更耗内存。',
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
  'setting.settleTimeoutDesc':
    '等待图片、字体、图表等就绪的最长时间。移动端上限为 5 秒。',
  'setting.quickExportSelection': '快速导出选区',
  'setting.quickExportSelectionDesc': '跳过工作室，直接复制选区图片。',
  'setting.autoRerenderPreview': '导出配置变更自动重新渲染',
  'setting.autoRerenderPreviewDesc':
    '开启后，导出工作室会在配置「提交」后自动刷新预览（拖拽条松手、文本失焦、下拉/开关立即）。默认：桌面开启、移动端关闭。会增加 CPU/GPU 占用；长笔记可能更卡。关闭时，可点「更新预览」，或直接复制 / 保存（会先按当前配置刷新再导出）。',
  'setting.restoreDefaults': '恢复默认设置',
  'setting.restoreDefaultsDesc':
    '将全部插件设置恢复为内置默认值（宽度、主题、水印/作者预设、行为开关等）。',
  'setting.heading.defaults': '默认值',
  'setting.heading.media': '媒体',
  'setting.heading.author': '作者',
  'setting.heading.watermark': '水印',
  'setting.heading.behavior': '行为',
  'setting.authorAvatar': '头像',
  'setting.authorName': '名称',
  'setting.authorRemark': '简介',
  'setting.authorAlign': '对齐',
  'setting.authorPreconfigDesc': '在导出工作室中开启作者栏时使用。开关仅在导出弹窗内。',
  'setting.watermarkType': '水印类型',
  'setting.watermarkType.text': '文字',
  'setting.watermarkType.image': '图片',
  'setting.watermarkPreconfigDesc': '在导出工作室中启用水印时使用。开关仅在导出弹窗内。',
  'setting.watermarkText': '水印文字',
  'setting.watermarkImage': '水印图片',
  'setting.watermarkColor': '文字颜色',
  'setting.watermarkOpacity': '不透明度',
  'setting.watermarkRotate': '旋转角度',
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
