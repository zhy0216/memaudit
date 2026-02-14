#!/bin/bash
# Run memaudit example

set -e

# Check for API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable is not set"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Build if needed
if [ ! -f "$PROJECT_DIR/dist/cli.js" ]; then
    echo "Building memaudit..."
    cd "$PROJECT_DIR" && npm run build
fi

# Run audit
echo "Running memory audit..."
node "$PROJECT_DIR/dist/cli.js" audit "$PROJECT_DIR/data/sample-dataset.json" --output "$PROJECT_DIR/audit-results"

echo ""
echo "Done! Check audit-results/report.md for the full report."
