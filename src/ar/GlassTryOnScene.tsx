/**
 * GlassTryOnScene — real-time AR glasses try-on
 *
 * Always renders the default `essilor.glb` model:
 *  1. The GLB is fetched from Metro on the RN JS thread and handed to the
 *     WebView as a base64 `data:` URI (see ./glassesModel).
 *  2. Parsed by Three.js `GLTFLoader` and rendered on an alpha-transparent
 *     canvas overlaid on the mirrored front-camera video.
 *  3. MediaPipe FaceMesh drives position / rotation / scale every frame, with a
 *     depth-only head-shaped occluder so the temple arms hide inside the head
 *     instead of being painted across the face.
 *
 * The GLB is authored with named groups (Frame_GRP, Lens_GRP,
 * Temple_L/R_Locator_GRP, Extras_GRP), so the temple arms are the real authored
 * arms rather than a geometric guess at where the arms start.
 */
import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Colors, FontSize, Spacing, BorderRadius } from '../theme';
import type { GlassItem } from '../types/navigation';
import AppText from '../components/AppText';
import { useGlassesGlb } from './glassesModel';
import { GLB_SCRIPT_TAGS, GLB_HELPERS_JS, HEAD_POSE_JS } from './glassesModelWeb';

interface Props {
  glass: GlassItem;
}

function buildHtml(glass: GlassItem, glbDataUri: string): string {
  const accentHex = Colors.primary;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#000}
    /* mirrored camera feed */
    #video{
      position:absolute;top:0;left:0;width:100%;height:100%;
      object-fit:cover;transform:scaleX(-1);z-index:0;
    }
    /* transparent Three.js canvas on top */
    #ar-canvas{
      position:absolute;top:0;left:0;width:100%;height:100%;
      pointer-events:none;z-index:1;
    }
    #status{
      position:absolute;top:18px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.55);color:#fff;
      font-family:-apple-system,sans-serif;font-size:13px;font-weight:600;
      padding:6px 16px;border-radius:20px;white-space:nowrap;
      transition:background .4s;z-index:2;
    }
    #loading{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      color:rgba(255,255,255,.7);font-family:-apple-system,sans-serif;
      font-size:14px;text-align:center;line-height:1.9;pointer-events:none;z-index:2;
    }
    .spinner{
      width:36px;height:36px;
      border:3px solid rgba(255,255,255,.15);
      border-top-color:rgba(255,255,255,.85);
      border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 10px;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
<video id="video" autoplay playsinline muted></video>
<canvas id="ar-canvas"></canvas>
<div id="status">Point camera at your face</div>
<div id="loading"><div class="spinner"></div>Initialising AR…</div>

${GLB_SCRIPT_TAGS}
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js"       crossorigin="anonymous"></script>

<script>
(function(){
'use strict';

${GLB_HELPERS_JS}
${HEAD_POSE_JS}

var GLB_DATA_URI = '${glbDataUri}';
var ACCENT     = '${accentHex}';
var GLASS_NAME = '${glass.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}';

// If the glasses appear to face away from the camera, set this to Math.PI.
// essilor.glb is authored front-facing +Z, which already faces our camera.
var MODEL_BASE_ROT_Y = 0;

// Overall size of the glasses relative to the temple-to-temple span measured
// between landmarks 234 / 454. The GLB is authored in real-world metres
// (148 mm across), which already matches a real face, so 1.0 is "life size";
// real frames usually sit a touch wider than the face at temple level.
// ↑ Raise this to make the glasses bigger, lower it to shrink them.
var SIZE_MULT = 1.10;

// ── Temple (arm) progressive reveal ───────────────────────────────────────────
// The model's own Temple_L/R_Locator_GRP nodes are the arms, and each side is
// now driven independently off the head basis rather than off |yaw|:
//
//   near arm (the one rotating TOWARDS the camera) — fades in as it clears the
//     cheek, because that is the only arm whose silhouette we can get wrong;
//   far  arm (rotating AWAY) — left at full opacity and handed to the head
//     occluder, which hides it inside the head and lets it emerge naturally
//     behind the jaw at a strong profile.
//
// The signal is pose.xAxis.z ≈ sin(yaw): 0 head-on, +1 when the wearer's LEFT
// temple points at the camera, -1 when their right one does.
var TEMPLE_REVEAL_START = 0.03;   // ~2 degrees of turn — the arm starts to show
var TEMPLE_REVEAL_FULL  = 0.20;   // ~12 degrees — fully opaque

// ── Occlusion ────────────────────────────────────────────────────────────────
// A depth-only ellipsoid standing in for the wearer's head, so a temple arm is
// hidden while it is behind the face/skull and only drawn where it is really
// visible. Semi-axes and centre offset are fractions of the measured
// temple-to-temple face width, oriented by the head basis.
//   width  → half the head across the ears (kept a touch narrower than the
//            arms, so a near arm hugging the head is not swallowed by it)
//   depth  → half the front-to-back skull depth
//   back   → how far behind the nose bridge the skull centre sits
var OCCLUSION_ENABLED = true;
var HEAD_OCC = {
  width:  0.52,
  height: 0.80,
  depth:  0.70,
  back:   0.44,
  down:   0.06
};

// ── Where the glasses sit on the face (fractions of face width) ─────────────
// The frame's HEIGHT is anchored on the measured pupil line (see headPose), not
// on an assumed offset down from the nose bridge — that assumption was ~6 mm
// low, which is what put the lenses under the wearer's eyes.
//
// BRIDGE_FWD  — how far the lenses stand off the nose. Raise it if the frame
//               cuts into the face; lower it if it floats.
// EYE_DROP    — how far BELOW the pupils the lens CENTRE sits. 0 puts the pupil
//               dead centre in the lens; 0.02 (~3 mm) matches real dispensing,
//               where the pupil sits at about 57% of the lens height.
//               ↑ Raise this to seat the glasses lower, lower it to lift them.
var BRIDGE_FWD = 0.10;
var EYE_DROP   = 0.02;

// Minimum lens alpha on the AR overlay. Real KHR transmission cannot see the
// <video> behind the canvas, so lenses fall back to plain alpha here. This GLB
// has a CLEAR prescription lens, so it should stay barely visible.
var LENS_OPACITY = 0.14;

var video   = document.getElementById('video');
var loading = document.getElementById('loading');
var status  = document.getElementById('status');

// ── Video → screen mapping ───────────────────────────────────────────────────
// MediaPipe returns landmarks normalised to the CAMERA FRAME, but #video is
// styled object-fit:cover, which scales the frame up and centre-crops it to
// fill the screen. On a portrait phone a 1280x720 stream renders ~1244 px wide
// inside a ~390 px viewport, so treating a normalised x as a fraction of
// innerWidth compressed every measurement by ~3x — which is why the glasses
// came out far too small for the face.
var dispW = 1, dispH = 1, offX = 0, offY = 0, mapW = 0, mapH = 0;

function updateVideoMapping() {
  var W = innerWidth, H = innerHeight;
  var vw = video.videoWidth  || W;
  var vh = video.videoHeight || H;
  var s  = Math.max(W / vw, H / vh);   // object-fit: cover
  dispW = vw * s; dispH = vh * s;
  offX  = (W - dispW) / 2;             // negative == cropped horizontally
  offY  = (H - dispH) / 2;
  mapW  = vw; mapH = vh;
}
updateVideoMapping();
video.addEventListener('loadedmetadata', updateVideoMapping);
video.addEventListener('resize', updateVideoMapping);

// ── Three.js — transparent overlay ───────────────────────────────────────────
var canvas   = document.getElementById('ar-canvas');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);   // fully transparent
renderer.outputEncoding   = THREE.sRGBEncoding;
renderer.toneMapping      = THREE.ACESFilmicToneMapping;   // filmic PBR look
renderer.toneMappingExposure = 1.05;

var scene  = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 200);
camera.position.z = 10;

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
var key  = new THREE.DirectionalLight(0xfff8ee, 1.8); key.position.set(2, 4, 6);  scene.add(key);
var fill = new THREE.DirectionalLight(0xddeeff, 0.7); fill.position.set(-3, 1, 3); scene.add(fill);

// ── PBR environment map — gives metal/glass realistic reflections ────────────
try {
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
} catch (e) {
  console.warn('Environment map unavailable:', e.message);
}

// ── Load + prepare the GLB ───────────────────────────────────────────────────
var glassGroup  = null;   // pivot: origin at the front of the lenses
var templeL = null, templeMatsL = [];   // wearer's LEFT arm  (model +X)
var templeR = null, templeMatsR = [];   // wearer's RIGHT arm (model -X)
var MODEL_WIDTH = 1.0;    // X-span in model units (metres), for AR scaling
var faceFound   = false;

loadGlassesGLB(GLB_DATA_URI).then(function (root) {
  hideFaceShadow(root);
  simplifyLenses(root, LENS_OPACITY);

  // The front of the glasses never depth-tests, so the head occluder is free to
  // be a full-sized skull without ever clipping the lenses or the brow bar.
  frontAlwaysOnTop(root);

  // Temple arms: cloned materials per side, so each arm fades independently and
  // neither ever touches the frame's shared material.
  var temples = collectTemples(root);
  templeL = temples.templeL; templeMatsL = temples.matsL;
  templeR = temples.templeR; templeMatsR = temples.matsR;

  var centred = centreGlasses(root, 'lens');
  MODEL_WIDTH = centred.size.x;
  glassGroup  = centred.pivot;
  glassGroup.rotation.y = MODEL_BASE_ROT_Y;
  glassGroup.visible    = faceFound;   // the face may already be tracking
  scene.add(glassGroup);
}).catch(function (err) {
  console.warn('GLB load error:', err && err.message);
  loading.innerHTML = 'Could not load model<br><span style="font-size:11px;opacity:.6">' +
                      ((err && err.message) || 'unknown error') + '</span>';
});

// ── Occluder: invisible head proxy that writes depth only ────────────────────
// Built once the face is found; sized and oriented from the head pose every
// frame (see updateHeadOccluder in glassesModelWeb).
var occluder = null;   // THREE.Mesh

function setupOccluder() {
  if (occluder || !OCCLUSION_ENABLED) { return; }
  occluder = makeHeadOccluder();
  scene.add(occluder);
}

// ── Render loop ───────────────────────────────────────────────────────────────
(function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
})();

window.addEventListener('resize', function () {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  updateVideoMapping();   // the cover crop depends on the viewport
});

// ── Face pose → Three.js transform ───────────────────────────────────────────
// All of the position / orientation / scale maths lives in headPose() (see
// glassesModelWeb). It builds an orthonormal head basis from the 3-D landmarks,
// so the fit no longer depends on how far away the user sits or which way the
// head is turned.
var _view  = {};
var _pose  = {};

// Smoothstep the near arm in over the TEMPLE_REVEAL window; the far arm (side
// <= 0) is left opaque for the occluder to deal with.
function templeReveal(side) {
  if (side <= 0) { return 1; }
  var t = (side - TEMPLE_REVEAL_START) / (TEMPLE_REVEAL_FULL - TEMPLE_REVEAL_START);
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  return t * t * (3 - 2 * t);
}

function setTempleOpacity(group, mats, o) {
  if (!group) { return; }
  for (var i = 0; i < mats.length; i++) { mats[i].opacity = o; }
  group.visible = o > 0.004;   // skip the draw call while fully transparent
}

function applyFacePose(lm) {
  if (!glassGroup) return;

  var W = innerWidth, H = innerHeight;
  // The stream can change resolution mid-session (or arrive after first paint).
  if (video.videoWidth && (video.videoWidth !== mapW || video.videoHeight !== mapH)) {
    updateVideoMapping();
  }

  var camZ   = camera.position.z;
  var vFOV   = camera.fov * Math.PI / 180;
  var worldH = 2 * Math.tan(vFOV / 2) * camZ;
  var worldW = worldH * (W / H);

  _view.W = W; _view.H = H;
  _view.dispW = dispW; _view.dispH = dispH;
  _view.offX = offX;   _view.offY = offY;
  _view.worldW = worldW; _view.worldH = worldH;
  // World width spanned by the FULL camera frame (wider than the screen when
  // the video is cropped) — MediaPipe's x and z are in those units.
  _view.worldVideoW = worldW * (dispW / W);
  _view.bridgeForward = BRIDGE_FWD;
  _view.eyeDrop       = EYE_DROP;

  var pose = headPose(lm, _view, _pose);

  glassGroup.position.copy(pose.position);
  glassGroup.quaternion.copy(pose.quaternion);
  // faceWidth is a true 3-D span, so the frame keeps its size as the head turns.
  glassGroup.scale.setScalar((pose.faceWidth * SIZE_MULT) / MODEL_WIDTH);

  // ── Reveal each temple arm on its own ─────────────────────────────────────
  // side > 0 means that arm is the one swinging TOWARDS the camera, so it is
  // about to appear in front of the cheek — fade it in. side <= 0 means the arm
  // has gone round the back of the head, where the occluder is responsible for
  // hiding it, so it stays fully opaque and simply gets depth-tested away.
  var lNear = pose.xAxis.z;              // ≈ sin(yaw), + when the left arm nears us
  setTempleOpacity(templeL, templeMatsL, templeReveal(lNear));
  setTempleOpacity(templeR, templeMatsR, templeReveal(-lNear));

  // ── Keep the head occluder glued to the head ──────────────────────────────
  if (occluder) {
    updateHeadOccluder(occluder, pose, HEAD_OCC);
  }
}

// ── Camera stream ─────────────────────────────────────────────────────────────
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'cameraError', reason: 'unsupported' })
  );
  return;
}
navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: false,
}).then(function (stream) {
  video.srcObject = stream;
  video.play().catch(function () {});
}).catch(function (err) {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'cameraError', reason: err.name || 'unknown' })
  );
});

// ── MediaPipe FaceMesh ────────────────────────────────────────────────────────
function onResults(results) {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length) {
    if (!faceFound) {
      faceFound = true;
      loading.style.display = 'none';
      setupOccluder();
      if (glassGroup) glassGroup.visible = true;
      status.textContent    = GLASS_NAME + ' — try on';
      status.style.background = ACCENT + 'CC';
    }
    applyFacePose(results.multiFaceLandmarks[0]);
  } else {
    if (faceFound) {
      faceFound = false;
      if (glassGroup) glassGroup.visible = false;
      status.textContent    = 'Point camera at your face';
      status.style.background = 'rgba(0,0,0,0.55)';
    }
  }
}

function initFaceMesh() {
  if (typeof FaceMesh === 'undefined' || typeof Camera === 'undefined') {
    return setTimeout(initFaceMesh, 250);
  }
  loading.style.display = 'block';
  var fm = new FaceMesh({
    locateFile: function (f) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/' + f; },
  });
  fm.setOptions({
    maxNumFaces: 1, refineLandmarks: true,
    minDetectionConfidence: 0.55, minTrackingConfidence: 0.55,
  });
  fm.onResults(onResults);

  var cam = new Camera(video, {
    onFrame: async function () { await fm.send({ image: video }); },
    width: 640, height: 480,
  });
  cam.start()
    .then(function () { loading.style.display = 'none'; })
    .catch(function (e) { loading.innerHTML = 'Camera error:<br>' + e.message; });
}

if (document.readyState === 'complete') initFaceMesh();
else window.addEventListener('load', initFaceMesh);

})();
</script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GlassTryOnScene: React.FC<Props> = ({ glass }) => {
  const webviewRef = useRef<WebView>(null);
  const { dataUri, error } = useGlassesGlb();

  const html = useMemo(
    () => (dataUri ? buildHtml(glass, dataUri) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass.id, dataUri],
  );

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'cameraError') {
          Alert.alert(
            'Camera Access Required',
            'MOptic needs camera access for the glasses try-on.\n\nGo to Settings → Privacy & Security → Camera.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openSettings },
            ],
          );
        }
      } catch {}
    },
    [openSettings],
  );

  if (error) {
    return (
      <View style={styles.center}>
        <AppText style={styles.errorIcon}>⚠</AppText>
        <AppText style={styles.errorTitle}>Could not load model</AppText>
        <AppText style={styles.errorSub}>
          Make sure Metro bundler is running{'\n'}and the device is on the same
          network.
        </AppText>
      </View>
    );
  }

  if (!html) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <AppText style={styles.loadingText}>Loading glasses model…</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html, baseUrl: 'http://localhost' }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        onMessage={onMessage}
        onError={e => console.warn('[TryOn] WebView error:', e.nativeEvent)}
      />

      <View style={styles.bottomBar}>
        <View style={styles.glassInfo}>
          <AppText style={styles.glassName}>{glass.name}</AppText>
          <AppText style={styles.glassBrand}>
            {glass.brand} · ${glass.price}
          </AppText>
        </View>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>3D LIVE</AppText>
        </View>
      </View>
    </View>
  );
};

export default GlassTryOnScene;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },

  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  errorIcon: { fontSize: 36, color: '#F7A440' },
  errorTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  errorSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  glassInfo: { flex: 1 },
  glassName: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  glassBrand: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
});
