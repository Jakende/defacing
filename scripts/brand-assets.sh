#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for size in 180 192 512 1024; do
  rsvg-convert -w "$size" -h "$size" branding/favicon.svg -o "icons/icon-$size.png"
  magick "icons/icon-$size.png" -background black -alpha remove -alpha off "icons/icon-$size.png"
done
cp icons/icon-512.png icons/icon-512-maskable.png
cp branding/favicon.svg favicon.svg
rsvg-convert branding/social.svg -o og-image.png
magick icons/icon-192.png -define icon:auto-resize=48,32,16 favicon.ico
