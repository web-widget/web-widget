/**
 * @fileoverview Route Manager Utility (Legacy)
 * This module now delegates to specialized modules for better separation of concerns
 *
 * @deprecated Use specific modules instead:
 * - config-loader.js for configuration loading
 * - route-validator.js for validation
 * - test-case-manager.js for test cases
 * - framework-registry.js for framework management
 */

import { configLoader } from '../config/loader.js';
import { configValidator } from '../config/validator.js';
import { testCases } from '../test/cases.js';
import { frameworkRegistry } from '../frameworks/registry.js';

// Delegate to specialized modules
export const loadRouteConfig = () => configLoader.loadRouteConfig();
export const getTestConfiguration = () => configLoader.getTestConfiguration();
export const getRoutePatterns = () => configLoader.getRoutePatterns();
export const getFrameworkRoutes = (framework) =>
  frameworkRegistry.getFrameworkRoutes(framework);
export const getFrameworks = () => frameworkRegistry.getFrameworks();
export const getTestCases = () => testCases.getTestCases();
export const getExpectedResponses = (framework) =>
  testCases.getExpectedResponses(framework);
export const getFrameworkRoutesWithTestCases = (framework) =>
  testCases.getFrameworkRoutesWithTestCases(framework);
export const validateRouteConfig = () => configValidator.validateRouteConfig();

// Legacy functions that delegate to new modules
export const getRoutes = (framework, pattern = 'all') =>
  frameworkRegistry.getFrameworkRoutesForPattern(framework, pattern);
export const getRouteCategories = () => configLoader.getRoutePatterns();
export const getRouteDescriptions = (framework, pattern = 'all') =>
  frameworkRegistry.getRouteDescriptions(framework, pattern);
export const hasRoute = (framework, route, pattern = 'all') =>
  frameworkRegistry.hasRoute(framework, route, pattern);
export const getRouteDescription = (framework, route, pattern = 'all') =>
  frameworkRegistry.getRouteDescription(framework, route, pattern);

// Utility functions that can stay here
export const getExpectedParams = (testCase) => {
  // Extract parameters from test case path
  const params = {};
  const paramMatches = testCase.match(/\/:(\w+)/g);
  if (paramMatches) {
    paramMatches.forEach((match) => {
      const paramName = match.slice(2); // Remove '/:'
      params[paramName] = 'test-value';
    });
  }
  return params;
};

// Legacy compatibility functions
export const getRouteConfig = () => configLoader.getConfig();
export const generateRouteSummary = () => {
  const summary = {
    frameworks: frameworkRegistry.getFrameworkSummary(),
    testCases: testCases.getTestCasesSummary(),
    validation: configValidator.validateRouteConfig(),
  };
  return summary;
};

export const printRouteSummary = () => {
  const summary = generateRouteSummary();
  console.log('📊 Route Configuration Summary');
  console.log('==============================');
  console.log(
    `Frameworks: ${summary.frameworks.configured} configured, ${summary.frameworks.available} available, ${summary.frameworks.supported} supported`
  );
  console.log(`Test Cases: ${summary.testCases.total} total`);
  console.log(`Validation: ${summary.validation ? '✅ Valid' : '❌ Invalid'}`);
};
