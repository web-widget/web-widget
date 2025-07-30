#!/usr/bin/env node

/**
 * @fileoverview Standalone Report Generator
 * Reads real benchmark results from files or prompts to run benchmarks
 */

import { BenchmarkReport } from './report.js';
import fs from 'fs';
import path from 'path';

async function findLatestResults() {
  const reportsDir = './reports';
  if (!fs.existsSync(reportsDir)) {
    return null;
  }

  const files = fs.readdirSync(reportsDir);
  const jsonFiles = files.filter(
    (file) => file.startsWith('benchmark-results-') && file.endsWith('.json')
  );

  if (jsonFiles.length === 0) {
    return null;
  }

  // Sort by timestamp and get the latest
  jsonFiles.sort().reverse();
  const latestFile = path.join(reportsDir, jsonFiles[0]);

  try {
    const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    return data.results;
  } catch (error) {
    console.log(
      `❌ Failed to read results from ${latestFile}: ${error.message}`
    );
    return null;
  }
}

async function main() {
  console.log('📊 Standalone Benchmark Report Generator');
  console.log('=======================================\n');

  // Try to find existing results
  let results = await findLatestResults();

  if (!results) {
    console.log('❌ No existing benchmark results found.');
    console.log('💡  To generate reports, first run: pnpm benchmark');
    console.log('📁 Reports will be saved in ./reports/ directory.\n');
    return;
  }

  console.log(`📊 Found existing results with ${results.length} frameworks`);
  console.log('Frameworks found:', results.map((r) => r.framework).join(', '));
  console.log('');

  const reportGenerator = new BenchmarkReport();

  // Generate reports from real data
  console.log('Generating reports from real benchmark data...\n');
  await reportGenerator.generateAllReports(results);

  console.log('\n✨  Report generation completed!');
  console.log('📁 Check the ./reports/ directory for generated files.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
