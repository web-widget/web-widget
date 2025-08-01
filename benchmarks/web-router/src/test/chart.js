/**
 * @fileoverview ASCII Chart Utilities
 * Shared utilities for generating ASCII performance charts
 */

/**
 * Generate ASCII chart content
 * @param {Array} results - Benchmark results array
 * @param {Object} options - Chart options
 * @param {number} options.maxBarLength - Maximum bar length (default: 50)
 * @param {boolean} options.includeHeader - Whether to include header info
 * @returns {string} ASCII chart content
 */
export function generateAsciiChart(results, options = {}) {
  const { maxBarLength = 50, includeHeader = true } = options;

  if (!results || results.length === 0) {
    return 'No results to display';
  }

  const maxRequests = Math.max(...results.map((r) => r.requests || 0));

  let chart = '';

  if (includeHeader) {
    chart += `Performance Comparison Chart\n`;
    chart += `Generated: ${new Date().toLocaleString()}\n`;
    chart += `Node.js: ${process.version}\n`;
    chart += `=${'='.repeat(60)}\n\n`;
  }

  // Calculate maximum framework name length for proper alignment
  const maxFrameworkLength = Math.max(
    ...results.map((r) => r.framework.length)
  );
  const frameworkColumnWidth = Math.max(maxFrameworkLength, 15); // Minimum width of 15

  results
    .sort((a, b) => b.requests - a.requests)
    .forEach((result) => {
      const percentage = (result.requests / maxRequests) * 100;
      const barLength = Math.round(
        (result.requests / maxRequests) * maxBarLength
      );
      const bar = '█'.repeat(barLength) + '░'.repeat(maxBarLength - barLength);

      chart += `${result.framework.padEnd(frameworkColumnWidth)} ${bar} ${result.requests?.toFixed(0) || 'N/A'} req/s (${percentage.toFixed(1)}%)\n`;
    });

  chart += `\nLegend: █ = Performance bar, ░ = Empty space\n`;

  return chart;
}

/**
 * Display ASCII chart to console
 * @param {Array} results - Benchmark results array
 * @param {Object} options - Chart options
 */
export function displayAsciiChart(results, options = {}) {
  const chart = generateAsciiChart(results, {
    ...options,
    includeHeader: true,
  });
  console.log(chart);
}

/**
 * Generate ASCII chart and save to file
 * @param {Array} results - Benchmark results array
 * @param {string} filePath - Output file path
 * @param {Object} options - Chart options
 * @returns {string} Generated file path
 */
export async function saveAsciiChart(results, filePath, options = {}) {
  const fs = await import('fs');
  const chart = generateAsciiChart(results, {
    ...options,
    includeHeader: true,
  });
  fs.writeFileSync(filePath, chart);
  return filePath;
}
