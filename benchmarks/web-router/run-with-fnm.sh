#!/bin/bash

# Script to run benchmarks with Node.js 24.4.1 using fnm
echo "🚀 Setting up Node.js 24.4.1 for benchmarks using fnm..."

# Load fnm
eval "$(fnm env)"

# Use Node.js 24.4.1
echo "📦 Switching to Node.js 24.4.1..."
fnm use 24.4.1

# Check Node.js version
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Run benchmarks
echo "🎯 Running benchmarks with Node.js 24.4.1..."
pnpm benchmark 