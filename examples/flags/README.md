# Web Router Example - Flags SDK

This example demonstrates how to use the [Flags SDK](https://flags-sdk.dev) with Web Router to implement feature flags in different scenarios and architectures.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## 📁 Project Structure

```
examples/web-router-example/
├── config/
│   ├── flags.ts                    # Flag definitions and evaluation logic
│   └── precomputed-flags.ts        # Precomputation utilities
├── routes/
│   ├── (middlewares)/              # Middleware functions
│   │   └── flags/
│   │       └── marketing-pages@middleware.ts
│   └── flags/
│       ├── dashboard-pages/        # User-controlled pages example
│       ├── marketing-pages/        # Content-driven pages example
│       └── marketing-pages-manual-approach/  # Simple approach example
└── README.md
```

## 🎯 Examples Overview

### 1. Dashboard Pages - User-Controlled Pages

**Path:** `/flags/dashboard-pages`

Demonstrates feature flags on pages where **users have direct control** over the flag values.

**Key Features:**

- Users can toggle flags through UI controls
- Flags are controlled via cookies
- Immediate feedback when flags change
- Suitable for admin panels, dashboards, settings pages

**Implementation:**

```typescript
// Flag controlled by user via cookie
const flagValue = await showNewDashboard(request);

// UI allows direct control
<FlagControls flagName="showNewDashboard" cookieName="showNewDashboard" />
```

### 2. Marketing Pages - Content-Driven Pages

**Path:** `/flags/marketing-pages`

Demonstrates feature flags on pages where content is **predetermined by the system** based on visitor characteristics.

**Key Features:**

- Flags determined by visitor ID (system-controlled)
- Uses header-based precomputation for performance
- Clean URLs (no flag codes in URL)
- Suitable for A/B testing, personalized content, marketing campaigns

**Implementation:**

```typescript
// Middleware precomputes flags using the official SDK utility
const flagsCode = await precompute(marketingFlags, request);
request.headers.set('x-flags-code', flagsCode);

// Route handler evaluates flags with precomputed code
const flag1 = await firstMarketingABTest(flagsCode, marketingFlags);
const flag2 = await secondMarketingABTest(flagsCode, marketingFlags);
```

### 3. Marketing Pages (Manual Approach)

**Path:** `/flags/marketing-pages-manual-approach`

Shows a **simple but less scalable** approach to implementing feature flags.

**Key Features:**

- Direct flag evaluation in each route
- No precomputation optimization
- Easier to understand for beginners
- Suitable for small projects or prototypes

## 🔧 Technical Implementation Details

### Flag Definitions

All flags are defined in `config/flags.ts` with custom evaluation logic:

```typescript
export const firstMarketingABTest = flag<boolean>({
  key: 'firstMarketingABTest',
  description: 'First Marketing AB Test',
  decide({ entities }) {
    // Hash-based evaluation for consistent results
    const hash = simpleHash(entities?.visitorId + 'first');
    return hash % 100 < 50; // 50% probability
  },
});
```

### Precomputation Strategy

For content-driven pages, we use the official `@web-widget/helpers/flags` precomputation approach:

1. **Middleware** uses `precompute()` to calculate flag combinations hash
2. **Route handler** evaluates flags with precomputed code and configuration
3. **Clean URLs** - no flag codes exposed to users
4. **Performance** - enables intelligent caching with `Vary` header

```typescript
// Middleware uses official SDK precompute function
import { precompute } from '@web-widget/helpers/flags';
const flagsCode = await precompute(marketingFlags, request);
request.headers.set('x-flags-code', flagsCode);

// Route evaluates flags with precomputed code
const flag1 = await firstMarketingABTest(flagsCode, marketingFlags);
```

### Visitor ID Management

The system automatically manages visitor IDs for consistent flag evaluation:

- **HttpOnly cookies** for security
- **Automatic generation** for new visitors
- **Reset functionality** for testing different combinations
- **Middleware handling** for seamless integration

## 🎭 Key Concepts

### Content-Driven vs User-Controlled Pages

| Aspect           | Content-Driven          | User-Controlled      |
| ---------------- | ----------------------- | -------------------- |
| **Control**      | System determines       | User chooses         |
| **Use Cases**    | Marketing, A/B testing  | Dashboards, settings |
| **Consistency**  | Based on visitor ID     | Based on user action |
| **Optimization** | Precomputation possible | Real-time evaluation |

### Header-Based Precomputation Benefits

1. **Clean URLs** - No flag codes in user-visible URLs
2. **Better SEO** - Consistent URLs for search engines
3. **Enhanced UX** - No confusing URL parameters
4. **Intelligent Caching** - Enables CDN and browser caching with proper cache differentiation

### Intelligent Caching Strategy

The implementation uses an intelligent caching approach with HTTP headers:

```typescript
// Middleware computes flags and sets Vary header
const flagsCode = await precompute(marketingFlags, request);
request.headers.set('x-flags-code', flagsCode);

const response = await next();
response.headers.append('vary', 'x-flags-code');
```

**How it works:**

- Each unique `flagsCode` represents a specific combination of flag values
- The `Vary: x-flags-code` header tells caches to store separate versions for each flags combination
- Users with the same flags combination get cached responses, improving performance
- Different flag combinations are cached separately, ensuring correct content delivery

### Visitor ID Strategy

```typescript
// Consistent flag evaluation across sessions
const visitorId = crypto.randomUUID().replace(/-/g, '');
// Flags determined by: hash(visitorId + flagKey) % 100
```

## 🏗️ Architecture Patterns

### Middleware Pattern

```typescript
import { precompute } from '@web-widget/helpers/flags';

// Centralized visitor ID and flag preprocessing
export const handler = defineMiddlewareHandler(async (ctx, next) => {
  // Set visitor ID
  request.headers.set('x-visitorId', visitorId);

  // Use official SDK precompute function
  const flagsCode = await precompute(marketingFlags, request);
  request.headers.set('x-flags-code', flagsCode);

  const response = await next();

  // Enable intelligent caching based on flags code
  response.headers.append('vary', 'x-flags-code');

  return response;
});
```

### Route Handler Pattern

```typescript
// Clean separation of concerns with precomputed flags
export const handler = defineRouteHandler({
  async GET({ request, render }) {
    // Get precomputed flags code from middleware
    const flagsCode = request.headers.get('x-flags-code');

    if (!flagsCode) {
      throw new Error(
        'x-flags-code header is required. Please check the middleware configuration.'
      );
    }

    // Evaluate flags with precomputed code and configuration
    const flag1 = await firstMarketingABTest(flagsCode, marketingFlags);
    const flag2 = await secondMarketingABTest(flagsCode, marketingFlags);

    return render({ data: { flag1, flag2 } });
  },
});
```

## 🔧 Development Tips

### Testing Different Flag Combinations

1. Visit any marketing page
2. Click "Reset visitor ID" to generate a new visitor ID
3. Observe different flag combinations
4. Check browser cookies to see the visitor ID

### Debugging Flag Evaluation

The marketing pages show implementation details including:

- Current precomputed flags code
- Individual flag values
- Visitor ID information (when implemented)

### Adding New Flags

1. Define flag in `config/flags.ts`
2. Add to `marketingFlags` array in `config/precomputed-flags.ts`
3. Use in route handlers with `await flagName(flagsCode, marketingFlags)`

## 📚 Related Documentation

- [Flags SDK Documentation](https://flags-sdk.dev)
- [Web Router Documentation](https://github.com/web-widget/web-widget)
