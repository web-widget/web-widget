# Scripts

This directory contains project maintenance scripts.

## sync-packages.js

Automatically synchronizes all packages in the `packages/` directory to the `pnpm.overrides` section of the root `package.json`.

### Features

- Automatically scans all packages in the `packages/` directory
- Reads each package's `package.json` file to get package names
- Automatically updates the `pnpm.overrides` configuration in the root `package.json`
- Preserves existing configurations for non-`@web-widget/*` packages
- Sorts all `@web-widget/*` packages alphabetically

### Usage

```bash
# Run script directly
node scripts/sync-packages.js

# Or use npm script
npm run sync-packages

# Or use pnpm
pnpm run sync-packages
```

### Example Output

```
🔍 Scanning packages directory...
📁 Packages directory: /path/to/packages
📄 Root package.json: /path/to/package.json
✅ Successfully updated pnpm.overrides in package.json
📦 Found 15 packages:
   - @web-widget/action
   - @web-widget/context
   - @web-widget/helpers
   - @web-widget/html
   - @web-widget/lifecycle-cache
   - @web-widget/middlewares
   - @web-widget/node
   - @web-widget/purify
   - @web-widget/react
   - @web-widget/schema
   - @web-widget/vite-plugin
   - @web-widget/vue
   - @web-widget/vue2
   - @web-widget/web-router
   - @web-widget/web-widget
```

### When to Use

Run this script when you:

- Add new packages to the `packages/` directory
- Rename existing packages
- Remove packages
- Want to ensure `pnpm.overrides` stays synchronized with actual packages

This will automatically update the configuration.
