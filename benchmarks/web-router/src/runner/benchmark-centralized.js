#!/usr/bin/env node

/**
 * @fileoverview Centralized Benchmark Runner
 * Uses routes.json configuration for all framework routes
 */

import autocannon from 'autocannon';
import {
  getTestCases,
  getExpectedResponses,
  validateRouteConfig,
  getTestConfiguration,
  getFrameworks,
} from '../utils/route-manager.js';
import {
  getFrameworkAdapter,
  getSupportedFrameworks,
} from '../frameworks/index.js';
import { BenchmarkReport } from './report.js';

class CentralizedBenchmark {
  constructor() {
    this.results = [];
    const config = getTestConfiguration();
    this.frameworks = getSupportedFrameworks(); // Use supported frameworks
    this.patterns = config.patterns || [
      'static',
      'required-params',
      'optional-params',
      'regex-numeric',
      'regex-alphanumeric',
      'nested-params',
      'complex-regex',
    ];
  }

  async startFrameworkServer(frameworkName) {
    try {
      const adapter = getFrameworkAdapter(frameworkName);
      const serverInfo = await adapter.createAndStartServer();

      if (!serverInfo) {
        console.log(`❌ ${frameworkName} failed to start`);
        return null;
      }

      const { server, baseUrl } = serverInfo;

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Final check for baseUrl
      if (!baseUrl) {
        console.log(`❌ ${frameworkName} failed: Could not determine baseUrl`);
        if (server && server.close) server.close();
        return null;
      }

      console.log(`✅ ${frameworkName} baseUrl confirmed: ${baseUrl}`);

      // Validate framework responses
      const isValid = await this.validateFrameworkResponse(
        frameworkName,
        baseUrl
      );
      if (!isValid) {
        console.log(`❌ ${frameworkName} validation failed!`);
        if (server && server.close) server.close();
        return null;
      }

      return { server, baseUrl };
    } catch (error) {
      console.log(
        `❌ Failed to start ${frameworkName} server: ${error.message}`
      );
      return null;
    }
  }

  async validateFrameworkResponse(frameworkName, baseUrl) {
    try {
      const testCases = getTestCases();
      const expectedResponses = getExpectedResponses(frameworkName);

      for (const testCase of testCases) {
        const response = await fetch(`${baseUrl}${testCase}`);

        if (!response.ok) {
          console.log(`❌ ${frameworkName} ${testCase}: ${response.status}`);
          return false;
        }

        const expected = expectedResponses[testCase];
        if (expected) {
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes(expected.contentType)) {
            console.log(
              `❌ ${frameworkName} ${testCase}: Content-Type mismatch (expected: ${expected.contentType}, got: ${contentType})`
            );
            return false;
          }
        }
      }

      console.log(`✅ ${frameworkName} validation passed`);
      return true;
    } catch (error) {
      console.log(`❌ ${frameworkName} validation error: ${error.message}`);
      return false;
    }
  }

  async runAutocannonTest(frameworkName, baseUrl) {
    try {
      const config = getTestConfiguration();
      const testCases = getTestCases();
      const urls = testCases.map((testCase) => `${baseUrl}${testCase}`);

      const result = await autocannon({
        url: urls[0], // Use first URL as base
        connections: config.connections || 10,
        duration: config['benchmark-duration'] || 10,
        pipelining: config.pipelining || 1,
        requests: urls.map((url) => ({ url })),
      });

      return {
        framework: frameworkName,
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
      };
    } catch (error) {
      console.log(
        `❌ ${frameworkName} autocannon test failed: ${error.message}`
      );
      return null;
    }
  }

  async runFrameworkTest(frameworkName) {
    console.log(`\n🚀 Testing ${frameworkName}...`);

    const serverInfo = await this.startFrameworkServer(frameworkName);
    if (!serverInfo) {
      console.log(`❌ Failed to start ${frameworkName}`);
      return null;
    }

    const { server, baseUrl } = serverInfo;

    try {
      const result = await this.runAutocannonTest(frameworkName, baseUrl);
      this.results.push(result);
      console.log(`✅ ${frameworkName} test completed`);
      return result;
    } catch (error) {
      console.log(`❌ ${frameworkName} test failed: ${error.message}`);
      return null;
    } finally {
      if (server && server.close) {
        server.close();
      }
    }
  }

  async runAllTests() {
    console.log('🎯 Starting Centralized Benchmark Tests');
    console.log('=====================================');

    // Validate route configuration first
    console.log('\n🔍 Validating route configuration...');
    if (!validateRouteConfig()) {
      console.log('❌ Route configuration validation failed!');
      return;
    }
    console.log('✅ Route configuration validation passed');

    // Run tests for each framework
    for (const framework of this.frameworks) {
      await this.runFrameworkTest(framework);
    }

    // Generate report
    this.generateReport();

    // Generate detailed reports
    const validResults = this.results.filter((result) => result !== null);
    if (validResults.length > 0) {
      const reportGenerator = new BenchmarkReport();
      await reportGenerator.generateAllReports(validResults);
    }
  }

  generateReport() {
    console.log('\n📊 Benchmark Results');
    console.log('===================\n');

    // Sort results by requests per second
    const sortedResults = this.results
      .filter((result) => result !== null)
      .sort((a, b) => b.requests - a.requests);

    sortedResults.forEach((result) => {
      console.log(`${result.framework.toUpperCase()}:`);
      console.log(`  Requests/sec: ${result.requests?.toFixed(2) || 'N/A'}`);
      console.log('  Latency (ms):');
      console.log(`    P50: ${result.latency?.p50?.toFixed(2) || 'N/A'}`);
      console.log(`    P95: ${result.latency?.p95?.toFixed(2) || 'N/A'}`);
      console.log(`    P99: ${result.latency?.p99?.toFixed(2) || 'N/A'}`);
      console.log(`    Max: ${result.latency?.max?.toFixed(2) || 'N/A'}`);
      console.log(
        `  Throughput: ${result.throughput?.toFixed(2) || 'N/A'} MB/s`
      );
      console.log(`  Errors: ${result.errors || 0}`);
      console.log(`  Timeouts: ${result.timeouts || 0}\n`);
    });

    if (sortedResults.length > 0) {
      const winner = sortedResults[0];
      console.log(
        `🏆 Winner: ${winner.framework.toUpperCase()} (${winner.requests?.toFixed(2) || 'N/A'} req/s)`
      );
    }
  }
}

async function main() {
  const benchmark = new CentralizedBenchmark();
  await benchmark.runAllTests();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
