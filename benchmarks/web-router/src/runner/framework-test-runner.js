/**
 * @fileoverview Framework Test Runner - Standard IPC Communication
 * Uses standard Node.js IPC for clean parent-child communication
 */

import { getTestConfiguration } from '../config/loader.js';
import {
  getTestCases,
  getExpectedResponses,
  getFrameworkRoutesWithTestCases,
} from '../test/cases.js';
// Direct framework loading without async-loader (using child process isolation)

class FrameworkTestRunner {
  constructor(frameworkName) {
    this.frameworkName = frameworkName;
    this.config = getTestConfiguration();
    this.status = 'initialized';
  }

  /**
   * Send structured message to parent process
   */
  sendMessage(type, data = {}) {
    const message = {
      type,
      framework: this.frameworkName,
      timestamp: new Date().toISOString(),
      data,
    };

    // Use process.send for IPC communication
    if (process.send) {
      process.send(message);
    } else {
      // Fallback to stdout for non-IPC scenarios
      console.log(JSON.stringify(message));
    }
  }

  /**
   * Send status update
   */
  updateStatus(status, details = {}) {
    this.status = status;
    this.sendMessage('status', { status, details });
  }

  /**
   * Send log message
   */
  log(level, message, data = {}) {
    // Only send important logs to parent
    if (
      level === 'error' ||
      level === 'warning' ||
      message.includes('Server ready') ||
      message.includes('Performance test completed')
    ) {
      this.sendMessage('log', { level, message, data });
    }
  }

  /**
   * Send error
   */
  error(message, error = null) {
    // NOTE: Send as 'error' type for better error display in parent process
    if (error) {
      this.sendMessage('error', {
        message,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
          code: error.code,
          toString: error.toString(),
        },
      });
    } else {
      this.log('error', message);
    }
  }

  /**
   * Send warning
   */
  warning(message, data = {}) {
    this.log('warning', message, data);
  }

  /**
   * Send info
   */
  info(message, data = {}) {
    this.log('info', message, data);
  }

  /**
   * Check if framework is supported
   */
  async checkFrameworkSupport() {
    try {
      this.updateStatus('checking_support');
      this.info('Checking framework support');

      // Load adapter directly with standard URL encoding
      const fileName = encodeURIComponent(this.frameworkName);
      const adapterModule = await import(`../frameworks/${fileName}.js`);
      const adapter = adapterModule.default;

      if (adapter.isSupported) {
        const isSupported = adapter.isSupported();
        if (!isSupported) {
          this.error('Framework not supported in current environment');
          this.updateStatus('not_supported');
          return false;
        }
      }

      this.updateStatus('supported');
      this.info('Framework supported in current environment');
      return true;
    } catch (error) {
      this.error('Failed to load adapter', error);
      this.updateStatus('load_failed');
      return false;
    }
  }

  /**
   * Start framework server
   */
  async startFrameworkServer() {
    try {
      this.updateStatus('loading_adapter');
      this.info('Loading framework adapter');

      // Load adapter directly with standard URL encoding
      const fileName = encodeURIComponent(this.frameworkName);
      const adapterModule = await import(`../frameworks/${fileName}.js`);
      const adapter = adapterModule.default;

      this.updateStatus('creating_app');
      this.info('Creating application instance');

      // Create and start server
      const appOrConfig = adapter.createApp();

      // Get framework routes with test cases and expected responses
      const routesWithTestCases = getFrameworkRoutesWithTestCases(
        this.frameworkName
      );

      // Sort routes by specificity and remove duplicates
      const sortedRoutes = this.sortRoutesBySpecificity(routesWithTestCases);
      const uniqueRoutes = [];
      const seenRoutes = new Set();

      sortedRoutes.forEach((routeConfig) => {
        if (!seenRoutes.has(routeConfig.pattern)) {
          seenRoutes.add(routeConfig.pattern);
          uniqueRoutes.push(routeConfig);
        }
      });

      this.updateStatus('registering_routes');
      this.info(`Registering ${uniqueRoutes.length} routes`);

      // Register routes directly from configuration
      uniqueRoutes.forEach((routeConfig) => {
        const { pattern, expectedResponse, description } = routeConfig;
        adapter.registerRoute(
          appOrConfig,
          pattern,
          expectedResponse,
          description
        );
      });

      // Setup middleware if needed (for Koa)
      const processedApp = adapter.setupMiddleware
        ? adapter.setupMiddleware(appOrConfig)
        : appOrConfig;

      this.updateStatus('starting_server');
      this.info('Starting server');

      const serverInfo = await adapter.startServer(processedApp);

      if (!serverInfo) {
        this.error('Failed to start server - no server info returned');
        this.updateStatus('server_start_failed');
        return null;
      }

      const { server, baseUrl } = serverInfo;

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!baseUrl) {
        this.error('Could not determine baseUrl from server info');
        if (server && server.close) server.close();
        this.updateStatus('baseurl_failed');
        return null;
      }

      this.updateStatus('validating_responses');
      this.info('Validating framework responses');

      // Validate framework responses
      const isValid = await this.validateFrameworkResponse(baseUrl);
      if (!isValid) {
        this.error('Response validation failed - check route configuration');
        if (server && server.close) server.close();
        this.updateStatus('validation_failed');
        return null;
      }

      this.updateStatus('ready');
      this.info(`Server ready at ${baseUrl}`);
      return { server, baseUrl };
    } catch (error) {
      this.error('Server startup failed', error);
      this.updateStatus('error');
      return null;
    }
  }

  /**
   * Validate framework responses
   */
  async validateFrameworkResponse(baseUrl) {
    try {
      const testCases = getTestCases();
      const expectedResponses = getExpectedResponses(this.frameworkName);

      this.info(`Validating ${testCases.length} test cases`);

      for (const testCase of testCases) {
        const testPath = testCase.path || testCase; // Handle both object and string
        const response = await fetch(`${baseUrl}${testPath}`);

        if (!response.ok) {
          this.error(
            `Test case failed: ${testPath} - HTTP ${response.status} ${response.statusText}`
          );
          return false;
        }

        const expected = expectedResponses[testPath];
        if (expected) {
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes(expected.contentType)) {
            this.error(
              `Content-Type mismatch for ${testPath} (expected: ${expected.contentType}, got: ${contentType})`
            );
            return false;
          }
        }
      }

      this.info('All test cases validated successfully');
      return true;
    } catch (error) {
      this.error('Validation error', error);
      return false;
    }
  }

  /**
   * Run autocannon test
   */
  async runAutocannonTest(baseUrl) {
    try {
      this.updateStatus('running_benchmark');
      this.info('Running performance test');

      const { default: autocannon } = await import('autocannon');
      const testCases = getTestCases();
      const urls = testCases.map((testCase) => {
        const testPath = testCase.path || testCase; // Handle both object and string
        return `${baseUrl}${testPath}`;
      });

      const result = await autocannon({
        url: urls[0], // Use first URL as base
        connections: this.config.connections || 10,
        duration: this.config['benchmark-duration'] || 10,
        pipelining: this.config.pipelining || 1,
        requests: urls.map((url) => ({ url })),
      });

      this.updateStatus('benchmark_completed');
      this.info('Performance test completed');

      return {
        framework: this.frameworkName,
        requests: result.requests.average,
        latency: {
          p50: result.latency.p50,
          p95: result.latency.p95,
          p99: result.latency.p99,
          max: result.latency.max,
        },
        throughput: result.throughput.average,
        errors: result.errors,
        timeouts: result.timeouts,
        status: this.status,
      };
    } catch (error) {
      this.error('Performance test failed', error);
      this.updateStatus('benchmark_failed');
      return null;
    }
  }

  /**
   * Sort routes by specificity (more specific routes first)
   */
  sortRoutesBySpecificity(routes) {
    return routes.sort((a, b) => {
      const aSpecificity = this.calculateSpecificity(a);
      const bSpecificity = this.calculateSpecificity(b);
      return bSpecificity - aSpecificity;
    });
  }

  /**
   * Calculate route specificity score
   */
  calculateSpecificity(route) {
    const pattern = route.pattern;
    let score = 0;

    // Static routes get highest score
    if (!pattern.includes(':')) {
      score += 1000;
    }

    // Routes with more segments get higher score
    const segments = pattern.split('/').filter(Boolean);
    score += segments.length * 100;

    // Routes with parameters get lower score
    const paramCount = (pattern.match(/:/g) || []).length;
    score -= paramCount * 50;

    // Routes with regex get even lower score
    const regexCount = (pattern.match(/\{[^}]+\}/g) || []).length;
    score -= regexCount * 100;

    return score;
  }

  /**
   * Run the complete test
   */
  async run() {
    try {
      this.sendMessage('start', { framework: this.frameworkName });

      // Check framework support
      const isSupported = await this.checkFrameworkSupport();
      if (!isSupported) {
        this.sendMessage('log', {
          level: 'warning',
          message: 'Framework skipped',
        });
        process.exit(1);
      }

      // Start server
      const serverInfo = await this.startFrameworkServer();
      if (!serverInfo) {
        this.sendMessage('error', { message: 'Failed to start server' });
        process.exit(1);
      }

      const { server, baseUrl } = serverInfo;

      try {
        // Run performance test
        const result = await this.runAutocannonTest(baseUrl);
        if (result) {
          this.sendMessage('result', result);
          process.exit(0); // Exit successfully after sending result
        } else {
          this.sendMessage('error', { message: 'Performance test failed' });
          process.exit(1);
        }
      } finally {
        // Always close server
        if (server && server.close) {
          server.close();
          this.info('Server closed');
        }
      }
    } catch (error) {
      this.sendMessage('error', {
        message: 'Test failed',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
      process.exit(1);
    }
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const frameworkName = process.argv[2];
  if (!frameworkName) {
    console.log('❌ Framework name not provided');
    process.exit(1);
  }

  const runner = new FrameworkTestRunner(frameworkName);
  runner.run().catch((error) => {
    console.log(`❌ Test runner error: ${error.message}`);
    process.exit(1);
  });
}

export default FrameworkTestRunner;
