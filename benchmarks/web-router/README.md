# Web Router Benchmark

Performance benchmarking for web frameworks with configuration-driven design.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run benchmark tests
pnpm benchmark

# Run one HTTP benchmark round comparing Web Router with Hono
pnpm benchmark:quick

# Select frameworks and the number of measured rounds
pnpm benchmark -- --frameworks=web-router,hono --rounds=2

# Run the isolated router matcher benchmark
pnpm benchmark:router

# Run every matcher scenario with short samples
pnpm benchmark:router:quick

# Test framework compatibility
pnpm test:compatibility
```

## Project Structure

```
benchmarks/web-router/
├── config/
│   └── routes.json              # Centralized route configuration
├── src/
│   ├── config/                  # Configuration management
│   │   ├── loader.js           # Configuration loader
│   │   └── validator.js        # Configuration validator
│   ├── router/                  # Isolated matcher benchmark cases
│   ├── test/                   # Test management
│   │   ├── cases.js           # Test case management
│   │   └── chart.js           # Chart generation
│   ├── frameworks/             # Framework management
│   │   ├── registry.js        # Framework registry
│   │   ├── base-adapter.js    # Base framework adapter
│   │   ├── express.js         # Express adapter
│   │   ├── fastify.js         # Fastify adapter
│   │   └── ...                # Other framework adapters
│   └── runner/                 # Benchmark runners
├── reports/                     # Generated reports
├── scripts/                     # Node.js version runners
├── tools/                       # Testing tools
└── package.json
```

## Supported Frameworks

- **Hono** - Modern web framework with Web API compatibility
- **Web Router** - Standard mode with URLPattern-based routing
- **Web Router#Direct** - Direct mode (`app.get(route, fn)`)
- **Web Router#Manifest** - Manifest mode (`WebRouter.fromManifest()`)
- **urlpattern-simple** - Minimal URLPattern-based framework
- **Express** - Traditional Node.js web framework
- **Fastify** - Fast and low overhead web framework
- **Koa** - Lightweight and modular web framework

## Node.js Version Compatibility

**Node.js 18+ (Recommended):**

- ✅ Native Web API support
- ✅ All frameworks use same APIs (fair comparison)

**Node.js < 18:**

- ❌ Not supported

## Available Scripts

### Core Scripts

```bash
pnpm benchmark              # Run benchmarks
pnpm benchmark:quick        # Run one Web Router/Hono HTTP benchmark round
pnpm benchmark:router       # Run isolated router matcher benchmarks
pnpm benchmark:router:quick # Validate matcher scenarios with short samples
pnpm report                 # Generate reports
pnpm test:compatibility     # Test framework compatibility
```

### Router Matcher Benchmark

The HTTP benchmark measures the complete server lifecycle. The router matcher
benchmark isolates `Router.match()` so route-table scaling and candidate
selection are visible independently of Request, Response, and socket overhead.

```bash
# Full matcher run (three measured samples per scenario)
pnpm benchmark:router

# Fast correctness and smoke run
pnpm benchmark:router:quick

# Run one scenario family
pnpm benchmark:router -- --suite=scale-shared

# Select the JSON output path, or disable output
pnpm benchmark:router -- --output=./router-results.json
pnpm benchmark:router -- --no-output
```

The runner validates expected handlers, match counts, parameter decoding,
multi-match ordering, and fresh dynamic parameter objects before timing. It
then calibrates a batch size, warms up each router, and reports the median of
the configured samples. Configuration lives in
`config/router-benchmark.json`.

| Suite                | Coverage                                                        |
| -------------------- | --------------------------------------------------------------- |
| `baseline`           | Current HTTP route mix, encoded params, dot normalization       |
| `scale-static`       | 10 to 10,000 exact static routes                                |
| `scale-shared`       | 10 to 10,000 dynamic routes in one first-segment bucket         |
| `scale-distributed`  | Dynamic routes distributed across first segments                |
| `hit-position`       | First, middle, last, and missing route in a large shared bucket |
| `distribution`       | Deterministic 80/15/5 hot, warm, and cold path mix              |
| `method-selectivity` | One shared bucket distributed across five HTTP methods          |
| `wildcard`           | Terminal wildcard scaling                                       |
| `overlap`            | Output-sensitive matching where many routes match one pathname  |
| `complex-urlpattern` | Regex-constrained URLPattern fallback scaling                   |

Matcher JSON reports are written to `reports/latest/` and include environment,
configuration, raw samples, registration time, first-match time, calibrated
batch size, and a checksum that consumes benchmark results.

### Node.js Version Scripts

```bash
pnpm benchmark:node18       # Node.js 18.x
pnpm benchmark:node20       # Node.js 20.x
pnpm benchmark:node22       # Node.js 22.x
pnpm benchmark:node24       # Node.js 24.x
pnpm benchmark:all-versions # All supported versions
```

## Adding New Frameworks

### 1. Create Framework Adapter

Create `src/frameworks/my-framework.js`:

```javascript
export default {
  name: 'my-framework',

  // Optional: Check if framework is supported in current environment
  isSupported: () => {
    // Add your compatibility check logic here
    return true;
  },

  // Required: Create the framework application instance
  createApp: () => {
    // Return your framework's app instance
    return new MyFramework();
  },

  // Required: Register a route with the framework
  registerRoute: (app, route, expected, description) => {
    app.get(route, (req, res) => {
      if (expected) {
        res.type(expected.contentType);
        res.send(expected.content);
      } else {
        res.send(description);
      }
    });
  },

  // Required: Start the server and return server info
  startServer: async (app) => {
    return new Promise((resolve) => {
      const server = app.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'object' ? address?.port : 0;
        const baseUrl = `http://localhost:${port}`;
        console.log(`✅ my-framework server started at ${baseUrl}`);
        resolve({ server, baseUrl });
      });
    });
  },
};
```

### 2. Register Framework

Add to `config/routes.json`:

```json
{
  "test-configuration": {
    "frameworks": ["my-framework"]
  }
}
```

The framework will be automatically detected and loaded from `src/frameworks/my-framework.js`.

## Report Generation

Reports are automatically generated in multiple formats:

```
reports/
├── latest/                      # Most recent reports
│   ├── benchmark-report-*.md   # Detailed analysis
│   ├── benchmark-results-*.json # Raw data
│   └── performance-chart-*.txt # ASCII charts
└── archive/                     # Historical reports
```

### Quick Access

```bash
# View latest report
cat reports/latest/benchmark-report-*.md

# View performance chart
cat reports/latest/performance-chart-*.txt
```

## Using Specific Node.js Versions

### Using fnm (Recommended)

```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Install Node.js 24.4.1
fnm install 24.4.1

# Run benchmarks
./scripts/run-with-node.sh 24
```

### Using nvm

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 24.4.1
nvm install 24.4.1

# Run benchmarks
./scripts/run-with-node.sh 24
```

### Using Volta

```bash
# Install Volta
curl https://get.volta.sh | bash

# Install Node.js 24.4.1
volta install node@24.4.1

# Run benchmarks
volta run node@24.4.1 -- pnpm benchmark
```

## Key Features

- **Process isolation**: Each framework runs in its own process
- **Noise control**: Three interleaved rounds are summarized by median results
- **Warmup**: The full request mix runs before each measured sample
- **Standard IPC communication**: Uses Node.js IPC instead of stdout parsing
- **Configuration-driven**: All routes defined in `routes.json`
- **Framework-agnostic**: Unified adapter interface
- **Real performance testing**: Uses autocannon for accurate metrics
- **Matcher scaling coverage**: Isolates route lookup from HTTP lifecycle costs
- **Response validation**: Verifies status, content type, and exact response body
- **Multiple report formats**: Markdown, JSON, ASCII charts
- **Automatic compatibility detection**: Skips unsupported frameworks
- **Complete isolation**: Prevents framework interference
- **Easy extension**: Modular adapter system
- **Terminal display**: Shows performance chart directly after benchmark
- **Domain-driven architecture**: Clear separation of concerns with dedicated modules
- **Modular design**: Specialized modules for configuration, testing, and framework management

## Performance Metrics

- **Requests per second** - Throughput measurement
- **Latency percentiles** - Response time analysis
- **Error rate** - Reliability assessment
- **Timeout rate** - Stability evaluation

The matcher benchmark additionally reports matches per second, route setup
time, first-match time, and raw per-sample throughput.
