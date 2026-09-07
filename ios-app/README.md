# Deface iOS draft

Capacitor bundles the current web editor, models and monochrome branding. Import uses the system file picker; completed exports use Filesystem cache and the native Share sheet. Theme changes also update the status bar. The native launch screen and web startup animation use the same wordmark.

## Build assets

Requires Node.js 22+, Xcode and CocoaPods for a native build.

```sh
npm ci
cd ios-app
npm ci
npm run sync
npm run open
```

The existing Xcode project is retained. Do not run `cap add ios` again. `sync-www.sh` builds and copies the complete parent application. The bundle identifier remains `city.bias.deface`; choose your own identifier and signing team before distribution. Previous signing-team settings have been removed.

## Device verification required

This is a draft, not an App Store release. Test file import, PNG/MP4/WebM export, native sharing, codec availability, face detection, speech processing, memory use, safe areas and offline startup on physical devices. WebCodecs and WASM support vary by iOS version. The web application's limits also apply here.

Models are bundled; a service worker is not required on the Capacitor scheme. No external media processing is configured. Native compilation, signing and App Store eligibility require separate validation.

The retained Capacitor 6 development CLI has audit findings in its tar dependency. Do not distribute from this draft until the native toolchain has been upgraded and validated. Core web production dependencies currently pass npm audit.

The obsolete Podfile.lock was removed after plugin cleanup. The next native `npm run sync` requires CocoaPods to resolve dependencies and generate a current lockfile; commit that lockfile after native validation.
