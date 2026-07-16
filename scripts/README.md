# Scripts

This directory contains project maintenance scripts.

## Git hooks (`scripts/git-hooks/`)

Installed via **`simple-git-hooks`** (runs on `pnpm install`).

| Hook           | Behavior                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pre-commit** | If `pnpm-workspace.yaml` is staged, runs `examples-catalog:materialize` and stages `examples/*/package.json`. Then runs **`nano-staged`** (Prettier + finepack). |
| **post-merge** | After merge/pull, if the merge touched `pnpm-workspace.yaml`, runs `examples-catalog:materialize` and prints a note to review unstaged changes.                  |

Set `SKIP_SIMPLE_GIT_HOOKS=1` to skip hooks when needed.

## materialize-examples-catalog.js

Writes **concrete semver ranges** from `pnpm-workspace.yaml` **`catalog:`** into `examples/*/package.json` for any dependency name that exists in both places. Keeps examples usable in sandboxes that cannot resolve the `catalog:` protocol.

```bash
node scripts/materialize-examples-catalog.js
pnpm examples-catalog:materialize
pnpm examples-catalog:check   # CI: fail if examples drift from catalog
```

## Published package manifests

Workspace package exports use the `development` condition to resolve source
files locally. `published-package-manifests.js` replaces those exports with
`publishConfig.exports` when provided and otherwise removes `development`
conditions recursively. Package validation applies this transformation in an
isolated temporary workspace; publishing restores the original manifests after
the command, including when it fails.

```bash
pnpm publint       # Pack and validate every published package
pnpm test:scripts  # Test manifest transformation and restoration
```

`publish.js` uses the same transformation before running Changesets, keeping
the validated tarball shape and the release path consistent.
