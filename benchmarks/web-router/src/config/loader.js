/**
 * @fileoverview Configuration Loader
 * Handles loading and basic validation of configuration files
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ConfigLoader {
  constructor() {
    this.config = null;
    this.configPath = join(__dirname, '../../config/routes.json');
  }

  /**
   * Load route configuration from file
   */
  loadRouteConfig() {
    try {
      if (!existsSync(this.configPath)) {
        throw new Error('Route configuration file not found');
      }

      const configData = readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);

      return this.config;
    } catch (error) {
      console.log(`❌ Failed to load route configuration: ${error.message}`);
      return null;
    }
  }

  /**
   * Get loaded configuration
   */
  getConfig() {
    if (!this.config) {
      this.loadRouteConfig();
    }
    return this.config;
  }

  /**
   * Check if configuration is loaded
   */
  isLoaded() {
    return this.config !== null;
  }

  /**
   * Get route patterns from configuration
   */
  getRoutePatterns() {
    const config = this.getConfig();
    return config?.['route-patterns'] || {};
  }

  /**
   * Get test configuration
   */
  getTestConfiguration() {
    const config = this.getConfig();
    return config?.['test-configuration'] || {};
  }

  /**
   * Get framework routes
   */
  getFrameworkRoutes() {
    const config = this.getConfig();
    return config?.['framework-routes'] || {};
  }
}

// Export singleton instance
export const configLoader = new ConfigLoader();

// Export individual functions for backward compatibility
export const loadRouteConfig = () => configLoader.loadRouteConfig();
export const getRoutePatterns = () => configLoader.getRoutePatterns();
export const getTestConfiguration = () => configLoader.getTestConfiguration();
export const getFrameworkRoutes = () => configLoader.getFrameworkRoutes();
