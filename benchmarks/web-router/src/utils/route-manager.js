/**
 * @fileoverview Route Manager Utility
 * Manages route configuration for benchmark testing
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load route configuration
export const loadRouteConfig = () => {
  try {
    const configPath = join(__dirname, '../../config/routes.json');
    if (!existsSync(configPath)) {
      console.log('❌ Route configuration file not found');
      return null;
    }
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.log(`❌ Failed to load route configuration: ${error.message}`);
    return null;
  }
};

// Get framework routes with test cases and expected responses
export const getFrameworkRoutesWithTestCases = (framework) => {
  const config = loadRouteConfig();
  if (!config) return [];

  const routesWithTestCases = [];

  // Iterate through all patterns
  Object.keys(config['route-patterns']).forEach((patternName) => {
    const patternConfig = config['route-patterns'][patternName];
    // For each route in the pattern
    patternConfig.routes.forEach((routeConfig) => {
      const patternObj = routeConfig.pattern;
      if (patternObj && patternObj[framework]) {
        routesWithTestCases.push({
          pattern: patternObj[framework],
          testCase: routeConfig['test-case'],
          expectedResponse: routeConfig['expected-response'],
          description: `${patternName}: ${patternObj[framework]}`,
        });
      }
    });
  });

  return routesWithTestCases;
};

// Get routes for a specific framework and pattern (legacy support)
export const getRoutes = (framework, pattern = 'all') => {
  const config = loadRouteConfig();
  if (!config) return {};

  const routes = {};
  const frameworkRoutes = config['framework-routes'][framework];

  if (!frameworkRoutes) {
    console.warn(`No routes defined for framework: ${framework}`);
    return {};
  }

  if (pattern === 'all') {
    // Return all routes for the framework
    Object.keys(frameworkRoutes).forEach((patternName) => {
      frameworkRoutes[patternName].forEach((route) => {
        routes[route] = `${patternName}: ${route}`;
      });
    });
  } else {
    // Return routes for specific pattern
    const patternRoutes = frameworkRoutes[pattern];
    if (patternRoutes) {
      patternRoutes.forEach((route) => {
        routes[route] = `${pattern}: ${route}`;
      });
    }
  }

  return routes;
};

// Get test cases for a specific pattern (legacy support)
export const getTestCases = (pattern = 'all') => {
  const config = loadRouteConfig();
  if (!config) return [];

  const testCases = [];

  if (pattern === 'all') {
    // Return all test cases
    Object.keys(config['route-patterns']).forEach((patternName) => {
      const patternConfig = config['route-patterns'][patternName];
      patternConfig.routes.forEach((routeConfig) => {
        testCases.push(routeConfig['test-case']);
      });
    });
  } else {
    // Return test cases for specific pattern
    const patternConfig = config['route-patterns'][pattern];
    if (patternConfig) {
      patternConfig.routes.forEach((routeConfig) => {
        testCases.push(routeConfig['test-case']);
      });
    }
  }

  return testCases;
};

// Get expected responses for a specific framework (legacy support)
export const getExpectedResponses = (framework) => {
  const config = loadRouteConfig();
  if (!config) return {};

  const expectedResponses = {};

  Object.keys(config['route-patterns']).forEach((patternName) => {
    const patternConfig = config['route-patterns'][patternName];
    patternConfig.routes.forEach((routeConfig) => {
      if (routeConfig['expected-response']) {
        expectedResponses[routeConfig['test-case']] =
          routeConfig['expected-response'];
      }
    });
  });

  return expectedResponses;
};

// Get route categories
export const getRouteCategories = () => {
  const config = loadRouteConfig();
  if (!config) return [];
  return Object.keys(config['route-patterns']);
};

// Get available frameworks
export const getFrameworks = () => {
  const config = loadRouteConfig();
  if (!config) return [];

  // Extract frameworks from route-patterns
  const frameworks = new Set();
  Object.keys(config['route-patterns']).forEach((patternName) => {
    const pattern = config['route-patterns'][patternName];
    pattern.routes.forEach((routeConfig) => {
      if (routeConfig.pattern) {
        Object.keys(routeConfig.pattern).forEach((framework) => {
          frameworks.add(framework);
        });
      }
    });
  });

  return Array.from(frameworks);
};

// Validate route configuration
export const validateRouteConfig = () => {
  const config = loadRouteConfig();
  if (!config) return false;

  try {
    // Check required sections
    if (!config['route-patterns'] || !config['test-configuration']) {
      console.log('❌ Missing required configuration sections');
      return false;
    }

    // Validate route-patterns structure
    Object.keys(config['route-patterns']).forEach((patternName) => {
      const pattern = config['route-patterns'][patternName];
      if (!pattern.routes || !Array.isArray(pattern.routes)) {
        console.log(`❌ Invalid routes structure in pattern: ${patternName}`);
        return false;
      }

      pattern.routes.forEach((routeConfig, index) => {
        if (!routeConfig.pattern || !routeConfig['test-case']) {
          console.log(
            `❌ Invalid route config at index ${index} in pattern: ${patternName}`
          );
          return false;
        }

        // Validate that pattern is an object with framework-specific routes
        if (typeof routeConfig.pattern !== 'object') {
          console.log(
            `❌ Invalid pattern structure at index ${index} in pattern: ${patternName}`
          );
          return false;
        }
      });
    });

    console.log('✅ Route configuration is valid');
    return true;
  } catch (error) {
    console.log(`❌ Route configuration validation failed: ${error.message}`);
    return false;
  }
};

// Generate route summary
export const generateRouteSummary = () => {
  const config = loadRouteConfig();
  if (!config) return {};

  const summary = {};
  Object.keys(config['route-patterns']).forEach((patternName) => {
    const pattern = config['route-patterns'][patternName];
    summary[patternName] = {
      description: pattern.description,
      routeCount: pattern.routes.length,
    };
  });

  return summary;
};

// Print route summary
export const printRouteSummary = () => {
  const summary = generateRouteSummary();
  console.log('\n📋 Route Configuration Summary:');
  console.log('=====================================');

  Object.keys(summary).forEach((patternName) => {
    const pattern = summary[patternName];
    console.log(
      `${patternName}: ${pattern.routeCount} routes - ${pattern.description}`
    );
  });

  console.log('=====================================\n');
};

// Get route configuration
export const getRouteConfig = () => {
  return loadRouteConfig();
};

// Get route patterns for a framework
export const getRoutePatterns = (framework, pattern = 'all') => {
  const config = loadRouteConfig();
  if (!config) return [];

  const frameworkRoutes = config['framework-routes'][framework];
  if (!frameworkRoutes) return [];

  if (pattern === 'all') {
    return Object.keys(frameworkRoutes);
  } else {
    return frameworkRoutes[pattern] || [];
  }
};

// Get route descriptions for a framework
export const getRouteDescriptions = (framework, pattern = 'all') => {
  const routes = getRoutes(framework, pattern);
  return Object.values(routes);
};

// Check if a route exists for a framework
export const hasRoute = (framework, route, pattern = 'all') => {
  const routes = getRoutes(framework, pattern);
  return Object.keys(routes).includes(route);
};

// Get route description for a framework
export const getRouteDescription = (framework, route, pattern = 'all') => {
  const routes = getRoutes(framework, pattern);
  return routes[route] || null;
};

// Get expected parameters for a test case (legacy support)
export const getExpectedParams = (testCase) => {
  const config = loadRouteConfig();
  if (!config) return {};

  // Search through all patterns to find matching test case
  for (const [patternName, pattern] of Object.entries(
    config['route-patterns']
  )) {
    for (const routeConfig of pattern.routes) {
      if (routeConfig['test-case'] === testCase) {
        return routeConfig['expected-params'] || {};
      }
    }
  }

  return {};
};

/**
 * Get test configuration
 */
export function getTestConfiguration() {
  const config = loadRouteConfig();
  return config['test-configuration'] || {};
}
