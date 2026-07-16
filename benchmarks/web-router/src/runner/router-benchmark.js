import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { createRouterBenchmarkCases } from '../router/cases.js';

const usesNativeURLPattern = typeof globalThis.URLPattern !== 'undefined';
if (!usesNativeURLPattern) {
  await import('urlpattern-polyfill');
}

const { default: WebRouter } = await import('@web-widget/web-router');
const urlPatternImplementation = usesNativeURLPattern
  ? 'native'
  : 'urlpattern-polyfill';
const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, '../../config/router-benchmark.json');
const baseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
const arguments_ = parseArguments(process.argv.slice(2));
const config = arguments_.quick
  ? {
      ...baseConfig,
      'warmup-duration-ms': 25,
      'sample-duration-ms': 50,
      samples: 1,
    }
  : baseConfig;
const cases = createRouterBenchmarkCases(config).filter(
  (item) => !arguments_.suite || item.suite === arguments_.suite
);

if (cases.length === 0) {
  throw new Error(
    `No router benchmark cases matched suite: ${arguments_.suite}`
  );
}

let checksum = 0;

function parseArguments(args) {
  const suite = args.find((arg) => arg.startsWith('--suite='))?.slice(8);
  const output = args.find((arg) => arg.startsWith('--output='))?.slice(9);
  return {
    quick: args.includes('--quick'),
    noOutput: args.includes('--no-output'),
    suite,
    output,
  };
}

function createRouter() {
  return new WebRouter().router;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertParams(actual, expectedParams, label) {
  for (const [name, value] of Object.entries(expectedParams)) {
    assert(
      actual[name] === value,
      `${label}: expected param ${name}=${JSON.stringify(value)}, got ${JSON.stringify(actual[name])}`
    );
  }
}

function validateRequest(router, item, label) {
  const result = router.match(item.method, item.path);
  const expectation = item.expected;
  assert(
    result.length === expectation.count,
    `${label}: expected ${expectation.count} matches for ${item.method} ${item.path}, got ${result.length}`
  );

  if (expectation.handlers) {
    assert(
      result.length === expectation.handlers.length &&
        result.every(
          (entry, index) => entry[0] === expectation.handlers[index]
        ),
      `${label}: result order changed for ${item.method} ${item.path}`
    );
  }

  if (expectation.handler === undefined) return;
  const match = result.find((entry) => entry[0] === expectation.handler);
  assert(
    match !== undefined,
    `${label}: handler ${expectation.handler} did not match ${item.method} ${item.path}`
  );
  if (!expectation.params) return;

  assertParams(match[1], expectation.params, label);
  const repeated = router
    .match(item.method, item.path)
    .find((entry) => entry[0] === expectation.handler);
  assert(repeated !== undefined, `${label}: repeated match disappeared`);
  assert(
    repeated[1] !== match[1],
    `${label}: dynamic params object was reused between match calls`
  );
}

function validateCase(router, benchmarkCase) {
  const label = benchmarkCase.id;
  for (const item of benchmarkCase.requests) {
    validateRequest(router, item, label);
  }
}

function createOperation(router, requests) {
  let cursor = 0;
  return () => {
    const item = requests[cursor];
    cursor = cursor + 1 === requests.length ? 0 : cursor + 1;
    const result = router.match(item.method, item.path);
    const first = result[0];
    const last = result[result.length - 1];
    checksum =
      (checksum +
        result.length +
        (typeof first?.[0] === 'number' ? first[0] : 0) +
        (typeof last?.[0] === 'number' ? last[0] : 0)) |
      0;
  };
}

function runBatch(operation, batchSize) {
  for (let index = 0; index < batchSize; index++) operation();
}

function calibrateBatchSize(operation) {
  let batchSize = 1;
  while (batchSize < 4096) {
    const start = performance.now();
    runBatch(operation, batchSize);
    if (performance.now() - start >= 4) break;
    batchSize *= 2;
  }
  return batchSize;
}

function measure(operation, durationMs, batchSize) {
  const start = performance.now();
  let operations = 0;
  let elapsed;
  do {
    runBatch(operation, batchSize);
    operations += batchSize;
    elapsed = performance.now() - start;
  } while (elapsed < durationMs);
  return (operations * 1000) / elapsed;
}

function median(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatRate(value) {
  return Math.round(value).toLocaleString('en-US');
}

async function benchmarkRouter(benchmarkCase) {
  const setupStart = performance.now();
  const router = createRouter();
  benchmarkCase.register(router);
  const setupMs = performance.now() - setupStart;

  const firstRequest = benchmarkCase.requests[0];
  const firstMatchStart = performance.now();
  router.match(firstRequest.method, firstRequest.path);
  const firstMatchUs = (performance.now() - firstMatchStart) * 1000;

  validateCase(router, benchmarkCase);
  const operation = createOperation(router, benchmarkCase.requests);
  const batchSize = calibrateBatchSize(operation);
  measure(operation, config['warmup-duration-ms'], batchSize);

  const samples = [];
  for (let sample = 0; sample < config.samples; sample++) {
    samples.push(measure(operation, config['sample-duration-ms'], batchSize));
  }

  return {
    id: benchmarkCase.id,
    suite: benchmarkCase.suite,
    scenario: benchmarkCase.name,
    routes: benchmarkCase.routeCount,
    workloadPaths: benchmarkCase.requests.length,
    matchesPerSecond: median(samples),
    minMatchesPerSecond: Math.min(...samples),
    maxMatchesPerSecond: Math.max(...samples),
    setupMs,
    firstMatchUs,
    batchSize,
    samples,
  };
}

console.log('Web Router Matcher Benchmark');
console.log(
  `Node ${process.version} | ${process.platform}/${process.arch} | URLPattern: ${urlPatternImplementation}`
);
console.log(
  `${cases.length} scenarios | ${config.samples} sample(s) x ${config['sample-duration-ms']}ms | ${config['warmup-duration-ms']}ms warmup`
);
if (arguments_.suite) console.log(`Suite filter: ${arguments_.suite}`);
console.log('');

const results = [];
for (const benchmarkCase of cases) {
  const result = await benchmarkRouter(benchmarkCase);
  results.push(result);
  console.log(
    `${result.id.padEnd(34)} ${formatRate(result.matchesPerSecond).padStart(14)} match/s`
  );
}

const summary = results.map((result) => {
  return {
    scenario: result.id,
    routes: result.routes,
    'match/s': formatRate(result.matchesPerSecond),
    'setup ms': result.setupMs.toFixed(2),
    'first match us': result.firstMatchUs.toFixed(2),
  };
});

console.log('');
console.table(summary);

const report = {
  metadata: {
    generated: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    urlPatternImplementation,
    urlPatternConstructorName: globalThis.URLPattern.name,
    usesNativeURLPattern,
    quick: arguments_.quick,
    suite: arguments_.suite,
  },
  configuration: config,
  checksum,
  results,
};

if (!arguments_.noOutput) {
  const timestamp = report.metadata.generated.replaceAll(/[:.]/g, '-');
  const outputPath = arguments_.output
    ? resolve(process.cwd(), arguments_.output)
    : resolve(
        __dirname,
        `../../reports/latest/router-benchmark-results-${timestamp}.json`
      );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Router benchmark JSON: ${outputPath}`);
}

console.log(`Checksum: ${checksum}`);
