import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { findWebWidgetContainer } from './utils/widget-finder';
import { getStoredValue, setStoredValue } from './utils/storage';
import { applyThemeMode } from './utils/theme';
import { DESIGN_SYSTEM } from './utils/design-system';
import { DebugDataCollector } from './utils/debug-data';
import type { ElementBounds } from './types';
import { getElementBox } from './utils/box';

export class HTMLWebWidgetInspectorElement extends LitElement {
  @property({ type: String })
  dir = '';

  @property({ type: Array })
  keys: string[] = [];

  @property({ type: String, attribute: 'page-source' })
  pageSource = '';

  private _theme: 'light' | 'dark' | 'auto' = 'auto';

  @property({ type: String })
  get theme(): 'light' | 'dark' | 'auto' {
    return this._theme;
  }

  set theme(value: 'light' | 'dark' | 'auto') {
    const oldValue = this._theme;
    this._theme = value;
    this.setAttribute('theme', value);
    if (oldValue !== value) {
      this.initializeTheme();
    }
  }

  @state()
  private isToolbarVisible = true;

  @state()
  private isInspectorMode = false;

  @state()
  private isMinimized = false;

  @state()
  private hoveredElement: HTMLElement | null = null;

  @state()
  private widgetCount = 0;

  private pressedKeys = new Set<string>();
  private tooltipElement: HTMLElement | null = null;
  private currentElementBounds: ElementBounds = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
  };

  static override styles = css`
    :host {
      display: contents;
    }

    .inspector-toolbar,
    .inspector-toolbar *,
    .inspector-tooltip,
    .inspector-tooltip * {
      font-family: var(
        --wwi-font-sans,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        'Helvetica Neue',
        Arial,
        sans-serif
      );
    }

    .inspector-toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: fixed;
      bottom: 1rem;
      left: 1rem;
      z-index: ${DESIGN_SYSTEM.zIndex.TOOLBAR};
      background: var(--wwi-bg, rgba(255, 255, 255, 0.95));
      color: var(--wwi-fg, #222);
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      border: 1px solid var(--wwi-border, #e5e7eb);
      box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
      font-family: var(
        --wwi-font-sans,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        'Helvetica Neue',
        Arial,
        sans-serif
      );
      font-size: 0.75rem;
      min-width: max-content;
      transition: all 0.2s;
      backdrop-filter: blur(8px);
    }

    .inspector-toolbar[data-minimized='true'] {
      padding: 0;
      gap: 0;
      min-width: 0;
      width: 32px;
      height: 32px;
      background: var(--wwi-bg, rgba(255, 255, 255, 0.95));
      border: 1px solid var(--wwi-border, #e5e7eb);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border-radius: 50%;
      cursor: pointer;
      justify-content: center;
      align-items: center;
      display: flex;
      transition:
        background 0.2s,
        border 0.2s;
    }

    .inspector-toolbar[data-minimized='true']:hover {
      background: var(--wwi-bg, rgba(255, 255, 255, 0.98));
      border: 1px solid var(--wwi-border, #e5e7eb);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .inspector-toolbar[data-minimized='true'] .inspector-header {
      display: flex;
      flex: 1 1 auto;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      height: 100%;
    }

    .inspector-toolbar[data-minimized='true'] .inspector-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }

    .inspector-toolbar[data-minimized='true'] .inspector-logo svg {
      margin: 0;
      width: 16px;
      height: 16px;
      display: block;
      opacity: 0.7;
      filter: none;
      transition: opacity 0.2s;
    }

    .inspector-toolbar[data-minimized='true']:hover .inspector-logo svg {
      opacity: 1;
      filter: none;
    }

    .inspector-toolbar[data-minimized='true']
      .inspector-header
      .inspector-logo
      span,
    .inspector-toolbar[data-minimized='true'] .inspector-logo .logo-text,
    .inspector-toolbar[data-minimized='true'] .inspector-info,
    .inspector-toolbar[data-minimized='true'] .inspector-actions,
    .inspector-toolbar[data-minimized='true'] .inspector-controls {
      display: none;
    }

    .inspector-overlay {
      position: fixed;
      z-index: ${DESIGN_SYSTEM.zIndex.OVERLAY};
      pointer-events: none;
      background: repeating-linear-gradient(
        45deg,
        rgba(102, 126, 234, 0.5),
        rgba(102, 126, 234, 0.5) 5px,
        rgba(255, 255, 255, 0.5) 5px,
        rgba(255, 255, 255, 0.5) 10px
      );
      border: 2px solid rgba(102, 126, 234, 0.9);
      border-radius: 0;
      box-sizing: border-box;
    }

    .inspector-tooltip {
      /* Styles dynamically injected by ensureTooltipStyles */
      visibility: hidden;
    }

    .inspector-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding-right: 0.5rem;
    }

    .inspector-logo {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-weight: 600;
      color: var(--wwi-accent, #888);
      font-size: 0.75rem;
      user-select: none;
    }

    .inspector-logo svg {
      cursor: pointer;
      color: var(--wwi-accent, #888);
      width: 16px;
      height: 16px;
      margin-right: 0.125rem;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1;
      gap: 0.125rem;
      align-items: flex-start;
    }

    .logo-title {
      font-weight: 700;
      font-size: 0.7rem;
      color: var(--wwi-accent, #888);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .logo-subtitle {
      font-weight: 500;
      font-size: 0.5rem;
      color: var(--wwi-accent, #888);
      opacity: 0.75;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .inspector-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
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
      background: transparent;
      border: 1px solid transparent;
      color: var(--wwi-fg, #222);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0.8;
    }

    .inspector-btn:hover {
      background: rgba(0, 0, 0, 0.12);
      border-color: rgba(0, 0, 0, 0.2);
      color: var(--wwi-fg, #111);
      opacity: 1;
      box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }

    .inspector-btn[data-selected='true'] {
      background: rgba(34, 197, 94, 0.15);
      border-color: #22c55e;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
      opacity: 1;
      position: relative;
    }

    .inspector-btn svg {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      stroke: currentColor;
      opacity: 0.9;
    }

    .inspector-controls .inspector-btn {
      padding: 0.25rem;
      border-radius: 50%;
    }

    .inspector-toolbar[data-inspector-active='true'] {
      background: var(--wwi-bg, rgba(255, 255, 255, 0.98));
    }

    @media (max-width: 768px) {
      .inspector-toolbar {
        bottom: 0.75rem;
        left: 0.75rem;
        right: 0.75rem;
        flex-wrap: wrap;
        max-width: calc(100vw - 1.25rem);
      }
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.initializeTheme();
    this.initializeEventListeners();
    this.updateWidgetCount();
    this.loadStoredState();
    this.loadRouteModuleSourceFromHeaders();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanupInspectorElements();
    DebugDataCollector.cleanupAllObservers();
  }

  private initializeTheme(): void {
    applyThemeMode(this.theme);
  }

  private initializeEventListeners(): void {
    document.addEventListener('keydown', (e) => this.handleKeyEvent(e, true), {
      capture: true,
    });
    document.addEventListener('keyup', (e) => this.handleKeyEvent(e, false), {
      capture: true,
    });
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
    document.addEventListener('contextmenu', this.clearKeys.bind(this), {
      capture: true,
    });
    window.addEventListener('resize', this.updateState.bind(this));
    document.addEventListener('scroll', this.updateState.bind(this));
  }

  private loadStoredState(): void {
    this.isToolbarVisible = getStoredValue(
      'web-widget-inspector-visible',
      true
    );

    this.isMinimized = getStoredValue('web-widget-inspector-minimized', false);
  }

  private handleKeyEvent(event: KeyboardEvent, add: boolean): void {
    if (event.code === 'Escape' && this.isInspectorMode) {
      this.isInspectorMode = false;
      this.updateState();
      event.preventDefault();
      return;
    }

    if (add) {
      this.pressedKeys.add(event.code);
    } else {
      this.pressedKeys.delete(event.code);
    }

    this.updateState();
  }

  private clearKeys(): void {
    this.pressedKeys.clear();
  }

  private checkKeysMatch(targetKeys: string[]): boolean {
    if (!targetKeys.length) return false;
    return targetKeys.every((key: string) => {
      const normalizedKey = key === 'Shift' ? 'ShiftLeft' : key;
      return this.pressedKeys.has(key) || this.pressedKeys.has(normalizedKey);
    });
  }

  private handleHoverEvent(event: MouseEvent): void {
    if (!this.isInspectorMode) return;

    const target = findWebWidgetContainer(event.target as HTMLElement);

    if (this.hoveredElement !== target) {
      if (this.hoveredElement) {
        this.hoveredElement.style.removeProperty('cursor');
        DebugDataCollector.stopPerformanceMonitoring(this.hoveredElement);
      }

      this.hoveredElement = target;

      // Start monitoring new element if it's a web widget
      if (target && target.tagName.toLowerCase().includes('web-widget')) {
        DebugDataCollector.startPerformanceMonitoring(target);
      }

      this.updateState();
    }
  }

  private handleClickEvent(event: MouseEvent): void {
    if (this.isInspectorMode) {
      const toolbar = this.renderRoot?.querySelector('.inspector-toolbar');
      const isToolbarClick = toolbar?.contains(event.target as Node);

      if (isToolbarClick) {
        return;
      }

      const widgetTarget = findWebWidgetContainer(event.target as HTMLElement);

      if (widgetTarget) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const inspectUrl = widgetTarget?.getAttribute('import');
        if (inspectUrl) {
          document.body.style.cursor = 'progress';
          this.openInEditor(inspectUrl, this.dir);
          this.updateState();
        }
      }
    }
  }

  private updateState(): void {
    const targetKeys = this.keys;

    if (!this.isToolbarVisible && this.checkKeysMatch(targetKeys)) {
      this.showToolbar();
    }

    // Update inspector overlays based on current state
    if (this.isInspectorMode && this.hoveredElement) {
      this.updateInspectorOverlays(this.hoveredElement);
    } else {
      this.clearInspectorOverlays();
    }

    this.setButtonSelected(this.isInspectorMode);

    if (this.isInspectorMode) {
      if (this.hoveredElement) {
        this.hoveredElement.style.cursor = 'pointer';
      }
    } else {
      document.body.style.removeProperty('cursor');
      const allElements = document.querySelectorAll('*');
      allElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.removeProperty('cursor');
        }
      });
    }

    this.requestUpdate();
  }

  private overlayElement: HTMLElement | null = null;

  private createOverlayElement(): HTMLElement {
    if (this.overlayElement) {
      return this.overlayElement;
    }

    if (!this.isInspectorMode) {
      const dummy = document.createElement('div');
      dummy.style.visibility = 'hidden';
      return dummy;
    }

    this.ensureOverlayStyles();

    const overlay = document.createElement('div');
    overlay.className = 'inspector-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    return overlay;
  }

  private showOverlay(element: HTMLElement): void {
    if (!this.isInspectorMode || !element) return;

    const overlay = this.createOverlayElement();
    const rect = this.currentElementBounds;

    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    overlay.style.visibility = 'visible';
  }

  private cleanupOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  private setButtonSelected(selected: boolean): void {
    const btn = this.renderRoot?.querySelector('.inspect-btn');
    if (btn) {
      btn.setAttribute('data-selected', selected ? 'true' : 'false');
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }
  }

  private updateWidgetCount(): void {
    this.widgetCount = document.querySelectorAll('web-widget[import]').length;
  }

  private createTooltipElement(): HTMLElement {
    if (this.tooltipElement) {
      return this.tooltipElement;
    }

    if (!this.isInspectorMode) {
      const dummy = document.createElement('div');
      dummy.style.visibility = 'hidden';
      return dummy;
    }

    this.ensureTooltipStyles();

    const tooltip = document.createElement('div');
    tooltip.className = 'inspector-tooltip';
    tooltip.setAttribute('aria-hidden', 'true');

    document.body.appendChild(tooltip);
    this.tooltipElement = tooltip;
    return tooltip;
  }

  private ensureOverlayStyles(): void {
    if (!this.isInspectorMode) {
      return;
    }

    if (document.getElementById('inspector-overlay-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'inspector-overlay-styles';

    style.textContent = `
      .inspector-overlay {
        position: fixed;
        z-index: ${DESIGN_SYSTEM.zIndex.OVERLAY};
        pointer-events: none;
        visibility: hidden;
        opacity: 1;
        display: block;
        background: rgba(34, 197, 94, 0.3);
        border: 2px solid var(--wwi-overlay-border, #22c55e);
        border-radius: 0;
        box-sizing: border-box;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    `;

    document.head.appendChild(style);
  }

  private ensureTooltipStyles(): void {
    if (!this.isInspectorMode) {
      return;
    }

    if (document.getElementById('inspector-tooltip-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'inspector-tooltip-styles';

    style.textContent = `
      .inspector-tooltip {
        position: fixed;
        z-index: ${DESIGN_SYSTEM.zIndex.TOOLTIP};
        pointer-events: none;
        background: var(--wwi-bg, rgba(255, 255, 255, 0.95));
        color: var(--wwi-fg, #222);
        border: 1px solid var(--wwi-border, #e5e7eb);
        border-radius: 0.375rem;
        padding: ${DESIGN_SYSTEM.spacing.lg} ${DESIGN_SYSTEM.spacing.xl};
        font-size: ${DESIGN_SYSTEM.typography.fontSize.base};
        font-family: ${DESIGN_SYSTEM.typography.fontFamily.sans};
        line-height: ${DESIGN_SYSTEM.typography.lineHeight.normal};
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.normal};
        letter-spacing: ${DESIGN_SYSTEM.typography.letterSpacing.normal};
        word-wrap: break-word;
        white-space: pre-wrap;
        box-shadow: ${DESIGN_SYSTEM.boxShadow.base};
        backdrop-filter: blur(8px);
        max-width: 640px;
        min-width: 280px;
        visibility: hidden;
        display: block;
      }

      .tooltip-table {
        width: 100%;
        border-collapse: collapse;
        font-size: ${DESIGN_SYSTEM.typography.fontSize.xs};
        line-height: ${DESIGN_SYSTEM.typography.lineHeight.normal};
      }

      .tooltip-table td {
        padding: ${DESIGN_SYSTEM.spacing.xs} 0;
        vertical-align: top;
      }

      .tooltip-table .key {
        color: var(--wwi-accent, #888);
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.medium};
        padding-right: ${DESIGN_SYSTEM.spacing.lg};
        white-space: nowrap;
        text-align: left;
        opacity: 0.8;
      }

      .tooltip-table .value {
        color: var(--wwi-fg, #222);
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.normal};
        word-break: break-all;
        text-align: right;
      }

      .tooltip-table tr.priority-high .key {
        color: var(--wwi-fg, #222);
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.semibold};
        opacity: 1;
      }

      .tooltip-table tr.priority-high .value {
        color: var(--wwi-fg, #222);
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.medium};
      }

      .tooltip-table tr.priority-medium .key {
        color: var(--wwi-accent, #666);
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.medium};
        opacity: 0.9;
      }

      .tooltip-table tr.priority-medium .value {
        color: var(--wwi-fg, #444);
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.normal};
      }

      .tooltip-table tr.priority-low .key {
        color: var(--wwi-accent, #888);
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.normal};
        opacity: 0.7;
      }

      .tooltip-table tr.priority-low .value {
        color: var(--wwi-fg, #666);
        font-weight: ${DESIGN_SYSTEM.typography.fontWeight.normal};
        opacity: 0.8;
      }

      .tooltip-help {
        margin-top: ${DESIGN_SYSTEM.spacing.md};
        padding-top: ${DESIGN_SYSTEM.spacing.md};
        border-top: 1px solid var(--wwi-border, #e5e7eb);
        font-size: ${DESIGN_SYSTEM.typography.fontSize.xs};
        color: var(--wwi-accent, #888);
        text-align: center;
        opacity: 0.8;
      }

      @media (max-width: 768px) {
        .inspector-toolbar {
          bottom: ${DESIGN_SYSTEM.spacing.md};
          left: ${DESIGN_SYSTEM.spacing.md};
          right: ${DESIGN_SYSTEM.spacing.md};
          flex-wrap: wrap;
          max-width: calc(100vw - ${DESIGN_SYSTEM.spacing.xl});
          padding: ${DESIGN_SYSTEM.spacing.md} ${DESIGN_SYSTEM.spacing.lg};
          gap: ${DESIGN_SYSTEM.spacing.md};
        }
      }
    `;

    document.head.appendChild(style);
  }

  private calculateSimplePosition(
    elementRect: ElementBounds,
    tooltipRect: DOMRect
  ): { x: number; y: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;
    const minMargin = 8;

    let x = elementRect.left;
    let y = elementRect.top - tooltipRect.height - padding;

    if (y < minMargin) {
      y = elementRect.top + elementRect.height + padding;
    }

    x = Math.max(
      minMargin,
      Math.min(viewportWidth - tooltipRect.width - minMargin, x)
    );
    y = Math.max(
      minMargin,
      Math.min(viewportHeight - tooltipRect.height - minMargin, y)
    );

    return { x, y };
  }

  private generateTooltipContent(element: HTMLElement): string {
    return DebugDataCollector.generateTooltipContent(element);
  }

  private showTooltip(element: HTMLElement): void {
    if (!this.isInspectorMode || !element) return;

    const tooltip = this.createTooltipElement();
    const content = this.generateTooltipContent(element);

    tooltip.innerHTML = content;
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';

    // Force reflow to get accurate dimensions
    tooltip.offsetHeight;

    const elementRect = this.currentElementBounds;
    const tooltipRect = tooltip.getBoundingClientRect();
    const position = this.calculateSimplePosition(elementRect, tooltipRect);

    tooltip.style.left = `${position.x}px`;
    tooltip.style.top = `${position.y}px`;
    tooltip.style.visibility = 'visible';
  }

  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.visibility = 'hidden';
    }
  }

  private cleanupTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }

  private updateTooltipContent(): void {
    if (this.hoveredElement && this.tooltipElement) {
      const content = this.generateTooltipContent(this.hoveredElement);
      this.tooltipElement.innerHTML = content;
    }
  }

  private cleanupInspectorElements(): void {
    // Cleanup overlay
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }

    // Cleanup overlay styles
    const overlayStyles = document.getElementById('inspector-overlay-styles');
    if (overlayStyles) {
      overlayStyles.remove();
    }

    // Cleanup tooltip styles
    const tooltipStyles = document.getElementById('inspector-tooltip-styles');
    if (tooltipStyles) {
      tooltipStyles.remove();
    }

    // Cleanup tooltip
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }

    // Stop performance monitoring for current element
    if (this.hoveredElement) {
      DebugDataCollector.stopPerformanceMonitoring(this.hoveredElement);
    }

    document.body.style.removeProperty('cursor');
  }

  private toggleInspector(): void {
    this.isInspectorMode = !this.isInspectorMode;

    if (!this.isInspectorMode) {
      this.cleanupInspectorElements();
    }

    this.updateState();
  }

  private showToolbar(): void {
    this.isToolbarVisible = true;
    this.updateState();
    setStoredValue('web-widget-inspector-visible', true);
  }

  private hideToolbar(): void {
    this.isToolbarVisible = false;
    this.updateState();
    setStoredValue('web-widget-inspector-visible', false);
  }

  private minimizeToolbar(): void {
    this.isMinimized = !this.isMinimized;
    this.updateState();
    setStoredValue('web-widget-inspector-minimized', this.isMinimized);
  }

  private openInEditor(path: string, srcDir?: string): void {
    if (srcDir) {
      const resolvedURL = new URL(path, document.baseURI);
      if (resolvedURL.origin === location.origin) {
        const filePath = srcDir + resolvedURL.pathname;
        this.openFileInEditor(filePath);
      } else {
        location.href = resolvedURL.href;
      }
    } else {
      this.openFileInEditor(path);
    }
  }

  private openFileInEditor(filePath: string): void {
    document.body.style.cursor = 'progress';
    fetch(`/__open-in-editor?file=${encodeURIComponent(filePath)}`).finally(
      () => {
        document.body.style.removeProperty('cursor');
      }
    );
  }

  private getCurrentFilePath(): string {
    if (!this.pageSource) return '';

    try {
      if (this.pageSource.startsWith('source://')) {
        return this.pageSource.replace('source://', '');
      }
      const url = new URL(this.pageSource);
      return url.pathname;
    } catch {
      return this.pageSource;
    }
  }

  private loadRouteModuleSourceFromHeaders(): void {
    if (!this.pageSource) {
      fetch(window.location.href, { method: 'HEAD' })
        .then((response: Response) => {
          const moduleSource = response.headers.get('x-module-source');
          if (moduleSource) {
            this.pageSource = moduleSource;
          }
        })
        .catch((error) => {
          console.error(
            'Error loading route module source from headers:',
            error
          );
        });
    }
  }

  /**
   * Batch update all inspector overlays for the current hovered element
   * This avoids multiple expensive getElementBox calls
   */
  private updateInspectorOverlays(element: HTMLElement): void {
    // Get bounds once and reuse for all overlays
    const bounds = getElementBox(element);
    this.currentElementBounds = bounds ?? {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    };

    // Batch update all overlays
    this.showOverlay(element);
    this.showTooltip(element);
  }

  private clearInspectorOverlays(): void {
    // Clear current bounds
    this.currentElementBounds = {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    };

    // Remove all overlays
    this.cleanupOverlay();
    this.cleanupTooltip();
  }

  override render() {
    if (!this.isToolbarVisible) {
      return html``;
    }

    return html`
      <div
        class="inspector-toolbar"
        data-minimized=${this.isMinimized ? 'true' : 'false'}
        data-inspector-active=${this.isInspectorMode ? 'true' : 'false'}>
        <div class="inspector-header">
          <div
            class="inspector-logo"
            tabindex="0"
            title="Web Widget Inspector"
            @click=${this.minimizeToolbar}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true">
              <path
                d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2Z" />
            </svg>
            <div class="logo-text">
              <span class="logo-title">WEB WIDGET</span>
              <span class="logo-subtitle">DEV INSPECTOR</span>
            </div>
          </div>
        </div>

        <div class="inspector-info">
          <span class="widget-count">${this.widgetCount} widgets</span>
        </div>

        <div class="inspector-actions">
          <button
            class="inspector-btn inspect-btn"
            @click=${this.toggleInspector}
            title="Click to activate widget inspector (ESC to exit)"
            aria-label="Activate widget inspector mode">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Inspect</span>
          </button>

          <button
            class="inspector-btn page-btn"
            @click=${() => {
              const currentFilePath = this.getCurrentFilePath();
              if (currentFilePath) {
                this.openInEditor(currentFilePath);
              }
            }}
            title="Open current page source code"
            aria-label="Open current page source code">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
            <span>Open Source</span>
          </button>
        </div>

        <div class="inspector-controls">
          <button
            class="inspector-btn hide-btn"
            @click=${this.hideToolbar}
            title="Hide Web Widget Inspector"
            aria-label="Hide inspector toolbar">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <button
            class="inspector-btn toggle-btn"
            @click=${this.minimizeToolbar}
            title="Minimize Web Widget Inspector"
            aria-label="Minimize inspector toolbar">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}
