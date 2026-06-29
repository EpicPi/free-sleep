#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$REPOSITORY_ROOT/deployable"

VERSION="$(node -p "require('$REPOSITORY_ROOT/server/src/serverInfo.json').version")"
ARCHIVE_NAME="free-sleep-${VERSION}.tar.gz"
STAGING_ROOT="$OUTPUT_DIR/staging"
STAGING_APP="$STAGING_ROOT/free-sleep"

rm -rf "$OUTPUT_DIR"
mkdir -p "$STAGING_APP"

rsync -a "$REPOSITORY_ROOT/" "$STAGING_APP/" \
  --exclude ".git" \
  --exclude ".github" \
  --exclude ".codex" \
  --exclude "app/node_modules" \
  --exclude "app/dist" \
  --exclude "docs" \
  --exclude "server/node_modules" \
  --exclude "server/free-sleep-data" \
  --exclude "deployable" \
  --exclude ".DS_Store"

tar -czf "$OUTPUT_DIR/$ARCHIVE_NAME" -C "$STAGING_ROOT" free-sleep
cp "$OUTPUT_DIR/$ARCHIVE_NAME" "$OUTPUT_DIR/free-sleep.tar.gz"

echo "Created $OUTPUT_DIR/$ARCHIVE_NAME"
echo "Created $OUTPUT_DIR/free-sleep.tar.gz"
