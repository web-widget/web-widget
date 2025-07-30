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
    this.latestDir = './reports/latest';
    this.archiveDir = './reports/archive';
    this.ensureReportDirs();
    this.config = getTestConfiguration();
  }

  ensureReportDirs() {
    // Create main reports directory
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    // Create latest directory
    if (!fs.existsSync(this.latestDir)) {
      fs.mkdirSync(this.latestDir, { recursive: true });
    }

    // Create archive directory
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }

  /**
   * Move old latest files to archive
   */
  archiveOldReports() {
    const latestFiles = fs
      .readdirSync(this.latestDir)
      .filter(
        (file) =>
          file.endsWith('.md') ||
          file.endsWith('.json') ||
          file.endsWith('.txt')
      );

    if (latestFiles.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const archiveDateDir = path.join(this.archiveDir, today);

      if (!fs.existsSync(archiveDateDir)) {
        fs.mkdirSync(archiveDateDir, { recursive: true });
      }

      latestFiles.forEach((file) => {
        const sourcePath = path.join(this.latestDir, file);
        const destPath = path.join(archiveDateDir, file);
        try {
          fs.renameSync(sourcePath, destPath);
        } catch (error) {
          console.log(`⚠️  Could not archive ${file}: ${error.message}`);
        }
      });
    }
  }

  /**
   * Create index files for easy navigation
   */
  createIndexFiles(timestamp) {
    // Create latest index
    const latestIndex = `# Latest Benchmark Reports

Generated on: ${new Date().toISOString()}

## Available Reports

- [📊 Detailed Report](benchmark-report-${timestamp}.md) - Comprehensive benchmark analysis
- [📈 JSON Data](benchmark-results-${timestamp}.json) - Raw benchmark data
- [📉 Performance Chart](performance-chart-${timestamp}.txt) - ASCII performance chart

## Quick Links

- [📊 Latest Detailed Report](benchmark-report-${timestamp}.md)
- [📈 Latest JSON Data](benchmark-results-${timestamp}.json)
- [📉 Latest Performance Chart](performance-chart-${timestamp}.txt)

## Report Types

- **📊 Detailed Report** (\`
      .md\`) - Comprehensive benchmark analysis with performance metrics
- **📈 JSON Data** (\`.json\`) - Raw benchmark data for further analysis
- **📉 Performance Chart** (\`
      .txt\`) - ASCII performance charts for quick visualization
`;

    fs.writeFileSync(path.join(this.latestDir, 'README.md'), latestIndex);

    // Create main index
    const mainIndex = `# Benchmark Reports Archive

This directory contains historical benchmark reports organized by date.

## Directory Structure

- \`latest/\` - Most recent benchmark reports
- \`archive/YYYY-MM-DD/\` - Historical reports by date

## Quick Navigation

- [📁 Latest Reports](./latest/)
- [📁 Archive](./archive/)

## Report Types

- **📊 Detailed Report** (\`.md\`) - Comprehensive benchmark analysis
- **📈 JSON Data** (\`.json\`) - Raw benchmark data
- **📉 Performance Chart** (\`.txt\`) - ASCII performance charts

## Usage

To view the latest reports:
\`\`\`bash
# View latest detailed report
cat reports/latest/benchmark-report-*.md

# View latest JSON data
cat reports/latest/benchmark-results-*.json

# View latest performance chart
cat reports/latest/performance-chart-*.txt
\`\`\`
`;

    fs.writeFileSync(path.join(this.reportDir, 'README.md'), mainIndex);
  }

  generateDetailedReport(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      this.latestDir,
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
      report += `\n`;
    }

    // Configuration
    report += `## Test Configuration\n\n`;
    report += `- **Duration:** ${this.config['benchmark-duration'] || 10} seconds\n`;
    report += `- **Connections:** ${this.config.connections || 10}\n`;
    report += `- **Pipelining:** ${this.config.pipelining || 1}\n`;
    report += `- **Patterns:** ${(this.config.patterns || []).join(', ')}\n`;
    report += `- **Frameworks:** ${(this.config.frameworks || []).join(', ')}\n\n`;

    // Environment
    report += `## Test Environment\n\n`;
    report += `- **Platform:** ${process.platform}\n`;
    report += `- **Node.js Version:** ${process.version}\n`;
    report += `- **Architecture:** ${process.arch}\n`;
    report += `- **Test Date:** ${new Date().toLocaleString()}\n\n`;

    // Conclusion
    report += `## Conclusion\n\n`;
    report += `This benchmark compares the performance of various web frameworks under identical conditions.\n`;
    report += `Results show the relative performance of each framework for the tested route patterns.\n\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`📊 Detailed report generated: ${reportPath}`);

    return reportPath;
  }

  generateJsonReport(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      this.latestDir,
      `benchmark-results-${timestamp}.json`
    );

    const reportData = {
      metadata: {
        generated: new Date().toISOString(),
        testEnvironment: process.platform,
        nodeVersion: process.version,
        testDate: new Date().toLocaleString(),
      },
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
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📊 JSON report generated: ${reportPath}`);

    return reportPath;
  }

  generateComparisonChart(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const chartPath = path.join(
      this.latestDir,
      `performance-chart-${timestamp}.txt`
    );

    const maxRequests = Math.max(...results.map((r) => r.requests || 0));
    const maxBarLength = 50;

    let chart = `Performance Comparison Chart\n`;
    chart += `Generated: ${new Date().toLocaleString()}\n`;
    chart += `Node.js: ${process.version}\n`;
    chart += `=${'='.repeat(60)}\n\n`;

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

  displayAsciiChart(results) {
    const maxRequests = Math.max(...results.map((r) => r.requests || 0));
    const maxBarLength = 50;

    results
      .sort((a, b) => b.requests - a.requests)
      .forEach((result) => {
        const percentage = (result.requests / maxRequests) * 100;
        const barLength = Math.round(
          (result.requests / maxRequests) * maxBarLength
        );
        const bar =
          '█'.repeat(barLength) + '░'.repeat(maxBarLength - barLength);

        console.log(
          `${result.framework.padEnd(20)} ${bar} ${result.requests?.toFixed(0) || 'N/A'} req/s (${percentage.toFixed(1)}%)`
        );
      });

    console.log('\nLegend: █ = Performance bar, ░ = Empty space');
  }

  async generateAllReports(results) {
    // Archive old reports before generating new ones
    this.archiveOldReports();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const reports = {
      markdown: this.generateDetailedReport(results),
      json: this.generateJsonReport(results),
      chart: this.generateComparisonChart(results),
    };

    // Create index files for easy navigation
    this.createIndexFiles(timestamp);

    console.log('\n✅ All reports generated successfully!');
    console.log(`📁 Reports saved in: ${this.latestDir}/`);
    console.log(`📁 Archive available in: ${this.archiveDir}/`);

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
