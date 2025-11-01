#!/bin/bash

# Deployment script

echo "🚀 Deploying InteractiveVerseFocus..."

# Check if environment is set
if [ -z "$DEPLOY_ENV" ]; then
  echo "❌ DEPLOY_ENV not set. Use: DEPLOY_ENV=production ./scripts/deploy.sh"
  exit 1
fi

echo "📦 Deploying to: $DEPLOY_ENV"

# Build all packages
echo "🏗️ Building packages..."
pnpm build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

# Deploy backend (example for different platforms)
echo "🌐 Deploying backend..."

case "$DEPLOY_ENV" in
  vercel)
    cd packages/backend && vercel --prod
    ;;
  railway)
    cd packages/backend && railway up
    ;;
  fly)
    cd packages/backend && flyctl deploy
    ;;
  *)
    echo "❌ Unknown deployment environment: $DEPLOY_ENV"
    exit 1
    ;;
esac

if [ $? -eq 0 ]; then
  echo "✅ Deployment successful!"
else
  echo "❌ Deployment failed!"
  exit 1
fi
