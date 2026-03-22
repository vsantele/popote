#!/bin/bash
# Popote Backend — Quick Start Script (Linux/macOS)
# Run this after downloading PocketBase executable to backend/ directory

echo "🚀 Starting Popote Backend..."

# Check if PocketBase executable exists
if [ ! -f "./pocketbase" ]; then
    echo "❌ PocketBase not found!"
    echo ""
    echo "Please download PocketBase:"
    echo "  https://github.com/pocketbase/pocketbase/releases"
    echo ""
    echo "Extract 'pocketbase' to the backend/ directory and make it executable:"
    echo "  chmod +x pocketbase"
    exit 1
fi

# Check if executable
if [ ! -x "./pocketbase" ]; then
    echo "⚙️  Making PocketBase executable..."
    chmod +x ./pocketbase
fi

echo "✅ PocketBase executable found"

# Start PocketBase
echo ""
echo "Starting PocketBase server..."
echo "  - API: http://127.0.0.1:8090/api"
echo "  - Admin UI: http://127.0.0.1:8090/_/"
echo ""
echo "Press Ctrl+C to stop"
echo ""

./pocketbase serve
