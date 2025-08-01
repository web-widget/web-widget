/**
 * @fileoverview Framework Registry
 * Manages framework adapters and framework information
 */

import { configLoader } from '../config/loader.js';

class FrameworkRegistry {
  constructor() {
    this.frameworks = new Map();
    this.adapters = new Map();
    this.supportedFrameworks = new Set();
  }

  /**
   * Register a framework adapter
   */
  registerFramework(name, adapter) {
    this.frameworks.set(name, {
      name,
      adapter,
      supported: true,
      registered: true,
    });
  }

  /**
   * Register framework support status
   */
  registerFrameworkSupport(name, supported) {
    if (!this.frameworks.has(name)) {
      this.frameworks.set(name, {
        name,
        supported,
        registered: false,
      });
    } else {
      this.frameworks.get(name).supported = supported;
    }

    if (supported) {
      this.supportedFrameworks.add(name);
    } else {
      this.supportedFrameworks.delete(name);
    }
  }

  /**
   * Get all registered frameworks
   */
  getFrameworks() {
    // If no frameworks are registered, discover them from configuration
    if (this.frameworks.size === 0) {
      this.discoverFrameworksFromConfig();
    }
    return Array.from(this.frameworks.keys());
  }

  /**
   * Discover frameworks from configuration
   */
  discoverFrameworksFromConfig() {
    const config = configLoader.getConfig();
    if (!config) return;

    const patterns = config['route-patterns'];
    if (!patterns) return;

    const frameworks = new Set();

    // Discover frameworks from route patterns
    Object.keys(patterns).forEach((patternName) => {
      const pattern = patterns[patternName];
      if (pattern && pattern.routes) {
        pattern.routes.forEach((route) => {
          if (route.pattern) {
            Object.keys(route.pattern).forEach((framework) => {
              frameworks.add(framework);
            });
          }
        });
      }
    });

    // Register discovered frameworks
    frameworks.forEach((framework) => {
      this.registerFrameworkSupport(framework, true);
    });
  }

  /**
   * Get supported frameworks
   */
  getSupportedFrameworks() {
    return Array.from(this.supportedFrameworks);
  }

  /**
   * Get framework info
   */
  getFrameworkInfo(name) {
    return this.frameworks.get(name);
  }

  /**
   * Check if framework is supported
   */
  isFrameworkSupported(name) {
    const info = this.getFrameworkInfo(name);
    return info?.supported || false;
  }

  /**
   * Check if framework is registered
   */
  isFrameworkRegistered(name) {
    const info = this.getFrameworkInfo(name);
    return info?.registered || false;
  }

  /**
   * Get framework adapter
   */
  getFrameworkAdapter(name) {
    const info = this.getFrameworkInfo(name);
    return info?.adapter;
  }

  /**
   * Get configured frameworks from test configuration
   */
  getConfiguredFrameworks() {
    const config = configLoader.getTestConfiguration();
    return config?.frameworks || [];
  }

  /**
   * Validate configured frameworks
   */
  validateConfiguredFrameworks() {
    const configured = this.getConfiguredFrameworks();
    const available = this.getFrameworks();

    const missing = configured.filter(
      (framework) => !available.includes(framework)
    );
    const unsupported = configured.filter(
      (framework) => !this.isFrameworkSupported(framework)
    );

    return {
      valid: missing.length === 0 && unsupported.length === 0,
      missing,
      unsupported,
      available,
      configured,
    };
  }

  /**
   * Get framework routes
   */
  getFrameworkRoutes(framework) {
    const config = configLoader.getConfig();
    if (!config) return {};

    const frameworkRoutes = config['framework-routes'];
    return frameworkRoutes?.[framework] || {};
  }

  /**
   * Get all framework routes
   */
  getAllFrameworkRoutes() {
    const config = configLoader.getConfig();
    if (!config) return {};

    return config['framework-routes'] || {};
  }

  /**
   * Get framework routes for specific pattern
   */
  getFrameworkRoutesForPattern(framework, pattern = 'all') {
    const routes = this.getFrameworkRoutes(framework);

    if (pattern === 'all') {
      const allRoutes = {};
      Object.keys(routes).forEach((patternName) => {
        routes[patternName].forEach((route) => {
          allRoutes[route] = `${patternName}: ${route}`;
        });
      });
      return allRoutes;
    }

    const patternRoutes = routes[pattern];
    if (!patternRoutes) return {};

    const result = {};
    patternRoutes.forEach((route) => {
      result[route] = `${pattern}: ${route}`;
    });
    return result;
  }

  /**
   * Get route descriptions
   */
  getRouteDescriptions(framework, pattern = 'all') {
    return this.getFrameworkRoutesForPattern(framework, pattern);
  }

  /**
   * Check if framework has specific route
   */
  hasRoute(framework, route, pattern = 'all') {
    const routes = this.getFrameworkRoutesForPattern(framework, pattern);
    return route in routes;
  }

  /**
   * Get route description
   */
  getRouteDescription(framework, route, pattern = 'all') {
    const routes = this.getFrameworkRoutesForPattern(framework, pattern);
    return routes[route] || null;
  }

  /**
   * Get framework summary
   */
  getFrameworkSummary() {
    const configured = this.getConfiguredFrameworks();
    const available = this.getFrameworks();
    const supported = this.getSupportedFrameworks();

    return {
      configured: configured.length,
      available: available.length,
      supported: supported.length,
      frameworks: {
        configured,
        available,
        supported,
      },
    };
  }
}

// Export singleton instance
export const frameworkRegistry = new FrameworkRegistry();

// Export individual functions for backward compatibility
export const getFrameworks = () => frameworkRegistry.getFrameworks();
export const getFrameworkRoutes = (framework) =>
  frameworkRegistry.getFrameworkRoutes(framework);
export const getRouteDescriptions = (framework, pattern) =>
  frameworkRegistry.getRouteDescriptions(framework, pattern);
export const hasRoute = (framework, route, pattern) =>
  frameworkRegistry.hasRoute(framework, route, pattern);
export const getRouteDescription = (framework, route, pattern) =>
  frameworkRegistry.getRouteDescription(framework, route, pattern);
