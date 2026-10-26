# Virtual Try-On (app)

Live glasses try-on, ported from the M-Optic website's try-on
(`Cross-Technology/moptic-ecommerce-website`, `src/components/vto`,
`src/components/r3f`, `src/data/vto`). Same MediaPipe Face Landmarker, same
camera matching (vertical FOV 63°, near 1, far 10000 cm), same calibration
numbers, same occluder and temple-arm logic.

## How it is built

```
src/features/try-on/
  core/       shared pure TS, ported verbatim: frames, productCalibration,
              faceShapeTypes — used by the app AND by the engine
  engine/     engineHtml.ts (the WebView page) + engineBundle.generated.ts
  ui/         TryOnScreen, PermissionGate, FrameSwitcher, CaptureReviewCard
  glbDownload.ts   native GLB download with progress, in-memory cache
tryon-engine/      the WebView engine source (website code) + its own build
```

The 3D part runs in a **WebView**: the website's three.js / React Three Fiber
code, bundled by esbuild into one script and inlined into the page. The page's
base URL is `VTO_ASSET_ORIGIN` (in `engine/engineHtml.ts`), so MediaPipe's WASM,
`face_landmarker.task` and the Draco decoder load from the website's own
self-hosted copies (`/mediapipe`, `/draco`), same-origin and over https.

GLBs are downloaded natively (no CORS on native, no `/api/vto-glb` proxy) and
handed to the engine as data, which it turns into a `blob:` URL.

### Rebuilding the engine

After changing anything in `tryon-engine/src` or `src/features/try-on/core`:

```sh
cd tryon-engine
npm install      # first time only
npm run build    # writes src/features/try-on/engine/engineBundle.generated.ts
```

The generated file is committed; the app build does not need `tryon-engine`.
Metro, Jest, TypeScript and ESLint all ignore `tryon-engine/`.

## Changes from the website code

Behaviour-neutral edits only:

- `mathjs` helpers → `Math` (identical results).
- drei `useGLTF` → R3F `useLoader(GLTFLoader, url, extendGltfLoader)` (same
  self-hosted Draco + bundled Meshopt decoders).
- No CORS proxy, no HDR fallback (the live camera is always the environment
  map), no experimental worker path, no dev calibration panel.
- On-screen UI (status, hints, switcher, shutter, review card, face-shape
  badge, consent) is native React Native instead of HTML.

## Deviations from `mobile-try-on-prompt.md` (agreed before building)

- **WebView instead of native VisionCamera + MediaPipe SDK + R3F native.** The
  app is bare React Native without Expo; Hermes cannot run WebAssembly (so
  Meshopt could not decode natively); `react-native-mediapipe` is unmaintained
  and targets VisionCamera v4. The WebView runs the website's code nearly 1:1.
  Inference runs in the WebView, not on the React Native JS thread.
- **Assets come from the website host** (`moptic-ecommerce-website.vercel.app`),
  first-party, not bundled in the app. Point `VTO_ASSET_ORIGIN` at the
  production web domain once it serves `/mediapipe` and `/draco`.
- **"Add to cart" → "Ask on Telegram"**: the app has no cart; the CTA reuses
  the product page's Telegram enquiry (`src/utils/telegramInquiry.ts`).
- **GLB cache is in memory, not on disk** — needs a file-system native module.
- **Save to photos** needs a camera-roll native module (plus file system).
  Today: iOS shares the photo card through the native share sheet; Android
  shows a note instead of Save/Share.

## Not verified yet (needs real devices)

fps and time-to-first-fit on iPhone 11 / Pixel 6a / Galaxy A54, low light,
yaw/pitch/roll limits, and 20× open/close leak testing. The screen logs
`[TryOn] delegate=… inference=…ms detectionFps=… renderFps=…` every second in
development and sends `try_on_first_fit` (ms) to PostHog.
