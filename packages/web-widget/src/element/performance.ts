import type { Status } from '../lifecycle/runtime';
import { status } from '../lifecycle/runtime';

export interface PerformanceMarkDetail {
  name: string;
  import: string;
  source: string;
  timestamp: number;
}

export interface WidgetPerformance {
  loadTime?: string;
  mountTime?: string;
}

interface PerformanceHost {
  import: string;
  localName: string;
  performance?: WidgetPerformance;
}

export function markWidgetPerformance(
  host: PerformanceHost,
  value: Status,
  componentName: string
) {
  try {
    const markNamespace = `${componentName}:statusChange`;
    const detail: PerformanceMarkDetail = {
      name: componentName,
      import: host.import,
      source: host.localName,
      timestamp: Date.now(),
    };

    performance.mark(`${markNamespace}:${value}`, { detail });

    if (value === status.LOADED) {
      const measure = performance.measure(`${componentName}:load`, {
        start: `${markNamespace}:${status.LOADING}`,
        end: `${markNamespace}:${status.LOADED}`,
        detail,
      });
      host.performance ??= {};
      host.performance.loadTime = `${Math.round(measure.duration)}ms`;
    } else if (value === status.MOUNTED) {
      const measure = performance.measure(`${componentName}:mount`, {
        start: `${markNamespace}:${status.MOUNTING}`,
        end: `${markNamespace}:${status.MOUNTED}`,
        detail,
      });
      host.performance ??= {};
      host.performance.mountTime = `${Math.round(measure.duration)}ms`;
    }
  } catch {
    // Performance instrumentation must never affect widget lifecycle state.
  }
}
