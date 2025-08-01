/**
 * @fileoverview Test Case Manager
 * Manages test cases and expected responses for benchmark testing
 */

import { configLoader } from '../config/loader.js';

class TestCases {
  constructor() {
    this.testCases = new Map();
    this.expectedResponses = new Map();
  }

  /**
   * Get all test cases for configured patterns
   */
  getTestCases() {
    const config = configLoader.getConfig();
    if (!config) return [];

    const testCases = [];
    const patterns = config['route-patterns'];
    const patternsToUse = this.getConfiguredPatterns();

    patternsToUse.forEach((patternName) => {
      const pattern = patterns[patternName];
      if (pattern && pattern.routes) {
        pattern.routes.forEach((route) => {
          if (route['test-case']) {
            testCases.push({
              path: route['test-case'],
              pattern: patternName,
              expectedResponse: route['expected-response'],
              description: `${patternName}: ${route['test-case']}`,
            });
          }
        });
      }
    });

    return testCases;
  }

  /**
   * Get expected responses for a specific framework
   */
  getExpectedResponses(framework) {
    const config = configLoader.getConfig();
    if (!config) return {};

    const expectedResponses = {};
    const patterns = config['route-patterns'];
    const patternsToUse = this.getConfiguredPatterns();

    patternsToUse.forEach((patternName) => {
      const pattern = patterns[patternName];
      if (pattern && pattern.routes) {
        pattern.routes.forEach((route) => {
          if (route.pattern && route.pattern[framework] && route['test-case']) {
            expectedResponses[route['test-case']] = route['expected-response'];
          }
        });
      }
    });

    return expectedResponses;
  }

  /**
   * Get framework routes with test cases
   */
  getFrameworkRoutesWithTestCases(framework) {
    const config = configLoader.getConfig();
    if (!config) return [];

    const routesWithTestCases = [];
    const patterns = config['route-patterns'];
    const patternsToUse = this.getConfiguredPatterns();

    patternsToUse.forEach((patternName) => {
      const pattern = patterns[patternName];
      if (pattern && pattern.routes) {
        pattern.routes.forEach((route) => {
          if (route.pattern && route.pattern[framework]) {
            routesWithTestCases.push({
              pattern: route.pattern[framework],
              testCase: route['test-case'],
              expectedResponse: route['expected-response'],
              description: `${patternName}: ${route.pattern[framework]}`,
            });
          }
        });
      }
    });

    return routesWithTestCases;
  }

  /**
   * Get configured patterns to use
   */
  getConfiguredPatterns() {
    const config = configLoader.getConfig();
    if (!config) return [];

    const testConfig = config['test-configuration'];
    if (!testConfig?.patterns) {
      // If no patterns specified, use all available patterns
      return Object.keys(config['route-patterns'] || {});
    }

    return testConfig.patterns;
  }

  /**
   * Get test case by path
   */
  getTestCaseByPath(path) {
    const testCases = this.getTestCases();
    return testCases.find((testCase) => testCase.path === path);
  }

  /**
   * Get expected response for specific test case and framework
   */
  getExpectedResponse(testCase, framework) {
    const expectedResponses = this.getExpectedResponses(framework);
    return expectedResponses[testCase];
  }

  /**
   * Validate test case exists for framework
   */
  hasTestCase(testCase, framework) {
    const expectedResponses = this.getExpectedResponses(framework);
    return testCase in expectedResponses;
  }

  /**
   * Get all test cases summary
   */
  getTestCasesSummary() {
    const testCases = this.getTestCases();
    const summary = {
      total: testCases.length,
      byPattern: {},
      paths: testCases.map((tc) => tc.path),
    };

    testCases.forEach((testCase) => {
      const pattern = testCase.pattern;
      if (!summary.byPattern[pattern]) {
        summary.byPattern[pattern] = 0;
      }
      summary.byPattern[pattern]++;
    });

    return summary;
  }
}

// Export singleton instance
export const testCases = new TestCases();

// Export individual functions for backward compatibility
export const getTestCases = () => testCases.getTestCases();
export const getExpectedResponses = (framework) =>
  testCases.getExpectedResponses(framework);
export const getFrameworkRoutesWithTestCases = (framework) =>
  testCases.getFrameworkRoutesWithTestCases(framework);
