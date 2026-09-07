# Deface

Private photo and video editing. Node.js serves the app; face detection, masking, speech processing and export run in the browser. Selected media is not uploaded.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run build
npm test
npm start
```

Open http://localhost:3000. Rebuild after source changes.

## Hosting

Build command: `npm ci && npm run build`. Start command: `npm start`.
The server accepts `PORT` (default 3000) and `HOST` (default 0.0.0.0), serves only `dist/`, and accepts only GET/HEAD requests. Use HTTPS in production. Alternatively, serve `dist/` through a static host.

Public metadata uses **https://defacing.space/** from `site.config.json`. Override with `SITE_URL` at build time. `SITE_URL="" npm run build` generates a non-indexable private build. Canonical URL, social metadata, structured data, robots.txt and sitemap.xml are generated during the build.

## Editor

- Import a photo or video. Detect faces automatically or draw with Brush and Rectangle.
- Apply solid masks with a custom colour, or pixelation.
- Switch between Original, Edited and the completed Export in the main preview.
- Keep audio, remove audio or disguise estimated speech. Preview mute does not change export settings.
- Undo/redo: Command+Z / Shift+Command+Z on macOS; Ctrl+Z / Ctrl+Shift+Z elsewhere.
- Export PNG, MP4 or WebM. Video and audio codecs depend on browser support.

## Processing limits

Automatic detection can miss faces. Review every export. Manual drawings remain at fixed relative positions throughout a video; they do not track movement. Live detection may lag; export processes every frame. Brief detection gaps are bridged for up to 0.2 seconds.

Voice disguise estimates speech with DeepFilterNet3, shifts its pitch and mixes residual audio back in. Separation is approximate and can affect other sounds. It does not guarantee anonymity. Linked attenuation avoids increasing overall PCM peak or RMS level. Mono/stereo clips are supported within an estimated 256 MB audio-buffer budget.

Only the primary video/audio tracks are exported; extra tracks and subtitles are omitted. Animated images are treated as still frames. Exports are buffered in memory, so large files can exceed device limits. No upscaling is performed.

Core assets are cached after loading. Speech assets are cached on first use. Selected media is not cached. Browser storage can be evicted.

## Development

- `src/`: editor, media processing and design system.
- `scripts/`: build, metadata and icon generation.
- `branding/`, `icons/`: pixel logo sources and generated website icons.
- `models/`, `ort/`, `vendor/`: self-hosted detection and speech assets; required for local processing.
- `tests/`: automated geometry, history, hosting, audio and metadata checks.
- `.skills/`: project branding and metadata instructions.
- `ios-app/`: retained native draft; see its README before native work.

Regenerate website icons with `bash scripts/brand-assets.sh` (requires librsvg and ImageMagick). Increment the service-worker cache version in `sw.js` for releases.

Build and seven automated tests pass. Chromium checks cover custom mask colours, integrated export preview and speech export. Safari, Firefox, physical iOS devices, long clips and external hosting are not yet verified.

## New repository

This directory starts a new local Git history on `main`, without a remote. Generated builds, dependencies, local settings and signing files are ignored.

Create an empty repository on GitHub, without an initial README, license or .gitignore. Then run from this directory, replacing the placeholder URL:

```sh
git add .
git commit -m "Initial Deface web app"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

No remote repository is created or published by the build.

## Licenses

Retain `LICENSE` (MIT, original implementation copyright © 2026 Ben Pohl) and `licenses/`. Bundled third-party notices remain required in a new repository. Mediabunny is MPL-2.0; its unmodified source is available in the pinned npm package, and its license is copied into the build. Other components retain their respective notices. Dependency metadata may identify the original package repositories.
