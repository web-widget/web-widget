#!/usr/bin/env node

/**
 * Test script to verify framework compatibility detection
 */

console.log('🔍 Testing Framework Compatibility Detection');
console.log('==========================================\n');

console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}\n`);

// Framework names (direct mapping to file names)
const frameworkNames = [
  'hono',
  'web-router',
  'web-router#manifest',
  'web-router#direct',
  'urlpattern-simple',
  'express',
  'fastify',
  'koa',
];

const supportedFrameworks = [];

for (const frameworkName of frameworkNames) {
  try {
    // Load adapter directly to test compatibility with standard URL encoding
    const fileName = encodeURIComponent(frameworkName);
    const adapterModule = await import(`../src/frameworks/${fileName}.js`);
    const adapter = adapterModule.default;

    if (adapter && (!adapter.isSupported || adapter.isSupported())) {
      supportedFrameworks.push(frameworkName);
      console.log(`✅ ${frameworkName}: Supported`);
    } else {
      console.log(`❌ ${frameworkName}: Not supported`);
    }
  } catch (error) {
    console.log(`❌ ${frameworkName}: Error - ${error.message}`);
  }
}

console.log('\n✅ Supported frameworks:');
supportedFrameworks.forEach((framework) => {
  console.log(`  - ${framework}`);
});

if (supportedFrameworks.length === 0) {
  console.log('\n⚠️   No frameworks are supported in this environment');
} else {
  console.log(`\n📊 Total supported frameworks: ${supportedFrameworks.length}`);
}

console.log('\n✨  Compatibility test completed');
