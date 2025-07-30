/**
 * @fileoverview Process-Isolated Benchmark Runner
 * Uses standard Node.js IPC for clean parent-child communication
 */

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getTestConfiguration,
  getTestCases,
  getExpectedResponses,
} from '../utils/route-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ProcessIsolatedBenchmark {
  constructor() {
    this.results = [];
    this.config = getTestConfiguration();
    this.frameworkStatus = new Map();
    this.frameworkLogs = new Map();
  }

  /**
   * Handle message from child process
   */
  handleChildMessage(frameworkName, message) {
    const { type, data, timestamp } = message;

    // Store logs for this framework
    if (!this.frameworkLogs.has(frameworkName)) {
      this.frameworkLogs.set(frameworkName, []);
    }
    this.frameworkLogs.get(frameworkName).push(message);

    // Handle different message types
    switch (type) {
      case 'start':
        console.log(`🎯 Starting test for ${frameworkName}`);
        break;

      case 'status':
        this.frameworkStatus.set(frameworkName, data.status);
        // Only show important status updates
        if (data.status === 'ready' || data.status === 'benchmark_completed') {
          console.log(`📊 ${frameworkName}: ${data.status}`);
        }
        break;

      case 'log':
        const { level, message: logMessage } = data;
        // Only show important logs
        if (
          level === 'error' ||
          level === 'warning' ||
          logMessage.includes('Server ready') ||
          logMessage.includes('Performance test completed')
        ) {
          const emoji =
            {
              error: '❌',
              warning: '⚠️',
              info: '💡',
            }[level] || '📝';
          console.log(`${emoji} ${frameworkName}: ${logMessage}`);
        }
        break;

      case 'result':
        this.results.push(data);
        console.log(`✅ ${frameworkName}: ${data.requests.toFixed(0)} req/sec`);
        break;

      case 'error':
        console.log(`❌ ${frameworkName}: ${data.message}`);
        if (data.error) {
          console.log(`    Error: ${data.error.message}`);
          console.log(`    Stack: ${data.error.stack}`);
        }
        break;

      default:
        console.log(`📝 ${frameworkName}: Unknown message type ${type}`);
    }
  }

  /**
   * Run a single framework test in a separate process
   */
  async runFrameworkTest(frameworkName) {
    console.log(`\n🔧 Testing ${frameworkName} in isolated process`);

    return new Promise((resolve) => {
      // Create child process with IPC enabled
      const child = fork(
        join(__dirname, 'framework-test-runner.js'),
        [frameworkName],
        {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          env: {
            ...process.env,
            NODE_OPTIONS: '--experimental-modules',
          },
        }
      );

      let hasResolved = false;

      // Handle IPC messages from child
      child.on('message', (message) => {
        this.handleChildMessage(frameworkName, message);

        // Resolve when we get a result or error
        if (message.type === 'result' && !hasResolved) {
          hasResolved = true;
          resolve(message.data);
        } else if (message.type === 'error' && !hasResolved) {
          hasResolved = true;
          resolve(null);
        }
      });

      // Handle process events
      child.on('close', (code) => {
        if (!hasResolved) {
          console.log(`❌ ${frameworkName}: process exited with code ${code}`);
          resolve(null);
        }
      });

      child.on('error', (error) => {
        if (!hasResolved) {
          console.log(`❌ ${frameworkName}: process error: ${error.message}`);
          resolve(null);
        }
      });

      // Handle stdout/stderr for fallback
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout fallback
      setTimeout(() => {
        if (!hasResolved) {
          console.log(`❌ ${frameworkName}: timeout after 60 seconds`);
          child.kill();
          resolve(null);
        }
      }, 60000);
    });
  }

  /**
   * Run all framework tests
   */
  async runAllTests() {
    console.log('🎯 Starting Process-Isolated Benchmark Tests');
    console.log('===============================================');

    if (!this.validateRouteConfig()) {
      console.log('❌ Route configuration validation failed!');
      return;
    }

    for (const framework of this.config.frameworks) {
      await this.runFrameworkTest(framework);
    }

    console.log('\n📊 Generating benchmark reports...');
    await this.generateReport();
  }

  /**
   * Validate route configuration
   */
  validateRouteConfig() {
    try {
      const testCases = getTestCases();
      const expectedResponses = getExpectedResponses(this.config.frameworks[0]);

      if (testCases.length === 0) {
        console.log('❌ No test cases found');
        return false;
      }

      if (Object.keys(expectedResponses).length === 0) {
        console.log('❌ No expected responses found');
        return false;
      }

      return true;
    } catch (error) {
      console.log(`❌ Route configuration validation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate benchmark report
   */
  async generateReport() {
    if (this.results.length === 0) {
      console.log('❌ No results to report');
      return;
    }

    // Sort results by requests per second
    this.results.sort((a, b) => b.requests - a.requests);

    // Generate ASCII chart
    const maxRequests = this.results[0].requests;
    console.log('\n📊 Performance Comparison Chart');
    console.log('================================');
    console.log(`Node.js: ${process.version}\n`);

    this.results.forEach((result) => {
      const percentage = ((result.requests / maxRequests) * 100).toFixed(1);
      const barLength = Math.round((result.requests / maxRequests) * 50);
      const bar = '█'.repeat(barLength) + '░'.repeat(50 - barLength);
      console.log(
        `${result.framework.padEnd(20)} ${bar} ${result.requests.toFixed(0)} req/s (${percentage}%)`
      );
    });

    console.log('\nLegend: █ = Performance bar, ░ = Empty space');

    // Generate detailed reports (without console output)
    const validResults = this.results.filter((result) => result !== null);
    if (validResults.length > 0) {
      try {
        const { BenchmarkReport } = await import('./report.js');
        const reportGenerator = new BenchmarkReport();
        reportGenerator.generateAllReports(validResults);
      } catch (error) {
        console.log(
          `⚠️  Could not generate detailed reports: ${error.message}`
        );
      }
    }
  }
}

// Run benchmark if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new ProcessIsolatedBenchmark();
  benchmark
    .runAllTests()
    .then(() => {
      console.log('\n✅ Benchmark completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}

export default ProcessIsolatedBenchmark;
