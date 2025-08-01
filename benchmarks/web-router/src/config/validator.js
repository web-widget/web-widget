/**
 * @fileoverview Route Validator
 * Validates route configuration and framework compatibility
 */

import { configLoader } from './loader.js';

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate complete route configuration
   */
  validateRouteConfig() {
    this.errors = [];
    this.warnings = [];

    const config = configLoader.getConfig();
    if (!config) {
      this.errors.push('Configuration not loaded');
      return false;
    }

    // Validate required sections
    this.validateRequiredSections(config);

    // Validate route patterns
    this.validateRoutePatterns(config);

    // Validate test configuration
    this.validateTestConfiguration(config);

    // Validate framework routes
    this.validateFrameworkRoutes(config);

    return this.errors.length === 0;
  }

  /**
   * Validate required configuration sections
   */
  validateRequiredSections(config) {
    const requiredSections = ['route-patterns', 'test-configuration'];

    requiredSections.forEach((section) => {
      if (!config[section]) {
        this.errors.push(`Missing required section: ${section}`);
      }
    });
  }

  /**
   * Validate route patterns structure
   */
  validateRoutePatterns(config) {
    const patterns = config['route-patterns'];
    if (!patterns) return;

    Object.keys(patterns).forEach((patternName) => {
      const pattern = patterns[patternName];

      if (!pattern.routes || !Array.isArray(pattern.routes)) {
        this.errors.push(`Invalid route pattern structure: ${patternName}`);
        return;
      }

      pattern.routes.forEach((route, index) => {
        this.validateRoute(route, patternName, index);
      });
    });
  }

  /**
   * Validate individual route
   */
  validateRoute(route, patternName, index) {
    if (!route.pattern) {
      this.errors.push(
        `Route ${index} in pattern ${patternName}: missing pattern`
      );
      return;
    }

    if (!route['test-case']) {
      this.errors.push(
        `Route ${index} in pattern ${patternName}: missing test-case`
      );
      return;
    }

    if (!route['expected-response']) {
      this.errors.push(
        `Route ${index} in pattern ${patternName}: missing expected-response`
      );
      return;
    }

    // Validate expected response structure
    const expected = route['expected-response'];
    if (!expected.status || !expected.contentType || !expected.content) {
      this.errors.push(
        `Route ${index} in pattern ${patternName}: invalid expected-response structure`
      );
    }
  }

  /**
   * Validate test configuration
   */
  validateTestConfiguration(config) {
    const testConfig = config['test-configuration'];
    if (!testConfig) return;

    if (!testConfig.frameworks || !Array.isArray(testConfig.frameworks)) {
      this.errors.push('test-configuration.frameworks must be an array');
    }

    if (testConfig.frameworks && testConfig.frameworks.length === 0) {
      this.warnings.push('No frameworks configured for testing');
    }
  }

  /**
   * Validate framework routes
   */
  validateFrameworkRoutes(config) {
    const frameworkRoutes = config['framework-routes'];
    if (!frameworkRoutes) return;

    const testConfig = config['test-configuration'];
    if (!testConfig?.frameworks) return;

    // Check if all configured frameworks have routes defined
    testConfig.frameworks.forEach((framework) => {
      if (!frameworkRoutes[framework]) {
        this.warnings.push(`No routes defined for framework: ${framework}`);
      }
    });
  }

  /**
   * Get validation errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get validation warnings
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Print validation results
   */
  printValidationResults() {
    if (this.errors.length > 0) {
      console.log('❌ Route configuration validation errors:');
      this.errors.forEach((error) => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('⚠️ Route configuration warnings:');
      this.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ Route configuration is valid');
    }
  }
}

// Export singleton instance
export const configValidator = new ConfigValidator();

// Export individual functions for backward compatibility
export const validateRouteConfig = () => configValidator.validateRouteConfig();
