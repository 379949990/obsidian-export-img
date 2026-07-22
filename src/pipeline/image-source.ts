/** Convert a Blob/File to a persistent data URL for settings storage. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Failed to read image'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'));
    reader.readAsDataURL(blob);
  });
}

export function isHttpImageSrc(src: string): boolean {
  return /^https?:\/\//i.test(src.trim());
}

export function isDataImageSrc(src: string): boolean {
  return /^data:image\//i.test(src.trim());
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
]);

export function isVaultImageExtension(extension: string): boolean {
  return IMAGE_EXTENSIONS.has(extension.toLowerCase());
}
