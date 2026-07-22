import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';

const { noticeMock, saveAsMock, platform } = vi.hoisted(() => ({
  noticeMock: vi.fn(),
  saveAsMock: vi.fn(),
  platform: { isMobile: false },
}));

vi.mock('obsidian', async () => {
  const actual = await vi.importActual<typeof import('./mocks/obsidian')>(
    './mocks/obsidian',
  );
  return {
    ...actual,
    Notice: noticeMock,
    Platform: platform,
  };
});

vi.mock('file-saver', () => ({
  saveAs: (...args: unknown[]) => saveAsMock(...args),
}));

import {
  safeFilename,
  saveBlob,
  saveMultipleBlobs,
} from '../src/pipeline/output';

function mockApp(overrides?: {
  getAvailablePathForAttachment?: (name: string) => Promise<string>;
  createBinary?: (path: string, data: ArrayBuffer) => Promise<unknown>;
}): App {
  return {
    fileManager: {
      getAvailablePathForAttachment:
        overrides?.getAvailablePathForAttachment ??
        vi.fn(async (name: string) => `Attachments/${name}`),
    },
    vault: {
      createBinary: overrides?.createBinary ?? vi.fn(async () => undefined),
    },
  } as unknown as App;
}

describe('safeFilename', () => {
  it('sanitizes path characters and whitespace', () => {
    expect(safeFilename('a/b:c*d?"e<>|f  g', 'png')).toBe('a_b_c_d_e_f_g.png');
  });

  it('appends page index and maps jpg extension', () => {
    expect(safeFilename('Note', 'jpg', 2)).toBe('Note_2.jpg');
    expect(safeFilename('Note', 'webp')).toBe('Note.webp');
  });
});

describe('saveBlob', () => {
  beforeEach(() => {
    noticeMock.mockClear();
    saveAsMock.mockClear();
    platform.isMobile = false;
    vi.unstubAllGlobals();
  });

  it('downloads via file-saver on desktop', async () => {
    const app = mockApp();
    const blob = new Blob([new Uint8Array(64)], { type: 'image/png' });
    const path = await saveBlob(app, blob, 'Hello World', 'png');
    expect(path).toBe('Hello_World.png');
    expect(saveAsMock).toHaveBeenCalledWith(blob, 'Hello_World.png');
    expect(app.fileManager.getAvailablePathForAttachment).not.toHaveBeenCalled();
  });

  it('shares an image file on mobile when Web Share is available', async () => {
    platform.isMobile = true;
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn(() => true);
    vi.stubGlobal('navigator', {
      ...navigator,
      share,
      canShare,
    });

    const createBinary = vi.fn(async () => undefined);
    const app = mockApp({ createBinary });
    const blob = new Blob([new Uint8Array(64)], { type: 'image/png' });
    const path = await saveBlob(app, blob, 'Note/Title', 'png');

    expect(path).toBe('Note_Title.png');
    expect(canShare).toHaveBeenCalled();
    expect(share).toHaveBeenCalledOnce();
    expect(createBinary).not.toHaveBeenCalled();
    expect(saveAsMock).not.toHaveBeenCalled();
    expect(noticeMock).toHaveBeenCalled();
  });

  it('falls back to download then vault when share is unavailable', async () => {
    platform.isMobile = true;
    vi.stubGlobal('navigator', {
      ...navigator,
      canShare: undefined,
      share: undefined,
    });
    saveAsMock.mockImplementationOnce(() => {
      throw new Error('download blocked');
    });

    const createBinary = vi.fn(async () => undefined);
    const getPath = vi.fn(async (name: string) => `Attachments/${name}`);
    const app = mockApp({
      getAvailablePathForAttachment: getPath,
      createBinary,
    });
    const blob = new Blob([new Uint8Array(64)], { type: 'image/png' });
    const path = await saveBlob(app, blob, 'Note/Title', 'png');
    expect(path).toBe('Attachments/Note_Title.png');
    expect(getPath).toHaveBeenCalledWith('Note_Title.png');
    expect(createBinary).toHaveBeenCalledOnce();
  });

  it('treats share abort as cancellation', async () => {
    platform.isMobile = true;
    const share = vi.fn(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      share,
      canShare: () => true,
    });
    const createBinary = vi.fn(async () => undefined);
    const app = mockApp({ createBinary });
    const blob = new Blob([new Uint8Array(64)], { type: 'image/png' });
    const path = await saveBlob(app, blob, 'Note', 'png');
    expect(path).toBeUndefined();
    expect(createBinary).not.toHaveBeenCalled();
    expect(saveAsMock).not.toHaveBeenCalled();
  });
});

describe('saveMultipleBlobs', () => {
  beforeEach(() => {
    noticeMock.mockClear();
    saveAsMock.mockClear();
    platform.isMobile = false;
    vi.unstubAllGlobals();
  });

  it('saves individually when only one item on desktop', async () => {
    const app = mockApp();
    const blob = new Blob([new Uint8Array(64)], { type: 'image/png' });
    await saveMultipleBlobs(app, [{ blob, title: 'One', format: 'png' }], 'batch');
    expect(saveAsMock).toHaveBeenCalledWith(blob, 'One.png');
  });

  it('zips multiple items on desktop', async () => {
    const app = mockApp();
    const a = new Blob([new Uint8Array(32)], { type: 'image/png' });
    const b = new Blob([new Uint8Array(32)], { type: 'image/png' });
    await saveMultipleBlobs(
      app,
      [
        { blob: a, title: 'Page', format: 'png', index: 1 },
        { blob: b, title: 'Page', format: 'png', index: 2 },
      ],
      'My Folder',
    );
    expect(saveAsMock).toHaveBeenCalledOnce();
    const [zipBlob, name] = saveAsMock.mock.calls[0]!;
    expect(name).toBe('My_Folder.zip');
    expect(zipBlob).toBeInstanceOf(Blob);
    expect((zipBlob as Blob).type).toBe('application/zip');
  });

  it('never zips on mobile even with multiple items', async () => {
    platform.isMobile = true;
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      share,
      canShare: () => true,
    });
    const createBinary = vi.fn(async () => undefined);
    const app = mockApp({ createBinary });
    const a = new Blob([new Uint8Array(32)], { type: 'image/png' });
    const b = new Blob([new Uint8Array(32)], { type: 'image/png' });
    await saveMultipleBlobs(
      app,
      [
        { blob: a, title: 'Page', format: 'png', index: 1 },
        { blob: b, title: 'Page', format: 'png', index: 2 },
      ],
      'batch',
    );
    expect(share).toHaveBeenCalledTimes(2);
    expect(createBinary).not.toHaveBeenCalled();
    expect(saveAsMock).not.toHaveBeenCalled();
  });
});
