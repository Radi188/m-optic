# Virtual Try-On (app, native)

Live glasses try-on, ported from the M-Optic website's try-on
(`src/components/vto`, `src/components/r3f`, `src/data/vto`). Same MediaPipe
Face Landmarker (0.10.35), same camera matching (vertical FOV 63°, near 1,
far 10000 cm), same calibration numbers, same occluder, temple-arm and 1€
smoothing logic. No WebView.

```
camera thread                         JS thread (render on new pose only)
VisionCamera frame output (480×640)   R3F native + three.js on expo-gl
  └─ worklet: landmarker.detect()  →  readLatest() → matrix + 478 landmarks
     (MediaPipe, GPU→CPU fallback)       Scene → Glasses + Occluder
```

## Layout

```
src/features/try-on/
  core/      pure TS ported from the website: frames, productCalibration,
             oneEuroFilter, templeSplay, faceShape, coverGeometry, and the
             MediaPipe mesh tables (faceMeshTopology.generated.ts)
  native/    react-native-moptic-vto — a Nitro module (iOS Swift / Android
             Kotlin): MediaPipe Face Landmarker as a VisionCamera v5
             frame-processor plugin, and the photo-card compositor.
             Bundles face_landmarker.task and the photo-card logo.
  render/    Scene, Glasses, Occluder (website ports),
             TryOnCanvas (camera rig + on-demand render loop + snapshot),
             buildGlasses, faceMeshOccluder, glbCache / glbLoader
  ui/        TryOnScreen, PermissionGate, FrameSwitcher, CaptureReviewCard
  store.ts   zustand, the website's vtoStore minus the dev-panel fields
  useFaceTracking.ts
```

## Coordinate space (do not "fix" calibration numbers)

- Frames are analysed **upright and unmirrored** (`enablePhysicalBufferRotation`,
  `mirrorMode="off"`); any leftover rotation is applied natively before
  inference.
- Outputs follow the **interface** orientation (`orientationSource="interface"`),
  like the preview. With VisionCamera's default (`'device'`) a tablet standing
  in landscape rotated the analysed frames but not the preview, so the glasses
  missed the eyes.
- `PerspectiveCamera` fov 63 / near 1 / far 10000, `aspect` = the analysed
  frame's aspect (reported by the plugin), cover-fitted like the preview.
  Instead of an oversized cover box, `setViewOffset` renders only the visible
  window of the same frustum (`core/coverGeometry.ts`).
- Preview and GL view are each shown mirrored exactly once. The GL view always
  gets `scaleX(-1)`; the preview gets it on iOS only, because Android's CameraX
  `PreviewView` already mirrors the front camera (it ignores `mirrorMode`).
  Mirroring it again there put the glasses on the opposite side of the face.
  (Android preview uses `implementationMode="compatible"` so transforms apply.)

## Loading speed

- `face_landmarker.task` ships in the app; the landmarker is created off the
  JS thread while the camera starts.
- GLBs are downloaded directly (no CORS → no `/api/vto-glb` proxy) into
  `Paths.cache/vto-glb-v1/<url-hash>/`, and their ~25 embedded textures are
  unpacked to files once, so later opens are disk-only and expo-gl decodes the
  textures natively (R3F native's default path base64-encodes every texture on
  the JS thread). expo-gl decodes texture files with stb_image, which has no
  WebP, and every catalog GLB uses `EXT_texture_webp` — so `prepare` converts
  WebP textures to PNG natively (`transcodeToPng`) and drops the extension.
- iOS downloads use a foreground `URLSession` (expo-file-system defaults to a
  background one there).
- The product page prefetches the selected colourway's GLB; after the first
  fitted frame the try-on prefetches the other colourways.
- The TryOn screen is lazy-loaded, so three.js is not evaluated at app start.
- Rendering is on demand (one frame per new pose, ~camera rate).

## Rebuilding the native module

After changing `native/specs/*.nitro.ts`:

```sh
cd src/features/try-on/native && ../../../../node_modules/.bin/nitrogen
cd ios && pod install   # from the repo root
```

## Deviations from `mobile-try-on-prompt.md`

- **Draco / Meshopt are not decoded.** No catalog GLB uses them (all 166 were
  checked: they use quantized meshes and WebP/PNG/JPEG textures), and Hermes
  has no WebAssembly. A GLB that *requires* either is rejected with a clear
  error and the "Couldn't load this frame's 3D model" hint.
- **Environment map** is three's procedural `RoomEnvironment`, not the live
  camera (no GPU bridge from the native preview into three).
- **Occluder** uses the face mesh + procedural head (the website's fallback
  when `occluder.glb` is missing); no `occluder.glb` is shipped.
- **"Add to cart" → "Ask on Telegram"**: the app has no cart.
- **expo-media-library** is called through its native module: its JS entry
  imports `expo`, which needs Expo's Metro config (the app uses RN's).
- Expo SDK 56 raised the iOS minimum to **16.4** (was 15.1).

## Not verified yet (needs real devices)

fps and time-to-first-fit on iPhone 11 / Pixel 6a / Galaxy A54, low light,
yaw/pitch/roll limits, 2 mm parity with the website, photo crop alignment, and
20× open/close leak testing. In development the screen logs
`[TryOn] delegate=… inference=…ms detectionFps=… renderFps=…` every second and
`first fitted frame after … ms`; `try_on_first_fit` (ms) goes to PostHog.
