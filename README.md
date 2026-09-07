# Deface

Mask faces and disguise voices in photos and videos. Everything is processed locally in your browser.

**[Open Deface → defacing.space](https://defacing.space/)**

- Automatic face detection, solid masks, pixelation and manual drawing.
- Keep, remove or disguise audio.
- Compare original and edited media, then export PNG, MP4 or WebM.

Review every export: detection and speech separation can make mistakes and do not guarantee anonymity. Manual masks stay in fixed positions. Codec support and file-size limits depend on your browser and device.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run build
npm start
```

Open http://localhost:3000. Run `npm test` for automated checks.

## Self-host

Build with `npm ci && npm run build`, then run `npm start`. The server uses `PORT` (default `3000`) and `HOST` (default `0.0.0.0`). Use HTTPS in production. You can also serve `dist/` as a static site.

Set `SITE_URL` when building for another domain; the default is `https://defacing.space/`. Required models are bundled and served locally. The optional [iOS draft](ios-app/) is not a release build.

## License

[MIT](LICENSE), with separate [third-party notices](licenses/). Retain these notices when redistributing.
