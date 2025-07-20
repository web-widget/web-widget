import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { findWebWidgetContainer } from './utils/widget-finder';
import { getStoredValue, setStoredValue } from './utils/storage';
import { applyThemeMode } from './utils/theme';
import { designSystem, DESIGN_SYSTEM } from './utils/design-system';
import { DebugDataCollector } from './utils/debug-data';
import type { ElementBounds } from './types';
import { getElementBox } from './utils/box';
import { Z_INDEX } from './constants';

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
  private tooltipTimeout: number | null = null;

  static override styles = css`
    :host {
      display: contents;
    }

    .inspector-toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      position: fixed;
      bottom: 1rem;
      left: 1rem;
      z-index: ${Z_INDEX.TOOLBAR};
      background: var(--wwi-bg, rgba(255, 255, 255, 0.95));
      color: var(--wwi-fg, #222);
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid var(--wwi-border, #e5e7eb);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      font-family: inherit;
      font-size: 0.8rem;
      min-width: max-content;
      transition: all 0.2s;
      backdrop-filter: blur(8px);
    }

    .inspector-toolbar[data-minimized='true'] {
      padding: 0 !important;
      gap: 0 !important;
      min-width: 0 !important;
      width: 32px !important;
      height: 32px !important;
      background: var(--wwi-bg, rgba(255, 255, 255, 0.95)) !important;
      border: 1px solid var(--wwi-border, #e5e7eb) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      justify-content: center !important;
      align-items: center !important;
      display: flex !important;
      transition:
        background 0.2s,
        border 0.2s !important;
    }

    .inspector-toolbar[data-minimized='true']:hover {
      background: var(--wwi-bg, rgba(255, 255, 255, 0.98)) !important;
      border: 1px solid var(--wwi-border, #e5e7eb) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
    }

    .inspector-toolbar[data-minimized='true'] .inspector-header {
      display: flex !important;
      flex: 1 1 auto !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      margin: 0 !important;
      height: 100% !important;
    }

    .inspector-toolbar[data-minimized='true'] .inspector-logo {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .inspector-toolbar[data-minimized='true'] .inspector-logo svg {
      margin: 0 !important;
      width: 16px !important;
      height: 16px !important;
      display: block !important;
      opacity: 0.7 !important;
      filter: none !important;
      transition: opacity 0.2s !important;
    }

    .inspector-toolbar[data-minimized='true']:hover .inspector-logo svg {
      opacity: 1 !important;
      filter: none !important;
    }

    .inspector-toolbar[data-minimized='true']
      .inspector-header
      .inspector-logo
      span,
    .inspector-toolbar[data-minimized='true'] .inspector-logo .logo-text,
    .inspector-toolbar[data-minimized='true'] .inspector-info,
    .inspector-toolbar[data-minimized='true'] .inspector-actions,
    .inspector-toolbar[data-minimized='true'] .inspector-controls {
      display: none !important;
    }

    .inspector-overlay {
      position: fixed;
      z-index: ${Z_INDEX.OVERLAY};
      pointer-events: none;
      background: repeating-linear-gradient(
        45deg,
        rgba(102, 126, 234, 0.5),
        rgba(102, 126, 234, 0.5) 5px,
        rgba(255, 255, 255, 0.5) 5px,
        rgba(255, 255, 255, 0.5) 10px
      );
      border: 2px solid rgba(102, 126, 234, 0.9);
      border-radius: 4px;
      box-sizing: border-box;
    }

    .inspector-tooltip {
      /* Styles dynamically injected by ensureTooltipStyles */
      display: none;
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
      margin-right: 2px;
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
      background: transparent;
      border: 1px solid transparent;
      color: var(--wwi-fg, #222);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 0.7rem;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0.8;
    }

    .inspector-btn:hover {
      background: rgba(0, 0, 0, 0.12);
      border-color: rgba(0, 0, 0, 0.2);
      color: var(--wwi-fg, #111);
      opacity: 1;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .inspector-btn[data-selected='true'] {
      background: rgba(102, 126, 234, 0.15);
      border-color: rgba(102, 126, 234, 0.4);
      color: rgba(102, 126, 234, 1);
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
      opacity: 1;
      position: relative;
    }

    .inspector-btn[data-selected='true']::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(
        45deg,
        rgba(102, 126, 234, 0.3),
        rgba(102, 126, 234, 0.1)
      );
      border-radius: 0.375rem;
      z-index: -1;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 0.6;
      }
      50% {
        opacity: 1;
      }
    }

    .inspector-btn[data-selected='true'] svg {
      stroke: rgba(102, 126, 234, 1);
      filter: drop-shadow(0 0 2px rgba(102, 126, 234, 0.3));
    }

    .inspector-btn svg {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      stroke: currentColor;
      opacity: 0.9;
    }

    .inspector-toolbar[data-inspector-active='true'] {
      border-color: rgba(102, 126, 234, 0.4);
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.06),
        0 0 0 1px rgba(102, 126, 234, 0.2);
      background: var(--wwi-bg, rgba(255, 255, 255, 0.98));
    }

    .inspector-toolbar[data-inspector-active='true']::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      right: -1px;
      bottom: -1px;
      background: linear-gradient(
        45deg,
        rgba(102, 126, 234, 0.1),
        rgba(102, 126, 234, 0.05)
      );
      border-radius: 0.5rem;
      z-index: -1;
      animation: toolbar-pulse 3s infinite;
    }

    @keyframes toolbar-pulse {
      0%,
      100% {
        opacity: 0.3;
      }
      50% {
        opacity: 0.6;
      }
    }

    @media (max-width: 768px) {
      .inspector-toolbar {
        bottom: 0.5rem;
        left: 0.5rem;
        right: 0.5rem;
        flex-wrap: wrap;
        max-width: calc(100vw - 1rem);
        padding: 0.5rem 0.75rem;
        gap: 0.375rem;
      }

      .inspector-btn {
        padding: 0.375rem 0.5rem;
        font-size: 0.75rem;
      }

      .inspector-info {
        font-size: 0.7rem;
      }

      .logo-text {
        gap: 0.1rem;
      }

      .logo-title {
        font-size: 0.6rem;
        letter-spacing: 0.04em;
      }

      .logo-subtitle {
        font-size: 0.45rem;
        letter-spacing: 0.12em;
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
    this.cleanupTooltip();

    this.cleanupInspectorElements();
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
      this.hoveredElement = target;
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

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const widgetTarget = findWebWidgetContainer(event.target as HTMLElement);
      const inspectUrl = widgetTarget?.getAttribute('import');
      if (inspectUrl) {
        document.body.style.cursor = 'progress';

        this.openInEditor(inspectUrl, this.dir);
        this.updateState();
      }
    }
  }

  private updateState(): void {
    const shouldShowInspector = !!(this.hoveredElement && this.isInspectorMode);
    const targetKeys = this.keys;
    const shouldShowToolbar =
      this.isToolbarVisible || this.checkKeysMatch(targetKeys);

    if (!this.isToolbarVisible && this.checkKeysMatch(targetKeys)) {
      this.showToolbar();
    }

    this.updateOverlay(shouldShowInspector);
    this.setButtonSelected(this.isInspectorMode);

    if (this.isInspectorMode) {
      const shouldShowPointer = !!this.hoveredElement;
      if (shouldShowPointer) {
        document.body.style.setProperty('cursor', 'pointer', 'important');
      } else {
        document.body.style.removeProperty('cursor');
      }
    } else {
      document.body.style.removeProperty('cursor');
    }

    this.requestUpdate();
  }

  private updateOverlay(show: boolean): void {
    let highlightOverlay = document.querySelector(
      '.web-widget-inspector-highlight-overlay'
    ) as HTMLElement;

    if (this.isInspectorMode) {
      if (show && this.hoveredElement) {
        if (!highlightOverlay) {
          highlightOverlay = document.createElement('div');
          highlightOverlay.className = 'web-widget-inspector-highlight-overlay';
          highlightOverlay.setAttribute('aria-hidden', 'true');
          document.body.appendChild(highlightOverlay);
        }

        const rect = getElementBox(this.hoveredElement) ?? {
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        };

        highlightOverlay.style.cssText = `
          position: fixed !important;
          top: ${rect.top}px !important;
          left: ${rect.left}px !important;
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

        this.showTooltip(this.hoveredElement);
      } else {
        if (highlightOverlay) {
          highlightOverlay.remove();
        }
        this.hideTooltip();
      }
    } else {
      if (highlightOverlay) {
        highlightOverlay.remove();
      }
      this.hideTooltip();
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
      dummy.style.display = 'none';
      return dummy;
    }

    this.ensureTooltipStyles();

    const tooltip = document.createElement('div');
    tooltip.className = 'inspector-tooltip';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.setAttribute('data-visible', 'false');

    document.body.appendChild(tooltip);
    this.tooltipElement = tooltip;
    return tooltip;
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
        z-index: ${Z_INDEX.TOOLTIP};
        pointer-events: none;
        background: var(--wwi-bg, rgba(255, 255, 255, 0.95));
        color: var(--wwi-fg, #222);
        border: 1px solid var(--wwi-border, #e5e7eb);
        border-radius: ${DESIGN_SYSTEM.borderRadius.md};
        padding: ${DESIGN_SYSTEM.spacing.lg} ${DESIGN_SYSTEM.spacing.xl};
        font-size: ${DESIGN_SYSTEM.typography.fontSize.base};
        font-family: ${DESIGN_SYSTEM.typography.fontFamily};
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

      /* Priority-based styling */
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

        .inspector-btn {
          padding: ${DESIGN_SYSTEM.spacing.md} ${DESIGN_SYSTEM.spacing.md};
          font-size: ${DESIGN_SYSTEM.typography.fontSize.sm};
        }

        .inspector-info {
          font-size: ${DESIGN_SYSTEM.typography.fontSize.sm};
        }

        .inspector-tooltip {
          font-size: ${DESIGN_SYSTEM.typography.fontSize.sm};
          padding: ${DESIGN_SYSTEM.spacing.md} ${DESIGN_SYSTEM.spacing.lg};
          max-width: calc(100vw - ${DESIGN_SYSTEM.spacing.xl});
        }
        
        .tooltip-table {
          font-size: ${DESIGN_SYSTEM.typography.fontSize.sm};
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

    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }

    const tooltip = this.createTooltipElement();
    const content = this.generateTooltipContent(element);

    tooltip.innerHTML = content;
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';

    tooltip.offsetHeight;

    const elementRect = getElementBox(element);
    const tooltipRect = tooltip.getBoundingClientRect();
    const position = this.calculateSimplePosition(
      elementRect ?? {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      },
      tooltipRect
    );

    tooltip.style.left = `${position.x}px`;
    tooltip.style.top = `${position.y}px`;
    tooltip.setAttribute('data-visible', 'true');
    tooltip.style.visibility = 'visible';
  }

  private hideTooltip(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }

    if (this.tooltipElement) {
      this.tooltipElement.setAttribute('data-visible', 'false');
      this.tooltipElement.style.visibility = 'hidden';
    }
  }

  private cleanupTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  private cleanupInspectorElements(): void {
    const highlightOverlay = document.querySelector(
      '.web-widget-inspector-highlight-overlay'
    );
    if (highlightOverlay) {
      highlightOverlay.remove();
    }

    const tooltipStyles = document.getElementById('inspector-tooltip-styles');
    if (tooltipStyles) {
      tooltipStyles.remove();
    }

    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
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
