/** Minimal stub so Vitest can resolve `import 'obsidian'` outside the app. */

export class Notice {
  constructor(_message?: string) {}
}

export const Platform = {
  isMobile: false,
  isDesktopApp: true,
};

export class Plugin {}
export class PluginSettingTab {}
export class Setting {
  constructor(_el?: unknown) {}
  setName() {
    return this;
  }
  setDesc() {
    return this;
  }
  setHeading() {
    return this;
  }
  addToggle() {
    return this;
  }
  addText() {
    return this;
  }
  addDropdown() {
    return this;
  }
  then() {
    return this;
  }
}

export type App = {
  vault: { createBinary: (...args: unknown[]) => Promise<unknown> };
  fileManager: {
    getAvailablePathForAttachment: (name: string) => Promise<string>;
  };
};

export function setIcon(_el: HTMLElement, _icon: string): void {}

export function parseYaml(_text: string): unknown {
  return {};
}

export function getLanguage(): string {
  return 'en';
}

export async function requestUrl(_opts: {
  url: string;
  method?: string;
}): Promise<{ arrayBuffer: ArrayBuffer; headers: Record<string, string> }> {
  return {
    arrayBuffer: new ArrayBuffer(8),
    headers: { 'content-type': 'image/png' },
  };
}
