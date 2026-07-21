import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { App } from 'obsidian';
import type ExportImgPlugin from '../main';

export interface AppContextValue {
  app: App;
  plugin: ExportImgPlugin;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('AppContext missing');
  }
  return ctx;
}
