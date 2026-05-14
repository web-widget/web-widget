# Scripts

This directory contains project maintenance scripts.

## Git hooks (`scripts/git-hooks/`)

Installed via **`simple-git-hooks`** (runs on `pnpm install`).

| Hook           | Behavior                                                                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pre-commit** | If `pnpm-workspace.yaml` is staged → `examples-catalog:materialize` and `git add` `examples/*/package.json`. If any `packages/*/package.json` is staged → `pnpm-overrides:sync` and `git add` root `package.json`. Then **`nano-staged`** (Prettier + finepack). |
| **post-merge** | After merge/pull, if the merge touched `pnpm-workspace.yaml` or any `packages/*/package.json`, runs the same sync scripts and prints a note to review unstaged changes.                                                                                          |

Set `SKIP_SIMPLE_GIT_HOOKS=1` to skip hooks when needed.

## sync-pnpm-overrides.js

Regenerates the root **`pnpm.overrides`** block so every `@web-widget/*` package from `packages/` is pinned to **`workspace:*`**. Non–`@web-widget/*` override entries (for example `catalog:` pins) are left as-is.

Run after adding, renaming, or removing packages under `packages/`.

```bash
node scripts/sync-pnpm-overrides.js
pnpm pnpm-overrides:sync
```

## materialize-examples-catalog.js

Writes **concrete semver ranges** from `pnpm-workspace.yaml` **`catalog:`** into `examples/*/package.json` for any dependency name that exists in both places. Keeps examples usable in sandboxes that cannot resolve the `catalog:` protocol.

```bash
node scripts/materialize-examples-catalog.js
pnpm examples-catalog:materialize
pnpm examples-catalog:check   # CI: fail if examples drift from catalog
```

### Example output (sync-pnpm-overrides)

```
🔍 Scanning packages directory...
📁 Packages directory: /path/to/packages
📄 Root package.json: /path/to/package.json
✅ Successfully updated pnpm.overrides in package.json
📦 Found 15 packages:
   - @web-widget/action
   ...
```
