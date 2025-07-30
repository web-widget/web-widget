#!/usr/bin/env node

/**
 * Test script to verify framework compatibility detection
 */

import { getSupportedFrameworks } from './src/frameworks/index.js';

console.log('🔍 Testing Framework Compatibility Detection');
console.log('==========================================\n');

console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}\n`);

try {
  const supportedFrameworks = getSupportedFrameworks();
  console.log('✅ Supported frameworks:');
  supportedFrameworks.forEach((framework) => {
    console.log(`  - ${framework}`);
  });

  if (supportedFrameworks.length === 0) {
    console.log('\n⚠️  No frameworks are supported in this environment');
  } else {
    console.log(
      `\n📊 Total supported frameworks: ${supportedFrameworks.length}`
    );
  }
} catch (error) {
  console.error('❌ Error during compatibility detection:', error.message);
}

console.log('\n✨ Compatibility test completed');
