#!/usr/bin/env bash
# Sync the built editor and all bundled assets into Capacitor.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
npm --prefix "$HERE/.." run build
mkdir -p "$HERE/www"
rsync -a --delete "$HERE/../dist/" "$HERE/www/"
echo "Web assets synced to $HERE/www"
