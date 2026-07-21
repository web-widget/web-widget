# Frontend integration regression tests

**[中文文档](./README.zh.md)**

This workspace verifies the browser-visible contract from Vite transforms and
SSR output through Web Widget hydration and development updates.

## Scope

The suite currently covers:

- `C01-C08`: CSS ownership, boundary, transform, and import-path matrix;
- `Y01-Y05`: React, Vue 3, Preact, Solid, and Svelte hydration;
- `U01-U08`: Vite HMR versus full-reload policy after source mutations;
- `M01-M05`: server/client version skew and hydration races;
- Shadow SSR: native DSD parsing, internal mount-root recovery, style
  isolation/order, named slots, pending cleanup, and interaction across React,
  Vue 3, Preact, Solid, and Svelte;
- production delivery: a built SSR entry and hashed client assets served by a
  standalone Node server without Vite at runtime;
- structured hydration errors, resource failures, and fixture lifecycle.

Vue 2 is intentionally excluded from this workspace to avoid Vue 2/Vue 3
plugin and runtime coexistence conflicts. Its package-level tests remain
separate.

## Running locally

Install the workspace dependencies and Playwright Chromium first:

```sh
pnpm install
pnpm --filter @tests/integration exec playwright install chromium
```

Run the same Chromium suites used for pull requests:

```sh
pnpm --filter @tests/integration test:ci:core:dev
pnpm --filter @tests/integration test:ci:core:production
```

Useful focused commands:

```sh
# One spec or one case ID
pnpm --filter @tests/integration exec playwright test specs/updates.spec.ts --project=chromium --workers=1
pnpm --filter @tests/integration exec playwright test --project=chromium --grep U04

# Complete local dev suite
pnpm --filter @tests/integration test:dev

# Complete production-mode suite using the standalone Node server
pnpm --filter @tests/integration test:production

# Production hydration across Chromium, Firefox, and WebKit
BROWSER_MATRIX=extended pnpm --filter @tests/integration test:production

# Type checking
pnpm --filter @tests/integration typecheck
```

Mutation tests must run serially. They start a Vite server on a random port and
modify a temporary fixture copy, so interrupted tests do not change tracked
source files. Do not point them at a playground or replace watcher
synchronization with a fixed sleep.

Production tests create `dist/client` and `dist/server/entry.server.js`, then run
`scripts/production-server.mjs`. The runtime process loads the built SSR entry
and serves hashed assets without Vite. Mutation and mismatch specs are excluded
from production because their contract requires the Vite dev module graph and
watcher.

Playwright retains traces on failure. Browser console/resource diagnostics and
the temporary Vite server log are attached under `test-results/`.

## Layout

| Path                               | Responsibility                                                   |
| ---------------------------------- | ---------------------------------------------------------------- |
| `src/cases.ts`                     | Static scenario registry and matrix validation                   |
| `src/cases/`                       | CSS and Vue fixtures used by the matrix                          |
| `src/hydration/`                   | Framework hydration fixtures                                     |
| `src/entry.server.ts`              | Production request routing and dynamic SSR response contract     |
| `src/assertions.ts`                | Computed style, navigation identity, and Widget state assertions |
| `src/source-mutation.ts`           | Source editing with Vite watcher acknowledgement                 |
| `src/server-fixture.ts`            | Temporary fixture copy and random-port Vite lifecycle            |
| `specs/css-static.spec.ts`         | SSR, CSS asset, selector, and computed-style behavior            |
| `specs/hydration*.spec.ts`         | Hydration identity, lifecycle, and structured errors             |
| `specs/shadow-ssr.spec.ts`         | Declarative Shadow DOM parsing, recovery, styles, and slots      |
| `specs/shadow-vite-plugin.spec.ts` | Router/Vite CSS ownership, aliases, HMR, scoped CSS, production  |
| `specs/updates.spec.ts`            | Dev HMR/full-reload policy                                       |
| `specs/mismatch.spec.ts`           | Version skew and hydration race recovery                         |
| `specs/production-server.spec.ts`  | Production HTTP, cache, fallback, and security behavior          |
| `scripts/production-server.mjs`    | Loads the built SSR entry and serves client assets without Vite  |
| `vite.config.ts`                   | Fixture transforms, update policy, and test control endpoints    |

## Adding coverage

Start by assigning the new behavior to one category. Extend an existing case ID
series when it tests another dimension of that contract; introduce a new series
only when the behavior has a different acceptance contract. Document the new
case and its acceptance contract together with the implementation.

### Static CSS or asset behavior

1. Add the smallest fixture under `src/cases/`.
2. Register its owner, boundary, transform, import path, selector, and expected
   computed styles in `src/cases.ts`.
3. Extend registry enums when adding a new matrix dimension. The registry test
   must fail if that dimension is no longer represented.
4. Assert both server/protocol output and browser semantics. A DOM snapshot alone
   is not sufficient.
5. Run the focused spec in dev and production modes.

### Hydration or framework behavior

1. Add a minimal framework fixture under `src/hydration/` and render matching
   SSR markup in `src/server-fixture.ts` or the fixture Vite plugin.
2. Record pre-hydration host, mount-root, and probe nodes when identity matters.
3. Wait for the explicit hydration-ready signal and Widget status; do not match
   framework console wording.
4. Assert node identity, computed style, one interaction, update/unmount
   lifecycle, `window.__hydrationErrors`, console errors, and resource errors.
5. Add production browser coverage when introducing a new adapter.

### Shadow DOM SSR behavior

Keep Shadow DOM cases in `specs/shadow-ssr.spec.ts` rather than adding
`shadow` to the document/light CSS matrix. Assert the raw DSD protocol before
navigation, then assert the parsed open `ShadowRoot`, the single direct
`web-widget-root`, style ownership and order, slot assignment, pending removal,
framework interaction, and error channels. Development covers the core
React/Vue path; production covers all five hydration fixtures against built
package output.

`specs/shadow-vite-plugin.spec.ts` owns the bundler boundary that the core
fixture deliberately does not model. Its development tests run a temporary
copy of the router playground so source mutation cannot dirty the workspace;
its production test builds the real playground so workspace package aliases
and multi-environment client entries use their actual resolution model.

| Risk dimension               | Development contract                                                                                       | Production contract                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Route/Widget and CSS aliases | Vue Widgets resolve through package aliases; all Widgets resolve shared CSS through `~`                    | The real workspace build resolves the same imports                |
| CSS Modules                  | Raw DSD and computed styles use the same transformed class/CSS version                                     | Widget CSS is embedded in each DSD boundary                       |
| Vue scoped CSS               | Vue 2/3 virtual styles are embedded, hot-updated, and present in a fresh SSR response                      | Scoped selectors remain shadow-local after build                  |
| Route vs Widget CSS          | Route CSS applies to a document probe and cannot style shadow buttons                                      | Route CSS is delivered by document assets, not copied into DSD    |
| HMR                          | CSS Module changes reload once; SFC scoped CSS updates without navigation; fresh SSR is current            | Not applicable                                                    |
| Hydration errors             | `hydration-errors.spec.ts` covers load/bootstrap/mount errors while preserving a ShadowRoot and mount root | Core production hydration remains covered by `shadow-ssr.spec.ts` |

Do not replace these assertions with style-tag counts. Each ownership case must
assert raw server HTML and browser computed style. Each mutation must also
request fresh SSR so an active page HMR success cannot hide stale server-side
`devStyles`.

### HMR or reload policy

1. Add a serial `Uxx` scenario to `specs/updates.spec.ts`.
2. Mutate the temporary fixture only through `mutateSource()`, which confirms
   that Vite observed the file change.
3. For HMR, assert changed output, unchanged navigation identity, one initial
   `load`, preserved DOM/state according to the framework, and no hydration
   errors.
4. For full reload, assert a changed navigation identity, exactly two `load`
   events, new SSR output, and a clean hydration result.
5. Declare or change the policy in `vite.config.ts` and document the contract in
   this README in the same change. Do not weaken the assertion merely to match
   current implementation.

### Version skew or race behavior

Add an `Mxx` scenario to `specs/mismatch.spec.ts` when timing is part of the
contract, for example old SSR with a new client module or an update during
hydration. Control the timing with explicit test endpoints/signals, assert the
final consistent or structured-error state, and keep retries disabled.

### Production delivery behavior

Add production HTTP and deployment-boundary assertions to
`specs/production-server.spec.ts`. Test the built URL through Playwright's
request or browser APIs; do not import source modules or Vite server APIs. Cover
both the successful response and the failure boundary, including status,
content type, cache/security headers, and whether document fallback is allowed.
Keep the standalone server dependency-free so the runtime check proves that
Vite is not required to serve the build. Route, redirect, API, and error behavior
belongs in `src/entry.server.ts`; test both its HTTP result and hydration from a
dynamic route.

## Review checklist

- The test fails when the new behavior is deliberately broken.
- Assertions cover user-visible semantics, not framework log text or a broad
  snapshot.
- HMR/reload count, navigation identity, state, and hydration errors are explicit
  where a mutation occurs.
- The fixture uses deterministic readiness/watcher signals instead of sleeps.
- Dev and production coverage match the behavior's scope.
- Production tests do not start Vite or exercise dev-only mutation endpoints.
- New core fixture framework coverage does not introduce Vue 2; the router
  boundary fixture may reuse the playground's existing Vue 2 package.
- CI scripts are updated if the case belongs to a different test layer.
- This README records any new case category or update-policy contract.

## Next coverage candidates

Prefer additions that close a known contract gap:

1. CSS Module class rename, addition, and removal across SSR/client invalidation.
2. Shared style dependencies imported by multiple routes and Widgets.
3. Failed HMR transforms followed by a successful edit and recovery.
4. Reconnect behavior after the Vite websocket is interrupted.
5. Nested or shadow-boundary Widgets with independently updated styles.
6. Adapter error-boundary recovery during an update, including event cardinality.
7. Production asset-base, preload, and code-split CSS behavior.
8. Navigation during an in-flight update or hydration operation.

Each candidate should first be written as a specific contract: input mutation,
expected update policy, final DOM/style/state, error channel, and browser/CI
scope. That contract determines whether it belongs in `C`, `Y`, `U`, or `M`.
