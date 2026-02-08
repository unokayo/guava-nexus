#!/bin/bash

# Fix persistent Next.js dev server cache issue
# This script ensures a completely clean dev environment

set -e

echo "🔍 Checking for running Next.js processes..."

# Kill any running Next.js dev servers
pkill -9 -f "next dev" 2>/dev/null || echo "No running Next.js processes found"

# Wait for processes to fully terminate
sleep 2

# Verify port 3000 is free
if lsof -i :3000 >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is still in use. Attempting to free it..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "🧹 Cleaning build caches..."

# Remove Next.js build cache
rm -rf .next

# Remove node_modules cache (Turbopack cache)
rm -rf node_modules/.cache

# Remove any lock files
rm -f .next/dev/lock 2>/dev/null || true

echo "✅ All caches cleared"
echo ""
echo "🚀 Ready to start fresh dev server"
echo "   Run: pnpm dev"
echo ""
echo "💡 If the error persists:"
echo "   1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)"
echo "   2. Clear browser cache in DevTools → Network → Disable cache"
echo "   3. Try Incognito/Private window"
