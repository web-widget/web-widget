#!/usr/bin/env bash
set -euo pipefail

# Configure npm Trusted Publishing (OIDC) for all @web-widget/* packages.
# Requires: npm >= 11.10.0, npm login, account 2FA enabled.
#
# Usage:
#   npm login
#   bash scripts/setup-npm-trusted-publishing.sh
#
# On the first 2FA prompt, enable "skip 2FA for 5 minutes" to batch the rest.

REPO="${REPO:-web-widget/web-widget}"
WORKFLOW_FILE="${WORKFLOW_FILE:-release.yml}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

require_npm() {
  local npm_version
  npm_version="$(npm --version)"
  if ! node -e "
    const [major, minor] = process.argv[1].split('.').map(Number);
    process.exit(major > 11 || (major === 11 && minor >= 10) ? 0 : 1);
  " "$npm_version"; then
    echo "npm >= 11.10.0 is required (current: $npm_version). Run: npm install -g npm@latest" >&2
    exit 1
  fi
}

collect_packages() {
  node <<'NODE'
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const packagesDir = join(process.cwd(), 'packages');
const names = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const pkgPath = join(packagesDir, entry.name, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      return typeof pkg.name === 'string' && pkg.name.startsWith('@web-widget/')
        ? pkg.name
        : null;
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .sort();

if (names.length === 0) {
  console.error('No @web-widget/* packages found under packages/.');
  process.exit(1);
}

for (const name of names) {
  console.log(name);
}
NODE
}

main() {
  require_npm

  if ! npm whoami >/dev/null 2>&1; then
    echo "Not logged in to npm. Run: npm login" >&2
    exit 1
  fi

  local packages=()
  while IFS= read -r pkg; do
    packages+=("$pkg")
  done < <(collect_packages)

  echo "Configuring Trusted Publishing for ${#packages[@]} packages"
  echo "  repo:     $REPO"
  echo "  workflow: $WORKFLOW_FILE"
  echo

  for pkg in "${packages[@]}"; do
    echo "→ $pkg"
    npm trust github "$pkg" \
      --repo "$REPO" \
      --file "$WORKFLOW_FILE" \
      --allow-publish \
      --yes
    sleep "$SLEEP_SECONDS"
  done

  echo
  echo "Done. Verify one package:"
  echo "  npm trust list @web-widget/react"
}

main "$@"
