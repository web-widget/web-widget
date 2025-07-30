#!/bin/bash

# Generic script to run benchmarks with specific Node.js versions
# Usage: ./run-with-node.sh <version>
# Example: ./run-with-node.sh 18

set -e

# Check if version is provided
if [ $# -eq 0 ]; then
    echo "❌ Node.js version not provided"
    echo "Usage: ./run-with-node.sh <version>"
    echo "Example: ./run-with-node.sh 18"
    echo ""
    echo "Supported versions: 18, 20, 22, 24"
    exit 1
fi

VERSION=$1

# Validate version
if [[ ! "$VERSION" =~ ^(18|20|22|24)$ ]]; then
    echo "❌ Unsupported Node.js version: $VERSION"
    echo "Supported versions: 18, 20, 22, 24"
    exit 1
fi

echo "🚀 Setting up Node.js $VERSION.x for benchmarks..."

# Check if fnm is available (preferred)
if command -v fnm &> /dev/null; then
    echo "📦 Using fnm to switch to Node.js $VERSION..."
    eval "$(fnm env)"
    fnm use $VERSION
    
    echo "✅ Node.js version: $(node --version)"
    echo "✅ NPM version: $(npm --version)"
    
    echo "🎯 Running benchmarks with Node.js $VERSION.x..."
    pnpm benchmark

# Check if nvm is available
elif command -v nvm &> /dev/null; then
    echo "📦 Using nvm to switch to Node.js $VERSION..."
    nvm use $VERSION
    
    echo "✅ Node.js version: $(node --version)"
    echo "✅ NPM version: $(npm --version)"
    
    echo "🎯 Running benchmarks with Node.js $VERSION.x..."
    pnpm benchmark

# Check if volta is available
elif command -v volta &> /dev/null; then
    echo "📦 Using volta to run with Node.js $VERSION..."
    volta run node@$VERSION -- pnpm benchmark

else
    echo "❌ No Node.js version manager found (fnm, nvm, or volta)"
    echo "💡 Please install one of:"
    echo "   - fnm: curl -fsSL https://fnm.vercel.app/install | bash"
    echo "   - nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "   - volta: curl https://get.volta.sh | bash"
    exit 1
fi 