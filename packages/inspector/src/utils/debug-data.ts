import { getElementBox } from './box';
import type { ElementBounds } from '../types';
import type { HTMLWebWidgetElement } from '@web-widget/web-widget/element';

export interface DebugDataItem {
  key: string;
  value: string;
  priority: number;
}

export interface WebWidgetDebugData {
  name?: string;
  module?: string;
  loading?: string;
  renderTarget?: string;
  status?: string;
  inactive?: boolean;
  contextData?: Record<string, any>;
  loadTime?: number;
  mountTime?: number;
}

export interface ElementDebugData {
  tag: string;
  id?: string;
  bounds: ElementBounds;
  isWebWidget: boolean;
  webWidgetData?: WebWidgetDebugData;
}

export class DebugDataCollector {
  /**
   * Collect debug data for an element
   */
  static collectElementData(element: HTMLElement): ElementDebugData {
    const bounds = getElementBox(element) ?? {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    };
    const isWebWidget = element.tagName === 'WEB-WIDGET';

    const data: ElementDebugData = {
      tag: element.tagName.toLowerCase(),
      bounds,
      isWebWidget,
    };

    // Basic element information
    if (element.id) {
      data.id = element.id;
    }

    // Web Widget specific data
    if (isWebWidget) {
      data.webWidgetData = this.collectWebWidgetData(element);
    }

    return data;
  }

  /**
   * Collect debug data for Web Widget
   */
  static collectWebWidgetData(element: HTMLElement): WebWidgetDebugData {
    const data: WebWidgetDebugData = {};
    const webWidgetElement = element as HTMLWebWidgetElement;

    // Component name
    const name = element.getAttribute('name');
    if (name) {
      data.name = name;
    }

    // Module path
    const importUrl = element.getAttribute('import');
    if (importUrl) {
      data.module = importUrl;
    }

    // Loading strategy
    const loading = webWidgetElement.loading;
    if (loading && loading !== 'eager') {
      data.loading = loading;
    }

    // Render target
    const renderTarget = webWidgetElement.renderTarget;
    if (renderTarget && renderTarget !== 'light') {
      data.renderTarget = renderTarget;
    }

    // Status information
    const status = webWidgetElement.status;
    if (status) {
      data.status = status;
    }

    // Inactive state
    if (webWidgetElement.inactive) {
      data.inactive = true;
    }

    // Context data
    const contextData = webWidgetElement.contextData;
    if (contextData && typeof contextData === 'object') {
      data.contextData = contextData;
    }

    // Performance data
    const performanceData = this.collectPerformanceData(element);
    if (performanceData.loadTime !== undefined) {
      data.loadTime = performanceData.loadTime;
    }
    if (performanceData.mountTime !== undefined) {
      data.mountTime = performanceData.mountTime;
    }

    return data;
  }

  /**
   * Collect performance data for a specific element
   */
  static collectPerformanceData(element: HTMLElement): {
    loadTime?: number;
    mountTime?: number;
  } {
    const data: { loadTime?: number; mountTime?: number } = {};

    // Get performance data from element's performance property (set by web-widget)
    const webWidgetElement = element as HTMLWebWidgetElement;
    const performanceData = webWidgetElement.performance;

    if (performanceData && typeof performanceData === 'object') {
      if (performanceData.loadTime) {
        const loadTimeStr = performanceData.loadTime;
        if (typeof loadTimeStr === 'string' && loadTimeStr.endsWith('ms')) {
          data.loadTime = parseInt(loadTimeStr, 10);
        }
      }
      if (performanceData.mountTime) {
        const mountTimeStr = performanceData.mountTime;
        if (typeof mountTimeStr === 'string' && mountTimeStr.endsWith('ms')) {
          data.mountTime = parseInt(mountTimeStr, 10);
        }
      }
    }

    return data;
  }

  /**
   * Performance monitoring system for real-time data collection
   */
  private static performanceObservers = new Map<
    HTMLElement,
    {
      observer: null; // No longer using PerformanceObserver
      timeout: number;
      lastData: { loadTime?: number; mountTime?: number };
    }
  >();

  /**
   * Start monitoring performance data for an element
   */
  static startPerformanceMonitoring(element: HTMLElement): void {
    // Clean up existing observer for this element
    this.stopPerformanceMonitoring(element);

    // Set up periodic check for performance data
    const timeout = window.setInterval(() => {
      const data = this.collectPerformanceData(element);
      const observerData = this.performanceObservers.get(element);

      if (
        observerData &&
        (data.loadTime !== observerData.lastData.loadTime ||
          data.mountTime !== observerData.lastData.mountTime)
      ) {
        observerData.lastData = { ...data };
      }
    }, 100);

    // Store observer and timeout
    this.performanceObservers.set(element, {
      observer: null as any, // No need for PerformanceObserver since data is on element
      timeout,
      lastData: {},
    });

    // Initial data collection
    const initialData = this.collectPerformanceData(element);
    this.performanceObservers.get(element)!.lastData = initialData;
  }

  /**
   * Stop monitoring performance data for an element
   */
  static stopPerformanceMonitoring(element: HTMLElement): void {
    const observerData = this.performanceObservers.get(element);
    if (observerData) {
      clearInterval(observerData.timeout);
      this.performanceObservers.delete(element);
    }
  }

  /**
   * Clean up all performance observers
   */
  static cleanupAllObservers(): void {
    for (const [element, observerData] of this.performanceObservers) {
      clearInterval(observerData.timeout);
    }
    this.performanceObservers.clear();
  }

  /**
   * Generate component identifier in the same format as Web Widget
   */

  /**
   * Convert debug data to display format with priority-based sorting
   */
  static formatDebugData(
    data: ElementDebugData,
    element: HTMLElement
  ): DebugDataItem[] {
    const items: DebugDataItem[] = [];

    if (data.isWebWidget && data.webWidgetData) {
      // Web Widget specific information - ordered by importance
      const widgetData = data.webWidgetData;

      const componentName = element.getAttribute('name');
      if (componentName) {
        items.push({ key: 'Component', value: componentName, priority: 1 });
      }

      if (widgetData.module) {
        items.push({ key: 'Module', value: widgetData.module, priority: 2 });
      }

      if (widgetData.loadTime !== undefined) {
        items.push({
          key: 'Load Time',
          value: `${widgetData.loadTime}ms`,
          priority: 3,
        });
      }

      if (widgetData.mountTime !== undefined) {
        items.push({
          key: 'Mount Time',
          value: `${widgetData.mountTime}ms`,
          priority: 3,
        });
      }

      if (widgetData.status) {
        items.push({ key: 'Status', value: widgetData.status, priority: 4 });
      }

      if (widgetData.loading) {
        items.push({ key: 'Loading', value: widgetData.loading, priority: 4 });
      }

      if (widgetData.renderTarget) {
        items.push({
          key: 'Render',
          value: widgetData.renderTarget,
          priority: 4,
        });
      }

      if (widgetData.contextData) {
        const dataKeys = Object.keys(widgetData.contextData);
        if (dataKeys.length > 0) {
          items.push({
            key: 'Parameters',
            value: `${dataKeys.length} keys`,
            priority: 5,
          });
        }
      }
    } else {
      // Basic information for non-Web Widget elements
      items.push({ key: 'Tag', value: data.tag, priority: 1 });

      if (data.id) {
        items.push({ key: 'ID', value: data.id, priority: 2 });
      }
    }

    items.push({
      key: 'Size',
      value: `${Math.round(data.bounds.width)}×${Math.round(data.bounds.height)}px`,
      priority: 10,
    });

    // Sort by priority (ascending)
    return items.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate tooltip content with priority-based styling
   */
  static generateTooltipContent(element: HTMLElement): string {
    const debugData = this.collectElementData(element);
    const formattedData = this.formatDebugData(debugData, element);

    // Generate table HTML with priority-based styling
    const tableRows = formattedData
      .map((item) => {
        const priorityClass = this.getPriorityClass(item.priority);
        return `<tr class="${priorityClass}"><td class="key">${item.key}</td><td class="value">${item.value}</td></tr>`;
      })
      .join('');

    // Add help text
    const helpText = debugData.isWebWidget
      ? '<div class="tooltip-help">💡 Click to open source code</div>'
      : '';

    return `<table class="tooltip-table">${tableRows}</table>${helpText}`;
  }

  /**
   * Get CSS class based on priority level
   */
  private static getPriorityClass(priority: number): string {
    if (priority <= 3) return 'priority-high';
    if (priority <= 6) return 'priority-medium';
    return 'priority-low';
  }
}
