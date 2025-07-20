import { getElementBox } from './box';
import type { ElementBounds } from '../types';

export interface DebugDataItem {
  key: string;
  value: string;
  priority: number; // 1 = highest priority, 10 = lowest priority
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
    const loading = (element as any).loading;
    if (loading && loading !== 'eager') {
      data.loading = loading;
    }

    // Render target
    const renderTarget = (element as any).renderTarget;
    if (renderTarget && renderTarget !== 'light') {
      data.renderTarget = renderTarget;
    }

    // Status information
    const status = (element as any).status;
    if (status) {
      data.status = status;
    }

    // Inactive status
    if ((element as any).inactive) {
      data.inactive = true;
    }

    // Parameter data
    const contextData = element.getAttribute('contextdata');
    if (contextData) {
      try {
        data.contextData = JSON.parse(contextData);
      } catch {
        // Ignore when parsing fails
      }
    }

    // Performance data
    const performanceData = this.collectPerformanceData();
    if (performanceData.loadTime) {
      data.loadTime = performanceData.loadTime;
    }
    if (performanceData.mountTime) {
      data.mountTime = performanceData.mountTime;
    }

    return data;
  }

  /**
   * Collect performance data
   */
  static collectPerformanceData(): { loadTime?: number; mountTime?: number } {
    const data: { loadTime?: number; mountTime?: number } = {};

    // Web Widget uses fixed measurement names: web-widget:load and web-widget:mount
    const loadMeasure = performance.getEntriesByName('web-widget:load')[0];
    const mountMeasure = performance.getEntriesByName('web-widget:mount')[0];

    if (loadMeasure) {
      data.loadTime = Math.round(loadMeasure.duration);
    }
    if (mountMeasure) {
      data.mountTime = Math.round(mountMeasure.duration);
    }

    return data;
  }

  /**
   * Convert debug data to display format with priority-based sorting
   */
  static formatDebugData(data: ElementDebugData): DebugDataItem[] {
    const items: DebugDataItem[] = [];

    if (data.isWebWidget && data.webWidgetData) {
      // Web Widget specific information - ordered by importance
      const widgetData = data.webWidgetData;

      // Priority 1: Component Name (most important for identification)
      if (widgetData.name) {
        items.push({ key: 'Component', value: widgetData.name, priority: 1 });
      }

      // Priority 2: Module Path (essential for development)
      if (widgetData.module) {
        items.push({ key: 'Module', value: widgetData.module, priority: 2 });
      }

      // Priority 3: Status (critical for debugging)
      if (widgetData.status) {
        items.push({ key: 'Status', value: widgetData.status, priority: 3 });
      }

      // Priority 4: Inactive status (important state)
      if (widgetData.inactive) {
        items.push({ key: 'State', value: 'inactive', priority: 4 });
      }

      // Priority 5: Loading strategy (performance related)
      if (widgetData.loading) {
        items.push({ key: 'Loading', value: widgetData.loading, priority: 5 });
      }

      // Priority 6: Render target (technical detail)
      if (widgetData.renderTarget) {
        items.push({
          key: 'Render',
          value: widgetData.renderTarget,
          priority: 6,
        });
      }

      // Priority 7: Performance metrics (useful for optimization)
      if (widgetData.loadTime) {
        items.push({
          key: 'Load Time',
          value: `${widgetData.loadTime}ms`,
          priority: 7,
        });
      }

      if (widgetData.mountTime) {
        items.push({
          key: 'Mount Time',
          value: `${widgetData.mountTime}ms`,
          priority: 8,
        });
      }

      // Priority 9: Parameters (context data)
      if (widgetData.contextData) {
        const dataKeys = Object.keys(widgetData.contextData);
        if (dataKeys.length > 0) {
          items.push({
            key: 'Parameters',
            value: `${dataKeys.length} keys`,
            priority: 9,
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

    // Priority 10: Size information (always last, least important)
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
    const formattedData = this.formatDebugData(debugData);

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
