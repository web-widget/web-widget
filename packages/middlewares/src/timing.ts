/**
 * Server-Timing Middleware
 * https://github.com/honojs/hono/blob/main/src/middleware/timing/timing.ts
 * Copyright (c) 2021 - present, Yusuke Wada and Hono contributors
 * MIT Licensed
 */
import type { MiddlewareContext } from '@web-widget/schema';
import { defineMiddlewareHandler } from '@web-widget/helpers';

const METRIC = Symbol.for('metric');

declare module '@web-widget/schema' {
  interface State {
    [METRIC]?: {
      headers: string[];
      timers: Map<string, Timer>;
    };
  }
}

interface Timer {
  description?: string;
  start: number;
}

interface TimingOptions {
  total?: boolean;
  enabled?: boolean | ((context: MiddlewareContext) => boolean);
  totalDescription?: string;
  autoEnd?: boolean;
  crossOrigin?:
    | boolean
    | string
    | ((context: MiddlewareContext) => boolean | string);
}

function getTime(): number {
  try {
    return performance.now();
  } catch {}
  return Date.now();
}

function validName(name: string) {
  const tokenRegex = /^[!#$%&'*+\-.^_`|~0-9a-zA-Z]+$/;
  if (!tokenRegex.test(name)) {
    throw new Error(`Invalid Server-Timing name: ${name}`);
  }
}

/**
 * Server-Timing Middleware
 *
 * @param {TimingOptions} [options] - The resolvedOptions for the timing middleware.
 * @param {boolean} [options.total=true] - Show the total response time.
 * @param {boolean | ((context: MiddlewareContext) => boolean)} [options.enabled=true] - Whether timings should be added to the headers or not.
 * @param {string} [options.totalDescription=Total Response Time] - Description for the total response time.
 * @param {boolean} [options.autoEnd=true] - If `startTime()` should end automatically at the end of the request.
 * @param {boolean | string | ((context: MiddlewareContext) => boolean | string)} [options.crossOrigin=false] - The origin this timings header should be readable.
 * @returns {MiddlewareHandler} The middleware handler function.
 */
export default function timing(options?: TimingOptions) {
  const resolvedOptions: TimingOptions = {
    ...{
      total: true,
      enabled: true,
      totalDescription: 'Total Response Time',
      autoEnd: true,
      crossOrigin: false,
    },
    ...options,
  };
  return defineMiddlewareHandler(
    async function timingMiddleware(context, next) {
      const headers: string[] = [];
      const timers = new Map<string, Timer>();

      if (context.state[METRIC]) {
        return await next();
      }

      context.state[METRIC] = { headers, timers };

      if (resolvedOptions.total) {
        startTime(context, 'total', resolvedOptions.totalDescription);
      }
      const res = await next();

      if (resolvedOptions.total) {
        endTime(context, 'total');
      }

      if (resolvedOptions.autoEnd) {
        timers.forEach((_, key) => endTime(context, key));
      }

      const enabled =
        typeof resolvedOptions.enabled === 'function'
          ? resolvedOptions.enabled(context)
          : resolvedOptions.enabled;

      if (enabled) {
        res.headers.append('server-timing', headers.join(','));

        const crossOrigin =
          typeof resolvedOptions.crossOrigin === 'function'
            ? resolvedOptions.crossOrigin(context)
            : resolvedOptions.crossOrigin;

        if (crossOrigin) {
          res.headers.append(
            'timing-allow-origin',
            typeof crossOrigin === 'string' ? crossOrigin : '*'
          );
        }
      }

      return res;
    }
  );
}

interface SetMetric {
  (
    context: MiddlewareContext,
    name: string,
    value: number,
    description?: string,
    precision?: number
  ): void;

  (context: MiddlewareContext, name: string, description?: string): void;
}

/**
 * Set a metric for the timing middleware.
 *
 * @param {MiddlewareContext} context - The context of the request.
 * @param {string} name - The name of the metric.
 * @param {number | string} [valueDescription] - The value or description of the metric.
 * @param {string} [description] - The description of the metric.
 * @param {number} [precision] - The precision of the metric value.
 *
 * @example
 * ```ts
 * setMetric(context, 'region', 'europe-west3')
 * setMetric(context, 'custom', 23.8, 'My custom Metric')
 * ```
 */
export const setMetric: SetMetric = (
  context: MiddlewareContext,
  name: string,
  valueDescription: number | string | undefined,
  description?: string,
  precision?: number
) => {
  validName(name);
  const metrics = context.state[METRIC];
  if (!metrics) {
    console.warn(
      'Metrics not initialized! Please add the `timing()` middleware to this route!'
    );
    return;
  }
  if (typeof valueDescription === 'number') {
    const dur = valueDescription.toFixed(precision || 1);

    const metric = description
      ? `${name};dur=${dur};desc="${description}"`
      : `${name};dur=${dur}`;

    metrics.headers.push(metric);
  } else {
    // Value-less metric
    const metric = valueDescription
      ? `${name};desc="${valueDescription}"`
      : `${name}`;

    metrics.headers.push(metric);
  }
};

/**
 * Start a timer for the timing middleware.
 *
 * @param {MiddlewareContext} context - The context of the request.
 * @param {string} name - The name of the timer.
 * @param {string} [description] - The description of the timer.
 *
 * @example
 * ```ts
 * startTime(context, 'db')
 * ```
 */
export const startTime = (
  context: MiddlewareContext,
  name: string,
  description?: string
) => {
  validName(name);
  const metrics = context.state[METRIC];
  if (!metrics) {
    console.warn(
      'Metrics not initialized! Please add the `timing()` middleware to this route!'
    );
    return;
  }
  metrics.timers.set(name, { description, start: getTime() });
};

/**
 * End a timer for the timing middleware.
 *
 * @param {MiddlewareContext} context - The context of the request.
 * @param {string} name - The name of the timer.
 * @param {number} [precision] - The precision of the timer value.
 *
 * @example
 * ```ts
 * endTime(context, 'db')
 * ```
 */
export const endTime = (
  context: MiddlewareContext,
  name: string,
  precision?: number
) => {
  validName(name);
  const metrics = context.state[METRIC];
  if (!metrics) {
    console.warn(
      'Metrics not initialized! Please add the `timing()` middleware to this route!'
    );
    return;
  }
  const timer = metrics.timers.get(name);
  if (!timer) {
    console.warn(`Timer "${name}" does not exist!`);
    return;
  }
  const { description, start } = timer;

  const duration = getTime() - start;

  setMetric(context, name, duration, description, precision);
  metrics.timers.delete(name);
};
