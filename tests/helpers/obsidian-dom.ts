/**
 * Minimal Obsidian DOM helpers for happy-dom unit tests.
 * Install once per file (beforeEach).
 */
export function installObsidianDomHelpers(): void {
  const proto = HTMLElement.prototype as unknown as {
    addClass?: (cls: string) => void;
    removeClass?: (cls: string) => void;
    hasClass?: (cls: string) => boolean;
    setCssProps?: (props: Record<string, string>) => void;
  };

  if (!proto.addClass) {
    proto.addClass = function addClass(this: HTMLElement, cls: string) {
      this.classList.add(cls);
    };
    proto.removeClass = function removeClass(this: HTMLElement, cls: string) {
      this.classList.remove(cls);
    };
    proto.hasClass = function hasClass(this: HTMLElement, cls: string) {
      return this.classList.contains(cls);
    };
    proto.setCssProps = function setCssProps(
      this: HTMLElement,
      props: Record<string, string>,
    ) {
      for (const [key, value] of Object.entries(props)) {
        this.style.setProperty(key, value);
      }
    };
  }

  const elProto = Element.prototype as unknown as {
    instanceOf?: (ctor: abstract new (...args: never[]) => unknown) => boolean;
  };
  if (!elProto.instanceOf) {
    elProto.instanceOf = function instanceOf(
      this: Element,
      ctor: abstract new (...args: never[]) => unknown,
    ) {
      return this instanceof ctor;
    };
  }

  const g = globalThis as unknown as {
    createDiv?: (opts?: { cls?: string }) => HTMLDivElement;
  };
  // Avoid clobbering Obsidian's richer createDiv typing when present.
  if (typeof g.createDiv !== 'function') {
    g.createDiv = (opts?: { cls?: string }) => {
      const el = document.createElement('div');
      if (opts?.cls) el.className = opts.cls;
      return el;
    };
  }
}

/** Force layout metrics happy-dom often leaves at 0. */
export function stubBox(
  el: HTMLElement,
  size: { width?: number; height?: number; scrollWidth?: number; scrollHeight?: number },
): void {
  if (size.width !== undefined) {
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => size.width });
  }
  if (size.height !== undefined) {
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => size.height });
    Object.defineProperty(el, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          width: size.width ?? 0,
          height: size.height,
          top: 0,
          left: 0,
          right: size.width ?? 0,
          bottom: size.height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });
  }
  if (size.scrollWidth !== undefined) {
    Object.defineProperty(el, 'scrollWidth', {
      configurable: true,
      get: () => size.scrollWidth,
    });
  }
  if (size.scrollHeight !== undefined) {
    Object.defineProperty(el, 'scrollHeight', {
      configurable: true,
      get: () => size.scrollHeight,
    });
  }
}
