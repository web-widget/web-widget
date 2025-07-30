# Web Router Benchmark

Performance benchmarking for web frameworks with configuration-driven design.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run benchmark tests
pnpm benchmark

# Test framework compatibility
pnpm test:compatibility
```

## Project Structure

```
benchmarks/web-router/
├── config/
│   └── routes.json              # Centralized route configuration
├── src/
│   ├── frameworks/              # Framework adapters
│   ├── runner/                  # Benchmark runners
│   └── utils/                   # Utilities
├── reports/                     # Generated reports
├── scripts/                     # Node.js version runners
├── tools/                       # Testing tools
└── package.json
```

## Supported Frameworks

- **Hono** - Modern web framework with Web API compatibility
- **Web Router** - Direct mode (`app.get(route, fn)`)
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
pnpm report                 # Generate reports
pnpm test:compatibility     # Test framework compatibility
```

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
- **Standard IPC communication**: Uses Node.js IPC instead of stdout parsing
- **Configuration-driven**: All routes defined in `routes.json`
- **Framework-agnostic**: Unified adapter interface
- **Real performance testing**: Uses autocannon for accurate metrics
- **Response validation**: Ensures test correctness
- **Multiple report formats**: Markdown, JSON, ASCII charts
- **Automatic compatibility detection**: Skips unsupported frameworks
- **Complete isolation**: Prevents framework interference
- **Easy extension**: Modular adapter system
- **Terminal display**: Shows performance chart directly after benchmark

## Performance Metrics

- **Requests per second** - Throughput measurement
- **Latency percentiles** - Response time analysis
- **Error rate** - Reliability assessment
- **Timeout rate** - Stability evaluation

## Example Output

After running `pnpm benchmark`, you'll see:

```
📊 Performance Comparison Chart
================================

hono                 ██████████████████████████████████████████████████ 47254 req/s (100.0%)
fastify              ████████████████████████████████████████████████░░ 45177 req/s (95.6%)
koa                  ███████████████████████████████████████████░░░░░░░ 40452 req/s (85.6%)
express              █████████████████████████████████████░░░░░░░░░░░░░ 34761 req/s (73.6%)
urlpattern-simple    ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░ 26217 req/s (55.5%)
web-router#direct    ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 14732 req/s (31.2%)
web-router           ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 13779 req/s (29.2%)
web-router#manifest  █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 8705 req/s (18.4%)

Legend: █ = Performance bar, ░ = Empty space
```
