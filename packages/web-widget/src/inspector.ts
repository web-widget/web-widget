function findContainer(el: HTMLElement | null): HTMLElement | null {
  if (!el) {
    return null;
  }
  if (el.tagName === 'WEB-WIDGET' && el.hasAttribute('import')) {
    return el;
  }
  const container = el.closest('web-widget[import]') as HTMLElement;
  return container;
}

function openInEditor(path: string, srcDir: string): void {
  const resolvedURL = new URL(path, document.baseURI);
  if (resolvedURL.origin === location.origin) {
    fetch(`/__open-in-editor?file=${srcDir + resolvedURL.pathname}`);
  } else {
    location.href = resolvedURL.href;
  }
}

export class HTMLWebWidgetInspectorElement extends HTMLElement {
  // Theme config
  static themeMap = {
    light: {
      bg: 'rgba(255,255,255,0.92)',
      fg: '#222',
      border: '#e5e7eb',
      accent: '#444',
    },
    dark: {
      bg: 'rgba(36,37,38,0.92)',
      fg: '#e5e7eb',
      border: '#444',
      accent: '#bbb',
    },
  };

  // State
  #_themeMode: 'auto' | keyof typeof HTMLWebWidgetInspectorElement.themeMap =
    'auto';
  #_themeMediaQuery?: MediaQueryList;
  #_themeListener?: () => void;
  #pressedKeys: Set<string> = new Set();
  #hoveredElement?: HTMLElement;
  #isToolbarVisible: boolean = this.#getStoredVisibility();
  #isInspectorMode: boolean = false;
  #toolbar?: HTMLElement;
  #overlay?: HTMLElement;
  #widgetCount: number = 0;

  // Public API
  setTheme(mode: 'auto' | keyof typeof HTMLWebWidgetInspectorElement.themeMap) {
    this.#_themeMode = mode;
    this.#applyTheme();
  }
  get dir() {
    return this.getAttribute('dir') || '';
  }
  set dir(value) {
    this.setAttribute('dir', value);
  }
  get keys() {
    return JSON.parse(this.getAttribute('keys') || '[]');
  }
  set keys(value) {
    this.setAttribute('keys', JSON.stringify(value));
  }
  get routeModuleSource() {
    return this.getAttribute('route-module-source') || '';
  }
  set routeModuleSource(value) {
    this.setAttribute('route-module-source', value);
  }

  // Private methods (ES native #)
  #setButtonSelected(btn: HTMLElement | null | undefined, selected: boolean) {
    if (btn) {
      btn.setAttribute('data-selected', selected ? 'true' : 'false');
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }
  }
  #applyTheme(): void {
    if (
      this.#_themeMode !== 'auto' &&
      HTMLWebWidgetInspectorElement.themeMap[this.#_themeMode]
    ) {
      this.#setThemeVars(
        HTMLWebWidgetInspectorElement.themeMap[this.#_themeMode]
      );
      return;
    }
    this.#applyAutoTheme();
  }
  #applyAutoTheme(): void {
    let bg = getComputedStyle(document.body).backgroundColor;
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
      bg = getComputedStyle(document.documentElement).backgroundColor;
    }
    let isTransparent = false;
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
      bg = 'rgb(255,255,255)';
      isTransparent = true;
    }
    let r = 255,
      g = 255,
      b = 255;
    const match = bg.match(/rgba?\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(',').map((x) => parseFloat(x.trim()));
      r = parts[0] ?? 255;
      g = parts[1] ?? 255;
      b = parts[2] ?? 255;
    }
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (isTransparent || Number.isNaN(brightness) || brightness >= 128) {
      this.#setThemeVars(HTMLWebWidgetInspectorElement.themeMap.light);
    } else {
      this.#setThemeVars(HTMLWebWidgetInspectorElement.themeMap.dark);
    }
  }
  #setThemeVars(vars: {
    bg: string;
    fg: string;
    border: string;
    accent: string;
  }) {
    const root = document.documentElement;
    root.style.setProperty('--wwi-bg', vars.bg);
    root.style.setProperty('--wwi-fg', vars.fg);
    root.style.setProperty('--wwi-border', vars.border);
    root.style.setProperty('--wwi-accent', vars.accent);
  }
  #getStoredVisibility(): boolean {
    const stored = localStorage.getItem('web-widget-inspector-visible');
    return stored !== null ? stored === 'true' : true;
  }
  #storeVisibility(visible: boolean): void {
    localStorage.setItem('web-widget-inspector-visible', visible.toString());
  }
  #getStoredMinimized(): boolean {
    const stored = localStorage.getItem('web-widget-inspector-minimized');
    return stored === 'true';
  }
  #storeMinimized(minimized: boolean): void {
    localStorage.setItem(
      'web-widget-inspector-minimized',
      minimized.toString()
    );
  }
  #updateWidgetCount(): void {
    this.#widgetCount = document.querySelectorAll('web-widget[import]').length;
  }

  handleKeyEvent(event: KeyboardEvent, add: boolean): void {
    if (event.code === 'Escape' && this.#isInspectorMode) {
      this.#isInspectorMode = false;
      this.#updateState();
      event.preventDefault();
      return;
    }
    if (add) this.#pressedKeys.add(event.code);
    else this.#pressedKeys.delete(event.code);
    this.#updateState();
  }
  clearKeys(): void {
    this.#pressedKeys.clear();
  }
  #checkKeysMatch(targetKeys: string[]): boolean {
    if (!targetKeys.length) return false;
    return targetKeys.every((key: string) => {
      const normalizedKey = key === 'Shift' ? 'ShiftLeft' : key;
      return this.#pressedKeys.has(key) || this.#pressedKeys.has(normalizedKey);
    });
  }
  handleHoverEvent(event: MouseEvent): void {
    if (!this.#isInspectorMode) return;
    const target = findContainer(event.target as HTMLElement);
    this.#hoveredElement = target || undefined;
    this.#updateState();
  }
  handleClickEvent(event: MouseEvent): void {
    if (this.#isInspectorMode) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.type === 'click') {
        const target = findContainer(event.target as HTMLElement);
        const inspectUrl = target?.getAttribute('import');
        if (inspectUrl) {
          this.#isInspectorMode = false;
          document.body.style.cursor = 'progress';
          openInEditor(inspectUrl, this.dir);
          this.#updateState();
        }
      }
    }
  }

  #updateState(): void {
    const shouldShowInspector = !!(
      this.#hoveredElement && this.#isInspectorMode
    );
    const targetKeys = this.keys;
    const shouldShowToolbar =
      this.#isToolbarVisible || this.#checkKeysMatch(targetKeys);
    if (!this.#isToolbarVisible && this.#checkKeysMatch(targetKeys))
      this.showToolbar();
    this.#updateOverlay(shouldShowInspector);
    this.#updateToolbar(shouldShowToolbar);
    this.#setButtonSelected(
      this.#toolbar?.querySelector('.inspect-btn'),
      this.#isInspectorMode
    );
    const shouldShowPointer = !!(this.#hoveredElement && this.#isInspectorMode);
    if (shouldShowPointer) {
      document.body.style.setProperty('cursor', 'pointer', 'important');
      if (!document.getElementById('web-widget-inspector-cursor-override')) {
        const style = document.createElement('style');
        style.id = 'web-widget-inspector-cursor-override';
        style.textContent = `* { cursor: pointer !important; }`;
        document.head.appendChild(style);
      }
    } else {
      document.body.style.removeProperty('cursor');
      const overrideStyle = document.getElementById(
        'web-widget-inspector-cursor-override'
      );
      if (overrideStyle) overrideStyle.remove();
    }
  }

  #updateOverlay(show: boolean): void {
    if (!this.#overlay) {
      this.#overlay = document.createElement('div');
      this.#overlay.className = 'web-widget-inspector-overlay';
      this.#overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.#overlay);
    }
    if (show && this.#hoveredElement) {
      const rect = this.#getElementBounds(this.#hoveredElement!);
      this.#overlay.style.cssText = `
        position: fixed !important;
        top: ${rect.y}px !important;
        left: ${rect.x}px !important;
        width: ${rect.width}px !important;
        height: ${rect.height}px !important;
        z-index: 999998 !important;
        pointer-events: none !important;
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
        cursor: pointer !important;
        background: repeating-linear-gradient(
          45deg,
          rgba(102, 126, 234, 0.5),
          rgba(102, 126, 234, 0.5) 5px,
          rgba(255, 255, 255, 0.5) 5px,
          rgba(255, 255, 255, 0.5) 10px
        ) !important;
        border: 2px solid rgba(102, 126, 234, 0.9) !important;
        border-radius: 4px !important;
        box-sizing: border-box !important;
      `;
    } else {
      this.#overlay.style.cssText = `
        position: fixed !important;
        top: -9999px !important;
        left: -9999px !important;
        width: 0 !important;
        height: 0 !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        display: none !important;
        z-index: -1 !important;
      `;
    }
  }

  #getElementBounds(element: Element): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      const children = Array.from(element.children);
      if (children.length > 0) {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        children.forEach((child: Element) => {
          const childRect = child.getBoundingClientRect();
          if (childRect.width > 0 && childRect.height > 0) {
            minX = Math.min(minX, childRect.left);
            minY = Math.min(minY, childRect.top);
            maxX = Math.max(maxX, childRect.right);
            maxY = Math.max(maxY, childRect.bottom);
          }
        });
        if (minX !== Infinity) {
          return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
      }
      const parent = element.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        if (parentRect.width > 0 && parentRect.height > 0) {
          return {
            x: parentRect.left,
            y: parentRect.top,
            width: parentRect.width,
            height: parentRect.height,
          };
        }
      }
      return {
        x: rect.left || 100,
        y: rect.top || 100,
        width: 100,
        height: 50,
      };
    }
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  #updateToolbar(show: boolean): void {
    if (!this.#toolbar) {
      this.#toolbar = this.#createToolbar();
      if (this.#toolbar) this.appendChild(this.#toolbar);
    }
    if (this.#toolbar) {
      this.#toolbar.style.visibility = show ? 'visible' : 'hidden';
      this.#toolbar.style.opacity = show ? '1' : '0';
    }
  }

  #createToolbar(): HTMLElement {
    const toolbar = document.createElement('web-widget-inspector-toolbar');
    if (this.#getStoredMinimized())
      toolbar.setAttribute('data-minimized', 'true');
    toolbar.addEventListener('click', (e: MouseEvent) => {
      if (toolbar.getAttribute('data-minimized') === 'true') {
        this.minimizeToolbar();
        e.stopPropagation();
      }
    });
    // Logo
    const header = document.createElement('div');
    header.className = 'inspector-header';
    header.innerHTML = `
      <div class="inspector-logo" tabindex="0" title="Web Widget Inspector">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2Z"/>
        </svg>
        <span>Web Widget</span>
      </div>
    `;
    header
      .querySelector('.inspector-logo')
      ?.addEventListener('click', (e: Event) => {
        this.minimizeToolbar();
        e.stopPropagation();
      });
    toolbar.appendChild(header);
    this.#updateWidgetCount();
    const info = document.createElement('div');
    info.className = 'inspector-info';
    info.innerHTML = `<span class="widget-count">${this.#widgetCount} widgets</span>`;
    toolbar.appendChild(info);
    const actions = document.createElement('div');
    actions.className = 'inspector-actions';
    const inspectorButton = document.createElement('button');
    inspectorButton.className = 'inspector-btn inspect-btn';
    inspectorButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>Inspect</span>
    `;
    inspectorButton.title = 'Click to activate widget inspector (ESC to exit)';
    inspectorButton.setAttribute(
      'aria-label',
      'Activate widget inspector mode'
    );
    inspectorButton.onclick = () => this.toggleInspector();
    actions.appendChild(inspectorButton);
    const routeButton = document.createElement('button');
    routeButton.className = 'inspector-btn route-btn';
    routeButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
      <span>Edit Page</span>
    `;
    routeButton.title = 'Edit current page';
    routeButton.setAttribute('aria-label', 'Edit current page');
    routeButton.onclick = () => this.#openRouteModule();
    actions.appendChild(routeButton);
    toolbar.appendChild(actions);
    const controls = document.createElement('div');
    controls.className = 'inspector-controls';
    const hideButton = document.createElement('button');
    hideButton.className = 'inspector-btn hide-btn';
    hideButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    `;
    hideButton.title = 'Hide Web Widget Inspector';
    hideButton.setAttribute('aria-label', 'Hide inspector toolbar');
    hideButton.onclick = (e: MouseEvent) => {
      this.hideToolbar();
      e.stopPropagation();
    };
    controls.appendChild(hideButton);
    const toggleButton = document.createElement('button');
    toggleButton.className = 'inspector-btn toggle-btn';
    toggleButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    `;
    toggleButton.title = 'Minimize Web Widget Inspector';
    toggleButton.setAttribute('aria-label', 'Minimize inspector toolbar');
    toggleButton.onclick = (e: MouseEvent) => {
      this.minimizeToolbar();
      e.stopPropagation();
    };
    controls.appendChild(toggleButton);
    toolbar.appendChild(controls);
    return toolbar;
  }

  #openRouteModule(): void {
    if (!this.routeModuleSource) {
      alert('Page source not available for editing');
      return;
    }
    document.body.style.cursor = 'progress';
    const currentFilePath = this.#getCurrentFilePath();
    const openUrl = `/__open-in-editor?file=${encodeURIComponent(currentFilePath)}`;
    fetch(openUrl).finally(() => {
      document.body.style.removeProperty('cursor');
    });
  }
  #getCurrentFilePath(): string {
    if (!this.routeModuleSource) return '';
    try {
      if (this.routeModuleSource.startsWith('source://')) {
        return this.routeModuleSource.replace('source://', '');
      }
      const url = new URL(this.routeModuleSource);
      return url.pathname;
    } catch {
      return this.routeModuleSource;
    }
  }
  #loadRouteModuleSourceFromHeaders(): void {
    if (!this.routeModuleSource) {
      fetch(window.location.href, { method: 'HEAD' }).then(
        (response: Response) => {
          const moduleSource = response.headers.get('x-module-source');
          if (moduleSource) {
            this.routeModuleSource = moduleSource;
            if (this.#toolbar) {
              this.#toolbar.remove();
              this.#toolbar = undefined;
              this.#updateState();
            }
          }
        }
      );
    }
  }

  toggleInspector(): void {
    this.#isInspectorMode = !this.#isInspectorMode;
    this.#updateState();
  }
  showToolbar(): void {
    this.#isToolbarVisible = true;
    this.#updateState();
    this.#storeVisibility(true);
  }
  hideToolbar(): void {
    this.#isToolbarVisible = false;
    this.#updateState();
    this.#storeVisibility(false);
  }
  minimizeToolbar(): void {
    if (this.#toolbar) {
      const isMinimized =
        this.#toolbar.getAttribute('data-minimized') === 'true';
      if (isMinimized) {
        this.#toolbar.removeAttribute('data-minimized');
        this.#storeMinimized(false);
      } else {
        this.#toolbar.setAttribute('data-minimized', 'true');
        this.#storeMinimized(true);
      }
    }
  }

  #showInfo(): void {}

  connectedCallback(): void {
    // Listen to system theme changes and re-apply auto theme
    if (window.matchMedia) {
      this.#_themeMediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)'
      );
      this.#_themeListener = () => this.#applyAutoTheme();
      this.#_themeMediaQuery.addEventListener('change', this.#_themeListener);
    }
    this.#showInfo();
    this.#updateWidgetCount();
    this.setTheme('auto');
    this.appendChild(
      Object.assign(document.createElement('style'), {
        textContent: this.styles,
      })
    );
    this.#loadRouteModuleSourceFromHeaders();
    const storedVisibility = this.#getStoredVisibility();
    this.#isToolbarVisible = storedVisibility;
    if (this.#isToolbarVisible) this.showToolbar();
    document.addEventListener(
      'keydown',
      (e: KeyboardEvent) => this.handleKeyEvent(e, true),
      { capture: true }
    );
    document.addEventListener(
      'keyup',
      (e: KeyboardEvent) => this.handleKeyEvent(e, false),
      { capture: true }
    );
    window.addEventListener('blur', this.clearKeys.bind(this), {
      capture: true,
    });
    document.addEventListener('mousemove', this.handleHoverEvent.bind(this), {
      capture: true,
    });
    document.addEventListener('mouseover', this.handleHoverEvent.bind(this), {
      capture: true,
    });
    document.addEventListener('click', this.handleClickEvent.bind(this), {
      capture: true,
    });
    document.addEventListener('mousedown', this.handleClickEvent.bind(this), {
      capture: true,
    });
    document.addEventListener('contextmenu', this.clearKeys.bind(this), {
      capture: true,
    });
    window.addEventListener('resize', this.#updateState.bind(this));
    document.addEventListener('scroll', this.#updateState.bind(this));
  }

  disconnectedCallback(): void {
    if (this.#_themeMediaQuery && this.#_themeListener) {
      this.#_themeMediaQuery.removeEventListener(
        'change',
        this.#_themeListener
      );
      this.#_themeMediaQuery = undefined;
      this.#_themeListener = undefined;
    }
    if (this.#overlay && this.#overlay.parentNode) {
      this.#overlay.parentNode.removeChild(this.#overlay);
    }
  }

  styles = `
  web-widget-inspector {
    display: contents;
  }

  web-widget-inspector-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 999999;
    background: var(--wwi-bg, rgba(255,255,255,0.92));
    color: var(--wwi-fg, #222);
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--wwi-border, #e5e7eb);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    font-family: inherit;
    font-size: 0.8rem;
    min-width: max-content;
    transition: all 0.2s;
    opacity: 0.98;
    backdrop-filter: blur(2px);
  }

  web-widget-inspector-toolbar[data-minimized="true"] {
    padding: 0;
    gap: 0;
    min-width: 0;
    width: 32px;
    height: 32px;
    background: color-mix(in srgb, var(--wwi-bg, #fff) 60%, transparent 40%);
    border: 1px solid color-mix(in srgb, var(--wwi-border, #e5e7eb) 25%, transparent 75%);
    box-shadow: none;
    border-radius: 50%;
    cursor: pointer;
    justify-content: center;
    align-items: center;
    display: flex;
    transition: background 0.2s, border 0.2s;
  }
  web-widget-inspector-toolbar[data-minimized="true"]:hover {
    background: color-mix(in srgb, var(--wwi-bg, #fff) 85%, transparent 15%);
    border: 1px solid color-mix(in srgb, var(--wwi-border, #e5e7eb) 40%, transparent 60%);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  web-widget-inspector-toolbar[data-minimized="true"] .inspector-header {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    height: 100%;
  }

  web-widget-inspector-toolbar[data-minimized="true"] .inspector-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  web-widget-inspector-toolbar[data-minimized="true"] .inspector-logo svg {
    margin: 0;
    width: 16px;
    height: 16px;
    display: block;
    opacity: 0.45;
    filter: grayscale(0.85) brightness(1.05) saturate(0.7) blur(0.2px);
    transition: opacity 0.2s, filter 0.2s;
  }
  web-widget-inspector-toolbar[data-minimized="true"]:hover .inspector-logo svg {
    opacity: 1;
    filter: none;
  }

  web-widget-inspector-toolbar[data-minimized="true"] .inspector-header .inspector-logo span,
  web-widget-inspector-toolbar[data-minimized="true"] .inspector-info,
  web-widget-inspector-toolbar[data-minimized="true"] .inspector-actions,
  web-widget-inspector-toolbar[data-minimized="true"] .inspector-controls {
    display: none !important;
  }

  .inspector-header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding-right: 0.5rem;
    border: none;
  }

  .inspector-logo {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 600;
    color: var(--wwi-accent, #888);
    font-size: 0.75rem;
    cursor: pointer;
    user-select: none;
  }

  .inspector-logo svg {
    color: var(--wwi-accent, #888);
    width: 16px;
    height: 16px;
    margin-right: 2px;
  }

  .inspector-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--wwi-fg, #222);
    opacity: 0.7;
  }

  .widget-count {
    color: var(--wwi-accent, #888);
    font-weight: 500;
  }

  .inspector-actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .inspector-controls {
    display: flex;
    align-items: center;
    gap: 0.125rem;
  }

  .inspector-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    color: var(--wwi-fg, #222);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background 0.15s;
    font-size: 0.7rem;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0.85;
  }

  /* 圆形按钮样式，仅用于关闭和最小化按钮 */
  .inspector-controls .inspector-btn.hide-btn,
  .inspector-controls .inspector-btn.toggle-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    font-size: 1rem;
    box-sizing: border-box;
    line-height: 1;
    aspect-ratio: 1/1;
    overflow: hidden;
  }
  .inspector-controls .inspector-btn.hide-btn svg,
  .inspector-controls .inspector-btn.toggle-btn svg {
    margin: 0;
    width: 18px;
    height: 18px;
    display: block;
    position: relative;
    left: 0;
    top: 0;
  }
  .inspector-controls .inspector-btn.hide-btn:hover,
  .inspector-controls .inspector-btn.toggle-btn:hover {
    background: rgba(0,0,0,0.06);
  }


  .inspector-btn:hover {
    background: rgba(0,0,0,0.04);
    color: var(--wwi-accent, #555);
    opacity: 1;
  }

  /* 通用选中态按钮样式 */
  .inspector-btn[data-selected="true"] {
    background: color-mix(in srgb, var(--wwi-accent, #444) 18%, transparent 82%);
    color: var(--wwi-accent, #444);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--wwi-accent, #444) 30%, transparent 70%);
    opacity: 1;
    transition: background 0.15s, color 0.15s, box-shadow 0.2s;
  }
  .inspector-btn[data-selected="false"] {
    box-shadow: none !important;
    background: none;
    color: var(--wwi-fg, #222);
    opacity: 0.85;
    transition: background 0.15s, color 0.15s, box-shadow 0.2s;
  }
  .inspector-btn[data-selected="true"] svg {
    color: var(--wwi-accent, #444);
    stroke: var(--wwi-accent, #444);
    opacity: 1;
    transition: color 0.15s, stroke 0.15s, opacity 0.15s;
  }
  .inspector-btn[data-selected="false"] svg {
    color: var(--wwi-fg, #222);
    stroke: var(--wwi-fg, #222);
    opacity: 0.8;
    transition: color 0.15s, stroke 0.15s, opacity 0.15s;
  }

  .inspector-btn svg {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    stroke: var(--wwi-fg, #222);
    opacity: 0.8;
  }

  .inspect-btn,
  .route-btn,
  .toggle-btn,
  .hide-btn {
    background: none;
    border: none;
    color: inherit;
    box-shadow: none;
  }

  .inspect-btn:active,
  .route-btn:active,
  .toggle-btn:active,
  .hide-btn:active {
    background: rgba(0,0,0,0.06);
  }

  @media (max-width: 768px) {
    web-widget-inspector-toolbar {
      bottom: 0.5rem;
      left: 0.5rem;
      flex-wrap: wrap;
      max-width: calc(100vw - 1rem);
    }
    .inspector-header,
    .inspector-info,
    .inspector-actions,
    .inspector-controls {
      border: none;
      padding: 0;
    }
    .inspector-btn span {
      display: none;
    }
    .inspector-logo span {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    web-widget-inspector-toolbar,
    web-widget-inspector-toolbar .inspector-btn {
      transition: none;
    }
  }

  @media (prefers-contrast: high) {
    web-widget-inspector-toolbar {
      border-color: #9ca3af;
      background: #fff;
    }
    web-widget-inspector-toolbar .inspector-btn {
      border-color: #6b7280;
    }
  }

  @media (max-width: 640px) {
    web-widget-inspector-toolbar {
      bottom: 10px;
      left: 10px;
      right: 10px;
      max-width: none;
      justify-content: space-between;
    }
    web-widget-inspector-toolbar .inspector-btn span {
      display: none;
    }
    web-widget-inspector-toolbar .inspector-controls {
      margin-left: auto;
    }
  }
  `;
}

customElements.define('web-widget-inspector', HTMLWebWidgetInspectorElement);

declare global {
  interface Window {
    HTMLWebWidgetInspectorElement: typeof HTMLWebWidgetInspectorElement;
  }
  interface HTMLElementTagNameMap {
    'web-widget-inspector': HTMLWebWidgetInspectorElement;
  }
}
