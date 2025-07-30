/**
 * @fileoverview Framework Adapters Index
 * Centralized framework adapter management
 */

import { createHonoAdapter } from './hono.js';
import { createWebRouterAdapter } from './web-router.js';
import { createWebRouterManifestAdapter } from './web-router[manifest].js';
import { createExpressAdapter } from './express.js';
import { createFastifyAdapter } from './fastify.js';
import { createKoaAdapter } from './koa.js';
import { createUrlPatternSimpleAdapter } from './urlpattern-simple.js';

// Import route management functions
import { getFrameworkRoutesWithTestCases } from '../utils/route-manager.js';

/**
 * Framework configuration class
 */
class FrameworkConfig {
  constructor(name, adapter) {
    this.name = name;
    this.adapter = adapter;
  }

  /**
   * Check if framework is supported in current environment
   */
  isSupported() {
    if (this.adapter.isSupported) {
      return this.adapter.isSupported();
    }
    return true; // Default to supported if no isSupported method
  }

  /**
   * Create and start server for this framework
   */
  async createAndStartServer() {
    if (!this.isSupported()) {
      console.log(
        `⚠️  Skipping ${this.name} - not supported in current environment`
      );
      return null;
    }

    try {
      const appOrConfig = this.adapter.createApp();

      // Get framework routes with test cases and expected responses
      const routesWithTestCases = getFrameworkRoutesWithTestCases(this.name);
      const sortedRoutes = sortRoutesBySpecificity(routesWithTestCases);

      // Remove duplicate routes (keep the first occurrence)
      const uniqueRoutes = [];
      const seenRoutes = new Set();

      sortedRoutes.forEach((routeConfig) => {
        if (!seenRoutes.has(routeConfig.pattern)) {
          seenRoutes.add(routeConfig.pattern);
          uniqueRoutes.push(routeConfig);
        }
      });

      // Register routes directly from configuration
      uniqueRoutes.forEach((routeConfig) => {
        const { pattern, expectedResponse, description } = routeConfig;
        this.adapter.registerRoute(
          appOrConfig,
          pattern,
          expectedResponse,
          description
        );
      });

      // Setup middleware if needed (for Koa)
      const processedApp = this.adapter.setupMiddleware
        ? this.adapter.setupMiddleware(appOrConfig)
        : appOrConfig;

      return await this.adapter.startServer(processedApp);
    } catch (error) {
      console.log(`❌ Failed to start ${this.name} server: ${error.message}`);
      return null;
    }
  }
}

/**
 * Sort routes by specificity (more specific routes first)
 */
function sortRoutesBySpecificity(routes) {
  return routes.sort((a, b) => {
    const aSpecificity = calculateSpecificity(a);
    const bSpecificity = calculateSpecificity(b);
    return bSpecificity - aSpecificity;
  });
}

function calculateSpecificity(route) {
  let score = 0;
  const path =
    route.pattern.hono ||
    route.pattern.express ||
    route.pattern.webRouter ||
    '';

  // Static routes get highest score
  if (!path.includes(':')) {
    score += 1000;
  }

  // More segments = more specific
  score += path.split('/').length * 10;

  // Regex patterns get lower score than simple params
  if (path.includes('(') || path.includes('{')) {
    score -= 50;
  }

  return score;
}

const frameworkConfigs = {
  hono: createHonoAdapter(),
  'web-router': createWebRouterAdapter(),
  'web-router#manifest': createWebRouterManifestAdapter(),
  'urlpattern-simple': createUrlPatternSimpleAdapter(),
  express: createExpressAdapter(),
  fastify: createFastifyAdapter(),
  koa: createKoaAdapter(),
};

/**
 * Get framework adapter by name
 */
export function getFrameworkAdapter(frameworkName) {
  const adapter = frameworkConfigs[frameworkName];
  if (!adapter) {
    throw new Error(`Framework '${frameworkName}' not found`);
  }
  return new FrameworkConfig(frameworkName, adapter);
}

/**
 * Get all available frameworks
 */
export function getFrameworks() {
  return Object.keys(frameworkConfigs);
}

/**
 * Get supported frameworks for current environment
 */
export function getSupportedFrameworks() {
  return Object.keys(frameworkConfigs).filter((name) => {
    const adapter = frameworkConfigs[name];
    if (adapter.isSupported) {
      return adapter.isSupported();
    }
    return true; // Default to supported if no isSupported method
  });
}
