# Task: Build the Virtual Try-On (VTO) feature in the M-Optic React Native app

You are adding live glasses virtual try-on to the M-Optic React Native app. The
M-Optic website (Next.js) already ships a working try-on. Your job is to bring it
to iOS and Android so it behaves the same way, using the same product data and
the same calibration numbers. Port the website's code. Do not redesign it.

## 1. Reference implementation (read these first)

The website repo is `m-optic-website`. Before writing any code, read:

| What | Path |
|---|---|
| Architecture, how frames and occluders are authored | `src/components/vto/README.md` |
| Face tracking setup (worker, GPU delegate, options) | `src/hooks/faceLandmarker.worker.ts`, `src/hooks/useFaceTracking.ts` |
| Camera matching (vertical FOV 63°, near 1, far 10000, units in cm) | `src/components/vto/faceTracker.ts` |
| Head-pose smoothing (1€ filter) | `src/components/vto/oneEuroFilter.ts`, `src/components/r3f/Scene.tsx` |
| Frame anchoring, sizing, temple arms | `src/components/r3f/Glasses.tsx` |
| Head occluder (hides temple arms behind the head) | `src/components/r3f/Occluder.tsx`, `src/components/vto/faceMeshOccluder.ts` |
| GLB loading and normalisation, lens material | `src/components/vto/buildGlasses.ts`, `src/components/vto/gltfDecoders.ts` |
| Temple-arm splay solved per head width | `src/components/vto/templeSplay.ts` |
| Calibration per frame shape, frame width from the API | `src/data/vto/product-calibration.ts`, `src/data/vto/frames.ts` |
| Face-shape detection and frame recommendations | `src/components/vto/faceShape.ts`, `src/components/r3f/FaceShapeDetector.tsx` |
| Captured photo card | `src/components/vto/photoCard.ts`, `src/components/r3f/VirtualTryOnR3F.tsx` |
| Tunable state and defaults | `src/store/vtoStore.ts` |

Port these modules as plain TypeScript. They don't depend on the DOM, so they
should copy over unchanged or almost unchanged: `oneEuroFilter`, `faceShape`
(the maths), `templeSplay`, `product-calibration`, `frames` (types and constants).
Keep them in one shared folder, e.g. `src/features/try-on/core/`.

## 2. Required tech stack

- **Expo dev build / bare React Native.** The feature needs native modules, so
  it won't run in Expo Go.
- **Camera:** `react-native-vision-camera` (v4+), front camera, with frame processors.
- **Face tracking:** **MediaPipe Face Landmarker** on both platforms. Run it
  natively: the MediaPipe Tasks iOS/Android SDK, called through a Vision Camera
  frame-processor plugin or an existing wrapper such as `react-native-mediapipe`.
  If no wrapper is maintained, write a small Expo module.
  - Options must match the web: `runningMode: VIDEO/LIVE_STREAM`, `numFaces: 1`,
    `outputFacialTransformationMatrixes: true`, GPU delegate with a CPU fallback.
  - Each frame must return the **478 normalized landmarks** and the **4×4 facial
    transformation matrix** (column-major, centimetres).
  - **Don't use ARKit / ARCore Augmented Faces.** They use different units
    (metres), a different origin and a different mesh. Every calibration number in
    `product-calibration.ts` is in MediaPipe's canonical-face space and would stop
    working.
- **Rendering:** `three` + `@react-three/fiber/native` + `expo-gl`. Use a
  transparent GL view layered over the camera preview. Load GLBs with
  `GLTFLoader`, with **Draco and Meshopt decoders** working in React Native.
  Most catalog GLBs are compressed, and the web self-hosts Draco in `/public/draco`.
- **State:** `zustand`, the same shape as `vtoStore.ts`, minus the dev-only tuning fields.
- **Server data:** the existing API client / TanStack Query setup in the app.

If any of these won't work, stop and explain why before you swap in something else.

## 3. Coordinate-space rules (most bugs come from here)

1. The three.js `PerspectiveCamera` must match MediaPipe's virtual camera:
   **vertical FOV 63°, near 1, far 10000, units in cm.** Set `aspect` to the
   **aspect of the analysed frame**, not the screen's, and crop the GL view the
   same way the preview is cropped (cover-fit). If you don't, the glasses drift
   whenever the face moves off-centre.
2. **Mirroring:** MediaPipe analyses the raw, unmirrored frames, and the glasses
   are rendered in that same space. Then mirror the camera preview and the GL view
   together, once, as a single composite (on web it's `scaleX(-1)` on a wrapper).
   Don't negate X in the matrix.
3. **Orientation:** Android front-camera frames usually arrive rotated 270°.
   Rotate or normalise them before inference so landmarks match what's on screen.
   Lock the screen to portrait.
4. Apply the pose matrix to a parent group. The glasses and the occluder are both
   children of that group, so they move together.

## 4. Behaviour to reproduce

**Fit and tracking**
- Anchor the bridge to **landmark 168** (the nasion), deprojected at its real
  depth. Use the nose-ridge landmarks `[168, 6, 197, 195, 5]` to push the frame
  clear of the nose, as `Glasses.tsx` does.
- Size: use `measurements.hinge_to_hinge` (mm) if it is plausible (100–180 mm,
  parent product as fallback; see `frameWidthMmForProduct`). If not, fall back to
  outer-eye distance (landmarks **33 / 263**) × **1.5**.
- Look up calibration with `calibrationForProduct(product)`, matched on
  `frame_shape.id` first and the regex second. The regex covers English **and
  Khmer** names. Apply `positionOffset`, `scaleMultiplier`, `rotationOffset`
  (includes pantoscopic tilt), `bridgeOffset`.
- Smooth position (3 filters) and quaternion (4 filters, hemisphere-aligned) with
  the 1€ filter, defaults `minCutoff 1.0`, `beta 0.5`, `dcutoff 1.0`. Snap with no
  smoothing on the first frame after the face is found again.
- Hide the glasses as soon as the face is lost, and show a "Position your face in
  the frame" hint.

**Glasses rendering**
- Meshes whose names contain `lens`/`lense` get the transparent glass material,
  as in `buildGlasses.ts`. Add an environment map so metal and acetate look real.
- Temple arms: support `templeArmsMode` `hidden | fade | full` (product default
  `fade`). Solve splay per head width (`templeSplay.ts`), falling back to
  `templeSplayDeg`.
- Head occluder: draw a depth-only shell (`colorWrite: false`, `renderOrder` 0
  before the glasses at 1) with the face-local front clipping plane and
  `OCCLUDER_CONFIG` values. If `occluder.glb` is missing, keep going without
  occlusion. Don't crash.

**Product integration**
- Add a "Try On" button on the product detail screen. Show it only when the
  selected colourway has at least one asset with `type === '3d_model' && format
  === 'glb'` (`buildProductVTOFrames`).
- Each colourway has its own GLB. Switching colour inside try-on swaps the model
  without restarting the camera.
- Show a frame/colour switcher strip at the bottom, the product name and price,
  and an "Add to cart" CTA that uses the app's existing cart flow.
- On native there's no CORS, so load GLB URLs **directly**. Don't use the web
  `/api/vto-glb` proxy. Cache downloaded GLBs on disk (`expo-file-system`), keyed
  by URL.

**Face shape (optional but expected)**
- Run `classifyFaceShape` on stable frames, the same way `FaceShapeDetector.tsx`
  does. Show the result and `FRAME_RECOMMENDATIONS`, and label it as a style
  suggestion, not a measurement.

**Photo capture**
- A shutter button captures the camera frame with the glasses composited on top.
  Grab the GL view's pixels, then composite them over the camera photo with the
  same crop and mirroring as the screen.
- Show a review card that matches `photoCard.ts`: the photo on a white card with
  the M-Optic logo, frame name, colour and lens. Offer **Save** (`expo-media-library`)
  and **Share** (the native share sheet). Save at full resolution.

## 5. UX, permissions, i18n

- Ask for camera permission only when the user taps "Try On". Write a clear
  rationale screen. If permission is denied, show a "Open Settings" button.
  Add `NSCameraUsageDescription` and `NSPhotoLibraryAddUsageDescription`
  (iOS) and the Android camera permission.
- **All strings in English and Khmer (`en`, `km`)**, from the app's existing
  i18n files. Reuse the website's message keys where they exist.
- Loading states: model downloading (show progress), tracker starting, and no
  face found.
- Release the camera and GL context when the screen loses focus or the app goes
  to the background.

## 6. Performance targets

- Tracking + render at **≥ 30 fps on an iPhone 11 / mid-range Android (e.g.
  Pixel 6a, Galaxy A54)**. Time from tapping "Try On" to the first fitted frame
  should be **< 2.5 s** when the model is cached.
- Run inference in the frame processor (worklet / native thread), not on the JS
  thread. Send only the matrix and the landmarks the renderer needs across the
  bridge. Don't send image data.
- Run inference at about 256–480 px input and render at full resolution.
- If the GPU delegate fails, fall back to CPU, and log which delegate is active.

## 7. Suggested structure

```
src/features/try-on/
  core/            # ported pure TS: oneEuroFilter, faceShape, templeSplay, calibration, frames
  native/          # MediaPipe frame-processor plugin / Expo module (iOS + Android)
  render/          # R3F native scene: Glasses, Occluder, camera matching, GLB loader + decoders
  ui/              # TryOnScreen, FrameSwitcher, CaptureReviewCard, PermissionGate
  store.ts         # zustand
  useFaceTracking.ts
```

## 8. Delivery plan (one PR or commit per step, each one runnable)

1. Native MediaPipe plugin: log the landmarks count and the matrix at fps on both platforms.
2. Camera + GL overlay with camera matching: render a debug axis/box locked to the
   head through yaw, pitch and roll on both platforms.
3. Load the GLB (with Draco/Meshopt), apply calibration and anchoring, add 1€ smoothing.
4. Occluder + temple-arm modes/splay.
5. Product integration (button gating, colourway switching, cart CTA, GLB cache).
6. Photo capture + review card + save/share.
7. Face shape, i18n pass, permission flows, performance pass.

## 9. Acceptance criteria

- [ ] The same product looks the same (position, size, tilt) on the website and
      in the app, on the same face, within about 2 mm.
- [ ] The glasses stay locked on through ±45° yaw, ±25° pitch and ±30° roll,
      with no visible lag or jitter when the head is still.
- [ ] The far temple arm disappears behind the head when turning, and the
      frame front never gets clipped.
- [ ] Works the same on iOS and Android, in portrait, and in low light.
- [ ] A frame with a bad/missing `hinge_to_hinge` falls back to face-width fit.
      A product with no GLB has no "Try On" button.
- [ ] A Khmer-locale product (`frame_shape.name` in Khmer) gets the correct
      calibration.
- [ ] Saved photo matches the review card at full resolution. Share works.
- [ ] No camera, GL or memory leak after opening and closing try-on 20 times.
- [ ] Meets the performance targets in section 6 on the listed devices.

## 10. Do not

- Don't change the calibration numbers to "fix" a fit problem. A fit mismatch is
  almost always a camera-matching, crop or mirroring bug (section 3). Fix that instead.
- Don't load decoders or models from a third-party CDN at runtime.
- Don't ship any dev calibration panel in production builds.
- Don't block the JS thread with inference or per-frame React state updates. Use
  refs / shared values and mutate three.js objects in `useFrame`.

When finished, report: what was built, the measured fps and first-frame time per
test device, any deviations from this spec and why, and known issues.
