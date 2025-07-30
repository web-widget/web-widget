# Web Router Benchmark

Performance benchmarking for web frameworks based on `routes.json` configuration.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run benchmark tests
pnpm benchmark

# Test framework compatibility
pnpm test:compatibility
```

## Configuration

All route configurations are defined in `config/routes.json`.

## Project Structure

```
benchmarks/web-router/
├── config/
│   └── routes.json              # Core configuration file
├── src/
│   ├── frameworks/              # Framework adapters
│   │   ├── index.js             # Unified entry point
│   │   ├── hono.js             # Hono adapter
│   │   ├── web-router.js        # Web Router adapter (Direct mode)
│   │   ├── web-router[manifest].js  # Web Router adapter (Manifest mode)
│   │   ├── urlpattern-simple.js # URLPattern-based simple framework
│   │   ├── express.js           # Express adapter
│   │   ├── fastify.js           # Fastify adapter
│   │   └── koa.js              # Koa adapter
│   ├── runner/
│   │   ├── benchmark-centralized.js  # Main benchmark runner
│   │   ├── report.js            # Report generator
│   │   └── generate-report.js   # Standalone report generator
│   ├── utils/
│   │   └── route-manager.js     # Route management utilities
├── reports/                     # Generated benchmark reports
├── docs/                        # Documentation
├── test-compatibility.js        # Framework compatibility tester
├── run-with-fnm.sh             # Node.js version manager script
└── package.json
```

## Supported Frameworks

- **Hono** - Modern web framework with Web API compatibility
- **Web Router** - Direct mode (`app.get(route, fn)`)
- **Web Router#Manifest** - Manifest mode (`WebRouter.fromManifest()`)
- **urlpattern-simple** - Minimal URLPattern-based framework for performance isolation
- **Express** - Traditional Node.js web framework
- **Fastify** - Fast and low overhead web framework
- **Koa** - Lightweight and modular web framework

## Adding New Frameworks

### Step 1: Create Framework Adapter

Create a new file in `src/frameworks/`:

```javascript
// src/frameworks/my-framework.js
import MyFramework from 'my-framework';

export function createMyFrameworkAdapter() {
  return {
    name: 'my-framework',
    createApp: () => new MyFramework(),
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
    startServer: async (app) => {
      return new Promise((resolve) => {
        const server = app.listen(0, () => {
          const address = server.address();
          const port = typeof address === 'object' ? address?.port : 0;
          const baseUrl = `http://localhost:${port}`;
          resolve({ server, baseUrl });
        });
      });
    },
  };
}
```

### Step 2: Register and Configure

Add to `src/frameworks/index.js`:

```javascript
const frameworkConfigs = {
  // ... existing frameworks
  'my-framework': createMyFrameworkAdapter(),
};
```

Add to `config/routes.json`:

```json
{
  "test-configuration": {
    "frameworks": ["my-framework"]
  }
}
```

### Framework Types

**Traditional (Express/Fastify):** Use `app.get(route, handler)` pattern
**Web API (Hono):** Use `app.get(route, (c) => new Response())` pattern  
**Middleware (Koa):** Use `router.get(route, (ctx) => {})` pattern

### Key Points

- Use port 0 for random port assignment
- Set correct Content-Type headers
- Handle errors gracefully
- Add `isSupported()` for frameworks with specific requirements

For detailed examples, see the framework adapter files in `src/frameworks/`.

## Available Scripts

```bash
# Run benchmarks
pnpm benchmark

# Generate reports from existing results
pnpm report

# Generate standalone report
pnpm generate-report

# Run benchmarks with Node.js 24.4.1 (using fnm)
pnpm benchmark:node24

# Test framework compatibility
pnpm test:compatibility
```

## Framework Compatibility

The system automatically detects which frameworks are supported in your current Node.js environment and skips unsupported frameworks.

- **URLPattern-based frameworks** (web-router, web-router#manifest, urlpattern-simple) require Node.js 18+
- **Traditional frameworks** (hono, express, fastify, koa) work with Node.js 14+

Test compatibility: `pnpm test:compatibility`

## Using Specific Node.js Versions

If you want to run benchmarks with a specific Node.js version (e.g., 24.4.1) without upgrading your system Node.js:

### Method 1: Using fnm (Recommended)

```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Install Node.js 24.4.1
fnm install 24.4.1

# Run benchmarks
pnpm benchmark:node24
```

### Method 2: Using Volta

```bash
# Install Volta
curl https://get.volta.sh | bash

# Install Node.js 24.4.1
volta install node@24.4.1

# Run benchmarks
volta run node@24.4.1 -- pnpm benchmark
```

## Report Generation

The benchmark system generates reports in Markdown, JSON, and ASCII chart formats, saved in the `./reports/` directory.

## Configuration-Driven Design

All route definitions are centralized in `routes.json` with framework-specific syntax defined declaratively.

## Performance Metrics

The benchmark measures requests per second, latency percentiles, throughput, error rate, and timeout rate.

## Key Features

- Configuration-driven design with centralized route definitions
- Framework-agnostic adapter interface
- Real performance testing with autocannon
- Response validation and multiple report formats
- Automatic compatibility detection
- Easy framework addition with modular adapters
