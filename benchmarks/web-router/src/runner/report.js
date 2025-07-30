#!/usr/bin/env node

/**
 * @fileoverview Benchmark Report Generator
 * Generates detailed performance reports from benchmark results
 */

import fs from 'fs';
import path from 'path';
import { getTestConfiguration } from '../utils/route-manager.js';

class BenchmarkReport {
  constructor() {
    this.reportDir = './reports';
    this.ensureReportDir();
    this.config = getTestConfiguration();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  generateDetailedReport(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      this.reportDir,
      `benchmark-report-${timestamp}.md`
    );

    let report = `# Web Router Benchmark Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n\n`;

    // Summary Table
    report += `## Performance Summary\n\n`;
    report += `| Framework | Requests/sec | Latency P50 (ms) | Latency P95 (ms) | Latency P99 (ms) | Throughput (MB/s) | Errors |\n`;
    report += `|-----------|-------------|------------------|------------------|------------------|-------------------|--------|\n`;

    results.forEach((result) => {
      report += `| ${result.framework} | ${result.requests?.toFixed(2) || 'N/A'} | ${result.latency?.p50?.toFixed(2) || 'N/A'} | ${result.latency?.p95?.toFixed(2) || 'N/A'} | ${result.latency?.p99?.toFixed(2) || 'N/A'} | ${result.throughput?.toFixed(2) || 'N/A'} | ${result.errors || 0} |\n`;
    });

    // Performance Analysis
    report += `\n## Performance Analysis\n\n`;

    const sortedResults = results.sort((a, b) => b.requests - a.requests);
    const winner = sortedResults[0];
    const loser = sortedResults[sortedResults.length - 1];

    report += `### 🏆 Winner: ${winner.framework.toUpperCase()}\n`;
    report += `- **Requests/sec:** ${winner.requests?.toFixed(2) || 'N/A'}\n`;
    report += `- **Latency P50:** ${winner.latency?.p50?.toFixed(2) || 'N/A'} ms\n`;
    report += `- **Throughput:** ${winner.throughput?.toFixed(2) || 'N/A'} MB/s\n\n`;

    report += `### 📊 Performance Comparison\n\n`;
    sortedResults.forEach((result, index) => {
      const rank = index + 1;
      const performance = ((result.requests / winner.requests) * 100).toFixed(
        1
      );
      report += `${rank}. **${result.framework}** - ${result.requests?.toFixed(2) || 'N/A'} req/s (${performance}% of winner)\n`;
    });

    // Framework Categories
    report += `\n## Framework Categories\n\n`;

    const webApiFrameworks = results.filter(
      (r) => r.framework.startsWith('web-router') || r.framework === 'hono'
    );
    const traditionalFrameworks = results.filter((r) =>
      ['express', 'fastify', 'koa'].includes(r.framework)
    );

    if (webApiFrameworks.length > 0) {
      report += `### 🌐 Web API Frameworks\n`;
      webApiFrameworks.forEach((result) => {
        report += `- **${result.framework}**: ${result.requests?.toFixed(2) || 'N/A'} req/s\n`;
      });
      report += `\n`;
    }

    if (traditionalFrameworks.length > 0) {
      report += `### 🏗️ Traditional Node.js Frameworks\n`;
      traditionalFrameworks.forEach((result) => {
        report += `- **${result.framework}**: ${result.requests?.toFixed(2) || 'N/A'} req/s\n`;
      });
      report += `\n`;
    }

    // Web Router Comparison
    const webRouterResults = results.filter((r) =>
      r.framework.startsWith('web-router')
    );
    if (webRouterResults.length > 1) {
      report += `## Web Router Mode Comparison\n\n`;
      webRouterResults.forEach((result) => {
        const mode =
          result.framework === 'web-router' ? 'Direct Mode' : 'Manifest Mode';
        report += `- **${mode} (${result.framework})**: ${result.requests?.toFixed(2) || 'N/A'} req/s\n`;
      });

      const direct = webRouterResults.find((r) => r.framework === 'web-router');
      const manifest = webRouterResults.find(
        (r) => r.framework === 'web-router#manifest'
      );

      if (direct && manifest) {
        const improvement = (
          ((direct.requests - manifest.requests) / manifest.requests) *
          100
        ).toFixed(1);
        report += `\n**Performance Difference:** Direct mode is ${improvement}% faster than Manifest mode\n`;
      }
    }

    // Recommendations
    report += `\n## Recommendations\n\n`;
    report += `1. **For High Performance:** Use ${winner.framework} for maximum throughput\n`;
    report += `2. **For Web Standards:** Consider Hono or Web Router for modern web API compatibility\n`;
    report += `3. **For Ecosystem:** Express and Fastify offer rich middleware ecosystems\n`;
    report += `4. **For Flexibility:** Koa provides a lightweight, modular approach\n`;

    // Test Configuration
    report += `\n## Test Configuration\n\n`;
    report += `- **Test Duration:** ${this.config['benchmark-duration'] || 10} seconds per framework\n`;
    report += `- **Connections:** ${this.config.connections || 10} concurrent connections\n`;
    report += `- **Route Types:** ${this.config.patterns?.join(', ') || 'Static, Path Parameters, Optional Parameters, Regex Patterns'}\n`;
    report += `- **Total Routes:** ${results.length > 0 ? '20+ routes per framework' : 'N/A'}\n`;
    report += `- **Frameworks Tested:** ${this.config.frameworks?.join(', ') || 'N/A'}\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`📊 Detailed report generated: ${reportPath}`);

    return reportPath;
  }

  generateJsonReport(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      this.reportDir,
      `benchmark-results-${timestamp}.json`
    );

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFrameworks: results.length,
        winner: results.sort((a, b) => b.requests - a.requests)[0]?.framework,
        averageRequestsPerSecond:
          results.reduce((sum, r) => sum + (r.requests || 0), 0) /
          results.length,
      },
      results: results.map((result) => ({
        framework: result.framework,
        requests: result.requests,
        latency: result.latency,
        throughput: result.throughput,
        errors: result.errors,
        timeouts: result.timeouts,
      })),
      configuration: {
        testDuration: this.config['benchmark-duration'] || 10,
        connections: this.config.connections || 10,
        patterns: this.config.patterns || [],
        frameworks: this.config.frameworks || [],
      },
      metadata: {
        testEnvironment: process.platform,
        nodeVersion: process.version,
        testDate: new Date().toLocaleString(),
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📊 JSON report generated: ${reportPath}`);

    return reportPath;
  }

  generateComparisonChart(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const chartPath = path.join(
      this.reportDir,
      `performance-chart-${timestamp}.txt`
    );

    const maxRequests = Math.max(...results.map((r) => r.requests || 0));
    const maxBarLength = 50;

    let chart = `Performance Comparison Chart\n`;
    chart += `Generated: ${new Date().toLocaleString()}\n`;
    chart += `='.repeat(60)}\n\n`;

    results
      .sort((a, b) => b.requests - a.requests)
      .forEach((result) => {
        const percentage = (result.requests / maxRequests) * 100;
        const barLength = Math.round(
          (result.requests / maxRequests) * maxBarLength
        );
        const bar =
          '█'.repeat(barLength) + '░'.repeat(maxBarLength - barLength);

        chart += `${result.framework.padEnd(20)} ${bar} ${result.requests?.toFixed(0) || 'N/A'} req/s (${percentage.toFixed(1)}%)\n`;
      });

    chart += `\nLegend: █ = Performance bar, ░ = Empty space\n`;

    fs.writeFileSync(chartPath, chart);
    console.log(`📊 ASCII chart generated: ${chartPath}`);

    return chartPath;
  }

  async generateAllReports(results) {
    console.log('📊 Generating benchmark reports...\n');

    const reports = {
      markdown: this.generateDetailedReport(results),
      json: this.generateJsonReport(results),
      chart: this.generateComparisonChart(results),
    };

    console.log('\n✅ All reports generated successfully!');
    console.log(`📁 Reports saved in: ${this.reportDir}/`);

    return reports;
  }
}

// Export for use in other modules
export { BenchmarkReport };

// Run standalone if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📊 Benchmark Report Generator');
  console.log('=============================\n');

  // This would typically be called with results from benchmark
  console.log(
    'Usage: This script is designed to be called with benchmark results'
  );
  console.log('Example: node src/runner/report.js <benchmark-results>');
}
