/**
 * @fileoverview Process-Isolated Benchmark Runner
 * Uses standard Node.js IPC for clean parent-child communication
 */

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getTestConfiguration } from '../config/loader.js';
import { getTestCases, getExpectedResponses } from '../test/cases.js';
import { getFrameworks } from '../frameworks/registry.js';
import { displayAsciiChart } from '../test/chart.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ProcessIsolatedBenchmark {
  constructor(args = process.argv.slice(2)) {
    this.results = [];
    this.config = createBenchmarkConfiguration(getTestConfiguration(), args);
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
              warning: '🟠',
              info: '🟢',
            }[level] || '📝';
          console.log(`${emoji} ${frameworkName}: ${logMessage}`);
        }
        break;

      case 'result':
        console.log(`✅ ${frameworkName}: ${data.requests.toFixed(0)} req/sec`);
        break;

      case 'skipped':
        console.log(`⏭️ ${frameworkName}: ${data.reason}`);
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
        } else if (message.type === 'skipped' && !hasResolved) {
          hasResolved = true;
          resolve({ framework: frameworkName, skipped: true });
        } else if (message.type === 'error' && !hasResolved) {
          hasResolved = true;
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

      // Handle process events with detailed error information
      child.on('close', (code) => {
        if (!hasResolved) {
          // Provide more detailed exit code information
          let exitReason = '';
          switch (code) {
            case 0:
              exitReason = ' (success)';
              break;
            case 1:
              exitReason = ' (framework not supported or test failed)';
              break;
            case 2:
              exitReason = ' (configuration error)';
              break;
            default:
              exitReason = ` (unknown error code ${code})`;
          }

          console.log(
            `❌ ${frameworkName}: process exited with code ${code}${exitReason}`
          );

          // Show stderr output if available
          if (stderr.trim()) {
            console.log(`    stderr: ${stderr.trim()}`);
          }

          // Show stdout output if available (for debugging)
          if (stdout.trim()) {
            console.log(`    stdout: ${stdout.trim()}`);
          }

          resolve(null);
        }
      });

      child.on('error', (error) => {
        if (!hasResolved) {
          console.log(`❌ ${frameworkName}: process error: ${error.message}`);

          // Show stderr output if available
          if (stderr.trim()) {
            console.log(`    stderr: ${stderr.trim()}`);
          }

          resolve(null);
        }
      });

      // Allow enough time for startup, validation, warmup, and the measured run.
      const timeout =
        ((this.config['warmup-duration'] || 2) +
          (this.config['benchmark-duration'] || 10) +
          20) *
        1000;
      const timeoutId = setTimeout(() => {
        if (!hasResolved) {
          console.log(
            `❌ ${frameworkName}: timeout after ${timeout / 1000} seconds`
          );
          child.kill();
          resolve(null);
        }
      }, timeout);

      child.once('close', () => clearTimeout(timeoutId));
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

    const rounds = this.config['benchmark-rounds'] || 3;
    const samples = new Map(
      this.config.frameworks.map((framework) => [framework, []])
    );
    const skipped = new Set();

    // Rotate the starting framework each round so machine drift does not always
    // favor the same entry while retaining process isolation.
    for (let round = 0; round < rounds; round++) {
      console.log(`\n🔁 Benchmark round ${round + 1}/${rounds}`);
      const frameworks = this.config.frameworks.slice();
      const offset = round % frameworks.length;
      const roundOrder = frameworks
        .slice(offset)
        .concat(frameworks.slice(0, offset));

      for (const framework of roundOrder) {
        if (skipped.has(framework)) continue;
        const result = await this.runFrameworkTest(framework);
        if (result?.skipped) {
          skipped.add(framework);
        } else if (result) {
          samples.get(framework).push(result);
        }
      }
    }

    const incomplete = [...samples].filter(
      ([framework, values]) =>
        !skipped.has(framework) && values.length !== rounds
    );
    if (incomplete.length > 0) {
      const details = incomplete
        .map(
          ([framework, values]) => `${framework} (${values.length}/${rounds})`
        )
        .join(', ');
      throw new Error(`Incomplete benchmark results: ${details}`);
    }

    this.results = [...samples]
      .filter(([framework]) => !skipped.has(framework))
      .map(([, values]) => aggregateResults(values));

    if (this.results.length === 0) {
      throw new Error('All configured frameworks were skipped');
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

      // NOTE: Validate configured frameworks
      if (!this.config.frameworks || this.config.frameworks.length === 0) {
        console.log('❌ No frameworks configured in test-configuration');
        return false;
      }

      // NOTE: Check if configured frameworks have routes defined
      const availableFrameworks = getFrameworks();
      const missingFrameworks = this.config.frameworks.filter(
        (framework) => !availableFrameworks.includes(framework)
      );

      if (missingFrameworks.length > 0) {
        console.log(
          `❌ Frameworks not found in route configuration: ${missingFrameworks.join(', ')}`
        );
        console.log(`Available frameworks: ${availableFrameworks.join(', ')}`);
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

    // Generate ASCII chart using shared utility
    console.log('\n📊 Performance Comparison Chart');
    console.log('================================');
    displayAsciiChart(this.results, { includeHeader: false });

    // Generate detailed reports (without console output)
    const validResults = this.results.filter((result) => result !== null);
    if (validResults.length > 0) {
      try {
        const { BenchmarkReport } = await import('./report.js');
        const reportGenerator = new BenchmarkReport();
        reportGenerator.generateAllReports(validResults);
      } catch (error) {
        console.log(`🟠 Could not generate detailed reports: ${error.message}`);
      }
    }
  }
}

export function createBenchmarkConfiguration(baseConfig, args) {
  const config = {
    ...baseConfig,
    frameworks: baseConfig.frameworks.slice(),
  };
  const frameworksArgument = args.find((arg) =>
    arg.startsWith('--frameworks=')
  );

  if (frameworksArgument) {
    const frameworks = frameworksArgument
      .slice('--frameworks='.length)
      .split(',')
      .map((framework) => framework.trim())
      .filter(Boolean);
    if (frameworks.length === 0) {
      throw new Error('--frameworks requires at least one framework');
    }
    config.frameworks = frameworks;
  }

  if (args.includes('--quick')) {
    config['benchmark-rounds'] = 1;
  }

  return config;
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function aggregateResults(samples) {
  const metrics = (selector) => median(samples.map(selector));
  return {
    framework: samples[0].framework,
    requests: metrics((sample) => sample.requests),
    latency: {
      p50: metrics((sample) => sample.latency.p50),
      p99: metrics((sample) => sample.latency.p99),
      max: metrics((sample) => sample.latency.max),
    },
    throughput: metrics((sample) => sample.throughput),
    errors: metrics((sample) => sample.errors),
    timeouts: metrics((sample) => sample.timeouts),
    samples: samples.map((sample) => sample.requests),
    status: 'benchmark_completed',
  };
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
