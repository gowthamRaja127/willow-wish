#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting manual deployment to Cloudflare Pages..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Build the Angular application
echo "🏗️ Building the application in production mode..."
npm run build

# 3. Deploy to Cloudflare Pages
echo "☁️ Deploying build artifacts to Cloudflare Pages..."
# Note: This will prompt you to authenticate with Cloudflare in the browser,
# or you can set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID environment variables.
npx wrangler pages deploy dist/willow-wish-app/browser --project-name=willow-wish

echo "🎉 Deployment complete!"
