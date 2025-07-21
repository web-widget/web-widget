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

/**
 * Collect debug data for an element
 */
export function collectElementData(element: HTMLElement): ElementDebugData {
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
    data.webWidgetData = collectWebWidgetData(element);
  }

  return data;
}

/**
 * Collect debug data for Web Widget
 */
export function collectWebWidgetData(element: HTMLElement): WebWidgetDebugData {
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
  const performanceData = collectPerformanceData(element);
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
export function collectPerformanceData(element: HTMLElement): {
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
 * Convert debug data to display format with priority-based sorting
 */
export function formatDebugData(
  data: ElementDebugData,
  element: HTMLElement
): DebugDataItem[] {
  const items: DebugDataItem[] = [];

  if (data.isWebWidget && data.webWidgetData) {
    // Web Widget specific information - ordered by importance
    const widgetData = data.webWidgetData;

    const componentName = element.getAttribute('name');
    if (componentName) {
      items.push({ key: 'Name', value: componentName, priority: 1 });
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
 * Get CSS class based on priority level
 */
export function getPriorityClass(priority: number): string {
  if (priority <= 3) return 'priority-high';
  if (priority <= 6) return 'priority-medium';
  return 'priority-low';
}
