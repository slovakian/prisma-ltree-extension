#!/usr/bin/env bash
# sync.sh — bring external references up to date
#
# Usage:  bash scripts/sync.sh
# Run:    pnpm run sync-docs
#
# What it does:
#   1. Clones/updates prisma-next into .sync/prisma-next/ (gitignored)
#      Agents study this source for reference implementations (pgvector, postgis),
#      SPI types, and extension patterns.
#   2. Prints a reminder to check ltree docs — the committed reference at
#      docs/ltree/postgresql-ltree-reference.md is the baseline; PostgreSQL
#      releases may bring new operators/functions.
set -euo pipefail

cd "$(dirname "$0")/.."

PRISMA_NEXT_URL="${PRISMA_NEXT_URL:-https://github.com/prisma/prisma-next.git}"
LTREE_DOCS_URL="${LTREE_DOCS_URL:-https://www.postgresql.org/docs/current/ltree.html}"
SYNC_DIR=".sync/prisma-next"

echo "=== sync: prisma-next ==="

if [ -d "$SYNC_DIR/.git" ]; then
  echo "  existing clone found — pulling latest..."
  git -C "$SYNC_DIR" fetch --depth 1 origin main
  git -C "$SYNC_DIR" reset --hard FETCH_HEAD
else
  echo "  cloning prisma-next (shallow, no blobs)..."
  mkdir -p "$(dirname "$SYNC_DIR")"
  git clone --depth 1 --filter=blob:none "$PRISMA_NEXT_URL" "$SYNC_DIR"
fi

echo "  prisma-next ready at $SYNC_DIR"
echo "  key reference dirs:"
echo "    $SYNC_DIR/packages/3-extensions/pgvector/"
echo "    $SYNC_DIR/packages/3-extensions/postgis/"
echo "    $SYNC_DIR/packages/3-extensions/paradedb/"
echo "    $SYNC_DIR/docs/"
echo "    $SYNC_DIR/skills/extension-author/"

echo ""
echo "=== sync: ltree docs ==="
echo "  note: ltree docs change rarely (PG release cadence)."
echo "  committed reference: docs/ltree/postgresql-ltree-reference.md"
echo "  current online:      $LTREE_DOCS_URL"
echo "  to refresh: use the webfetch tool or visit the URL above."

echo ""
echo "=== sync complete ==="
