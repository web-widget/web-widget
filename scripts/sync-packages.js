#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');
const rootPackageJsonPath = path.join(rootDir, 'package.json');

/**
 * Get all package names from packages directory
 */
function getAllPackageNames() {
  const packages = [];

  // Read packages directory
  const packageDirs = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  // Read each package's package.json
  for (const packageDir of packageDirs) {
    const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );
        if (packageJson.name) {
          packages.push(packageJson.name);
        }
      } catch (error) {
        console.warn(
          `Warning: Could not read package.json for ${packageDir}:`,
          error.message
        );
      }
    } else {
      console.warn(`Warning: No package.json found in ${packageDir}`);
    }
  }

  return packages.sort();
}

/**
 * Update pnpm.overrides in root package.json
 */
function updatePnpmOverrides() {
  // Read root package.json
  const rootPackageJson = JSON.parse(
    fs.readFileSync(rootPackageJsonPath, 'utf8')
  );

  // Get all package names
  const packageNames = getAllPackageNames();

  // Ensure pnpm.overrides exists
  if (!rootPackageJson.pnpm) {
    rootPackageJson.pnpm = {};
  }
  if (!rootPackageJson.pnpm.overrides) {
    rootPackageJson.pnpm.overrides = {};
  }

  // Save existing non-@web-widget/* configurations
  const existingOverrides = { ...rootPackageJson.pnpm.overrides };
  const nonWebWidgetOverrides = {};

  for (const [key, value] of Object.entries(existingOverrides)) {
    if (!key.startsWith('@web-widget/')) {
      nonWebWidgetOverrides[key] = value;
    }
  }

  // Rebuild overrides with @web-widget/* packages at the front
  const newOverrides = {};

  // Add all @web-widget/* packages
  for (const packageName of packageNames) {
    newOverrides[packageName] = 'workspace:*';
  }

  // Add non-@web-widget/* configurations
  Object.assign(newOverrides, nonWebWidgetOverrides);

  // Update package.json
  rootPackageJson.pnpm.overrides = newOverrides;

  // Write back to file
  fs.writeFileSync(
    rootPackageJsonPath,
    JSON.stringify(rootPackageJson, null, 2) + '\n'
  );

  console.log('✅ Successfully updated pnpm.overrides in package.json');
  console.log(`📦 Found ${packageNames.length} packages:`);
  packageNames.forEach((name) => console.log(`   - ${name}`));
}

// Main function
function main() {
  try {
    console.log('🔍 Scanning packages directory...');
    console.log('📁 Packages directory:', packagesDir);
    console.log('📄 Root package.json:', rootPackageJsonPath);
    updatePnpmOverrides();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

main();
