#!/bin/bash

# Build script for browser extension

echo "🔨 Building InteractiveVerseFocus Extension..."

# Navigate to extension directory
cd "$(dirname "$0")/../packages/extension" || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Build the extension
echo "🏗️ Building extension..."
pnpm build

if [ $? -eq 0 ]; then
  echo "✅ Extension built successfully!"
  echo "📂 Output: packages/extension/dist"
  echo ""
  echo "To load in Chrome:"
  echo "1. Open chrome://extensions/"
  echo "2. Enable 'Developer mode'"
  echo "3. Click 'Load unpacked'"
  echo "4. Select: $(pwd)/dist"
else
  echo "❌ Build failed!"
  exit 1
fi
