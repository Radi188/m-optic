/**
 * GlassTryOnScene — real-time AR glasses try-on
 *
 * Always renders the default `essilor.glb` model:
 *  1. The GLB is fetched from Metro on the RN JS thread and handed to the
 *     WebView as a base64 `data:` URI (see ./glassesModel).
 *  2. Parsed by Three.js `GLTFLoader` and rendered on an alpha-transparent
 *     canvas overlaid on the mirrored camera frame FaceMesh just analysed, so
 *     the glasses never lag behind the face.
 *  3. MediaPipe FaceMesh face geometry (a metric head pose for a known camera)
 *     drives position / rotation / scale every frame, One Euro smoothed, with a
 *     depth-only head-shaped occluder so the temple arms hide inside the head
 *     instead of being painted across the face. The older 2-D landmark solver
 *     is kept as a fallback.
 *
 * The GLB is authored with named groups (Frame_GRP, Lens_GRP,
 * Temple_L/R_Locator_GRP, Extras_GRP), so the temple arms are the real authored
 * arms rather than a geometric guess at where the arms start.
 */
import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Colors, FontSize, Spacing, BorderRadius } from '../theme';
import type { GlassItem } from '../types/navigation';
import AppText from '../components/AppText';
import { useGlassesGlb } from './glassesModel';
import {
  GLB_SCRIPT_TAGS,
  GLB_HELPERS_JS,
  HEAD_POSE_JS,
  FACE_GEOMETRY_JS,
} from './glassesModelWeb';

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
    /* live camera feed (mirrored). Shown until the first analysed frame is
       drawn on #bg, and as a fallback should drawing that frame ever fail. */
    #video{
      position:absolute;top:0;left:0;width:100%;height:100%;
      object-fit:cover;transform:scaleX(-1);z-index:0;
    }
    /* the exact frame FaceMesh analysed, so face and glasses never drift apart */
    #bg{
      position:absolute;top:0;left:0;width:100%;height:100%;
      transform:scaleX(-1);z-index:1;
    }
    /* transparent Three.js canvas on top, mirrored together with the video */
    #ar-canvas{
      position:absolute;top:0;left:0;width:100%;height:100%;
      transform:scaleX(-1);pointer-events:none;z-index:2;
    }
    #status{
      position:absolute;top:18px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.55);color:#fff;
      font-family:-apple-system,sans-serif;font-size:13px;font-weight:600;
      padding:6px 16px;border-radius:20px;white-space:nowrap;
      transition:background .4s;z-index:3;
    }
    #loading{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      color:rgba(255,255,255,.7);font-family:-apple-system,sans-serif;
      font-size:14px;text-align:center;line-height:1.9;pointer-events:none;z-index:3;
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
<canvas id="bg"></canvas>
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
${FACE_GEOMETRY_JS}

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
// driven independently off the head basis rather than off |yaw|:
//
//   near arm (the one rotating TOWARDS the camera) — fades in as it clears the
//     cheek, because that is the only arm whose silhouette we can get wrong;
//   far  arm (rotating AWAY) — left at full opacity and handed to the head
//     occluder, which hides it inside the head and lets it emerge naturally
//     behind the jaw at a strong profile.
//
// The signal is the head's X axis . camera Z ≈ sin(yaw): 0 head-on, +1 when the
// wearer's LEFT temple points at the camera, -1 when their right one does.
var TEMPLE_REVEAL_START = 0.03;   // ~2 degrees of turn — the arm starts to show
var TEMPLE_REVEAL_FULL  = 0.20;   // ~12 degrees — fully opaque

// ── Face geometry (primary tracking) ─────────────────────────────────────────
// FaceMesh solves a rigid head pose against its metric canonical face and
// reports it for a perspective camera with this vertical FOV over the camera
// frame. The Three.js camera uses the same FOV, so the glasses project exactly
// onto the face at any head turn.
var GEOMETRY_FOV = 63;

// Where the glasses sit on the metric face mesh (fractions of face width, so
// they hold for any face size). On MediaPipe's canonical face the nose bridge
// (landmark 6) is ~23 mm in front of the eye corners, which is where a real lens
// sits (~12 mm vertex distance in front of the cornea).
//
// LENS_FWD — how far the FRONT of the lenses stands in front of the nose
//            bridge. Too high and the frame hovers off the face — that offset
//            is what made the glasses slide sideways ("float") on a head turn.
//            Raise it if the frame cuts into the face; lower it if it floats.
// EYE_DROP — how far BELOW the eye line the lens CENTRE sits. 0 puts the pupil
//            dead centre in the lens; 0.02 (~3 mm) matches real dispensing,
//            where the pupil sits at about 57% of the lens height.
//            ↑ Raise this to seat the glasses lower, lower it to lift them.
var LENS_FWD = 0.015;
var EYE_DROP = 0.02;

// Head occluder in face space (fractions of face width): a depth-only
// ellipsoid for the skull, centred behind the temple line, so a temple arm is
// hidden while it is behind the head and only drawn where it is really visible.
//   width  → half the head across the ears (kept narrower than the arms, so a
//            near arm hugging the head is not swallowed by it)
//   back   → how far behind the 234/454 temple line the skull centre sits
var OCCLUSION_ENABLED = true;
var FACE_OCC = {
  width:  0.47,
  height: 0.72,
  depth:  0.62,
  back:   0.15,
  up:     0.02
};

// Smoothing. Position in cm, rotation in rad/s. Low cutoffs remove jitter
// while still; beta lets the filter open up during a turn so it does not lag.
var SMOOTHING = { posMinCutoff: 1.2, posBeta: 0.08, rotMinCutoff: 1.2, rotBeta: 0.8 };
// Face-shape measurements barely change, so they are averaged hard.
var FIT_SMOOTH = 0.15;

// ── Landmark fallback ─────────────────────────────────────────────────────────
// Used only when face geometry is unavailable: the older 2-D landmark solver
// with its own (non-metric) tuning.
var LEGACY_BRIDGE_FWD = 0.10;
var LEGACY_HEAD_OCC = { width: 0.52, height: 0.80, depth: 0.70, back: 0.44, down: 0.06 };
var LEGACY_SMOOTHING = { posMinCutoff: 1.2, posBeta: 0.3, rotMinCutoff: 1.2, rotBeta: 0.8 };

// Minimum lens alpha on the AR overlay. Real KHR transmission cannot see the
// <video> behind the canvas, so lenses fall back to plain alpha here. This GLB
// has a CLEAR prescription lens, so it should stay barely visible.
var LENS_OPACITY = 0.14;

var video   = document.getElementById('video');
var bg      = document.getElementById('bg');
var bgCtx   = bg.getContext('2d');
var loading = document.getElementById('loading');
var status  = document.getElementById('status');

// ── Three.js — transparent overlay ───────────────────────────────────────────
var canvas   = document.getElementById('ar-canvas');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);   // fully transparent
renderer.outputEncoding   = THREE.sRGBEncoding;
renderer.toneMapping      = THREE.ACESFilmicToneMapping;   // filmic PBR look
renderer.toneMappingExposure = 1.05;

var scene = new THREE.Scene();

// Face-geometry camera: same intrinsics FaceMesh assumed, cropped with a view
// offset exactly like the object-fit:cover video. Units are centimetres.
var arCamera = new THREE.PerspectiveCamera(GEOMETRY_FOV, 1, 1, 10000);
var fullProj = new THREE.Matrix4();   // the un-cropped projection, for calibration
// Landmark-fallback camera.
var legacyCamera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 200);
legacyCamera.position.z = 10;
var activeCamera = arCamera;

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

// Everything that follows the head hangs off this anchor. With face geometry
// its matrix IS the head pose and children are placed in face space (cm); in
// the landmark fallback it stays identity and children are placed in world space.
var faceAnchor = new THREE.Group();
faceAnchor.matrixAutoUpdate = false;
scene.add(faceAnchor);

// ── Video → screen mapping ───────────────────────────────────────────────────
// MediaPipe returns landmarks normalised to the CAMERA FRAME, but #video is
// styled object-fit:cover, which scales the frame up and centre-crops it to
// fill the screen. On a portrait phone a 1280x720 stream renders ~1244 px wide
// inside a ~390 px viewport, so treating a normalised x as a fraction of
// innerWidth compressed every measurement by ~3x — which is why the glasses
// came out far too small for the face.
var dispW = 1, dispH = 1, offX = 0, offY = 0, mapW = 0, mapH = 0;
var bgDpr = Math.min(devicePixelRatio || 1, 2);

function updateVideoMapping() {
  var W = innerWidth, H = innerHeight;
  var vw = video.videoWidth  || W;
  var vh = video.videoHeight || H;
  var s  = Math.max(W / vw, H / vh);   // object-fit: cover
  dispW = vw * s; dispH = vh * s;
  offX  = (W - dispW) / 2;             // negative == cropped horizontally
  offY  = (H - dispH) / 2;
  mapW  = vw; mapH = vh;

  bg.width  = Math.round(W * bgDpr);
  bg.height = Math.round(H * bgDpr);
  bgCtx.setTransform(bgDpr, 0, 0, bgDpr, 0, 0);

  arCamera.aspect = vw / vh;
  arCamera.clearViewOffset();          // also updates the projection
  fullProj.copy(arCamera.projectionMatrix);
  arCamera.setViewOffset(dispW, dispH, -offX, -offY, W, H);
}
updateVideoMapping();
video.addEventListener('loadedmetadata', updateVideoMapping);
video.addEventListener('resize', updateVideoMapping);

window.addEventListener('resize', function () {
  legacyCamera.aspect = innerWidth / innerHeight;
  legacyCamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  updateVideoMapping();   // the cover crop depends on the viewport
  renderer.render(scene, activeCamera);
});

// Draws the analysed camera frame. The live <video> runs a few frames ahead of
// FaceMesh, so showing it directly made the glasses trail the face on every
// turn; drawing results.image keeps the picture and the pose in lock-step.
function drawBackground(img) {
  if (!img) { return; }
  try { bgCtx.drawImage(img, offX, offY, dispW, dispH); } catch (e) {}
}

// ── Load + prepare the GLB ───────────────────────────────────────────────────
var glassGroup  = null;   // pivot: origin at the front of the lenses
var templeL = null, templeMatsL = [];   // wearer's LEFT arm  (model +X)
var templeR = null, templeMatsR = [];   // wearer's RIGHT arm (model -X)
var MODEL_WIDTH = 1.0;    // X-span in model units (metres), for AR scaling
var faceFound   = false;
var _baseQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), MODEL_BASE_ROT_Y);

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
  glassGroup.visible = faceFound;   // the face may already be tracking
  faceAnchor.add(glassGroup);
}).catch(function (err) {
  console.warn('GLB load error:', err && err.message);
  loading.innerHTML = 'Could not load model<br><span style="font-size:11px;opacity:.6">' +
                      ((err && err.message) || 'unknown error') + '</span>';
});

// ── Occluder: invisible head proxy that writes depth only ────────────────────
var occluder = null;   // THREE.Mesh

function setupOccluder() {
  if (occluder || !OCCLUSION_ENABLED) { return; }
  occluder = makeHeadOccluder();
  faceAnchor.add(occluder);
}

// ── Temple reveal ─────────────────────────────────────────────────────────────
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

// lNear ≈ sin(yaw): + when the wearer's left arm swings towards the camera.
// That arm is about to appear in front of the cheek, so it fades in; an arm
// going round the back of the head stays opaque and is depth-tested away.
function revealTemples(lNear) {
  setTempleOpacity(templeL, templeMatsL, templeReveal(lNear));
  setTempleOpacity(templeR, templeMatsR, templeReveal(-lNear));
}

// ── Face geometry → transform (primary) ──────────────────────────────────────
var geometryOn = true;
var smoother   = new PoseSmoother(SMOOTHING);
var calib      = new FlipCalibrator(20);
var fit = { ready: false, fw: 0, place: new THREE.Vector3(), earMid: new THREE.Vector3() };

var _poseM = new THREE.Matrix4(), _poseS = new THREE.Matrix4(), _flipM = new THREE.Matrix4();
var _rawPos = new THREE.Vector3(), _rawQuat = new THREE.Quaternion(), _rawScl = new THREE.Vector3();
var _sPos = new THREE.Vector3(), _sQuat = new THREE.Quaternion();
var _earL = new THREE.Vector3(), _earR = new THREE.Vector3(), _bridge = new THREE.Vector3();
var _eye = new THREE.Vector3(), _acc = new THREE.Vector3(), _place = new THREE.Vector3();
var _mid = new THREE.Vector3(), _tmp = new THREE.Vector3();
var EYE_CORNERS = [33, 133, 362, 263];

function applyFaceGeometry(geo, lm, t) {
  var md   = geo.getPoseTransformMatrix && geo.getPoseTransformMatrix();
  var mesh = geo.getMesh && geo.getMesh();
  if (!md || !mesh) { return false; }
  var data = md.getPackedDataList();
  var vb   = mesh.getVertexBufferList();
  if (!data || data.length !== 16 || !vb || vb.length < 468 * 5) { return false; }

  // Three wants column-major. A rigid pose keeps its translation (the head is
  // ~30-60 cm away) in elements 12-14; if it shows up in 3/7/11 instead, the
  // data is row-major.
  _poseM.fromArray(data);
  var e = _poseM.elements;
  if (Math.abs(e[3]) + Math.abs(e[7]) + Math.abs(e[11]) >
      Math.abs(e[12]) + Math.abs(e[13]) + Math.abs(e[14])) {
    _poseM.transpose();
  }
  // The camera looks down -Z; a face at z >= 0 means the pose is not in the
  // space we render with.
  if (_poseM.elements[14] >= 0) { geometryOn = false; return false; }

  calib.update(vb, _poseM, fullProj, lm);
  if (calib.unreliable(0.15)) {
    console.warn('[TryOn] face geometry does not match the landmarks — using landmark tracking');
    geometryOn = false;
    return false;
  }

  // Where the glasses sit, measured on this face's metric mesh.
  meshVertex(vb, 454, _earL);
  meshVertex(vb, 234, _earR);
  meshVertex(vb, 6, _bridge);
  var fw = _earL.distanceTo(_earR);
  _eye.set(0, 0, 0);
  for (var i = 0; i < EYE_CORNERS.length; i++) { _eye.add(meshVertex(vb, EYE_CORNERS[i], _acc)); }
  _eye.multiplyScalar(1 / EYE_CORNERS.length);
  _place.set(_eye.x, _eye.y - EYE_DROP * fw, _bridge.z + LENS_FWD * fw);
  _mid.addVectors(_earL, _earR).multiplyScalar(0.5);

  if (!fit.ready) {
    fit.fw = fw; fit.place.copy(_place); fit.earMid.copy(_mid); fit.ready = true;
  } else {
    fit.fw += FIT_SMOOTH * (fw - fit.fw);
    fit.place.lerp(_place, FIT_SMOOTH);
    fit.earMid.lerp(_mid, FIT_SMOOTH);
  }

  // Smoothed head pose → anchor (with any axis flip found by the calibrator).
  _poseM.decompose(_rawPos, _rawQuat, _rawScl);
  smoother.update(_rawPos, _rawQuat, t, _sPos, _sQuat);
  _poseS.compose(_sPos, _sQuat, _rawScl);
  _flipM.makeScale(calib.sx, calib.sy, 1);
  faceAnchor.matrix.multiplyMatrices(_flipM, _poseS);
  faceAnchor.matrixWorldNeedsUpdate = true;

  glassGroup.position.copy(fit.place);
  glassGroup.quaternion.copy(_baseQ);
  glassGroup.scale.setScalar((fit.fw * SIZE_MULT) / MODEL_WIDTH);

  if (occluder) {
    occluder.quaternion.identity();
    occluder.scale.set(FACE_OCC.width * fit.fw, FACE_OCC.height * fit.fw, FACE_OCC.depth * fit.fw);
    occluder.position.copy(fit.earMid)
      .add(_tmp.set(0, FACE_OCC.up * fit.fw, -FACE_OCC.back * fit.fw));
  }

  revealTemples(_tmp.set(1, 0, 0).applyQuaternion(_sQuat).z);
  activeCamera = arCamera;
  return true;
}

// ── Landmarks → transform (fallback) ─────────────────────────────────────────
// All of the position / orientation / scale maths lives in headPose() (see
// glassesModelWeb). The canvas is mirrored by CSS, so the pose stays unmirrored.
var legacySmoother = new PoseSmoother(LEGACY_SMOOTHING);
var _view  = { mirror: false };
var _pose  = {};

function applyLandmarkPose(lm, t) {
  var W = innerWidth, H = innerHeight;
  var camZ   = legacyCamera.position.z;
  var vFOV   = legacyCamera.fov * Math.PI / 180;
  var worldH = 2 * Math.tan(vFOV / 2) * camZ;
  var worldW = worldH * (W / H);

  _view.W = W; _view.H = H;
  _view.dispW = dispW; _view.dispH = dispH;
  _view.offX = offX;   _view.offY = offY;
  _view.worldW = worldW; _view.worldH = worldH;
  // World width spanned by the FULL camera frame (wider than the screen when
  // the video is cropped) — MediaPipe's x and z are in those units.
  _view.worldVideoW = worldW * (dispW / W);
  _view.bridgeForward = LEGACY_BRIDGE_FWD;
  _view.eyeDrop       = EYE_DROP;

  var pose = headPose(lm, _view, _pose);
  legacySmoother.update(pose.position, pose.quaternion, t, _sPos, _sQuat);

  faceAnchor.matrix.identity();
  faceAnchor.matrixWorldNeedsUpdate = true;
  glassGroup.position.copy(_sPos);
  glassGroup.quaternion.copy(_sQuat).multiply(_baseQ);
  // faceWidth is a true 3-D span, so the frame keeps its size as the head turns.
  glassGroup.scale.setScalar((pose.faceWidth * SIZE_MULT) / MODEL_WIDTH);

  if (occluder) {
    updateHeadOccluder(occluder, pose, LEGACY_HEAD_OCC);
  }
  revealTemples(_tmp.set(1, 0, 0).applyQuaternion(_sQuat).z);
  activeCamera = legacyCamera;
}

function resetTracking() {
  smoother.reset();
  legacySmoother.reset();
  fit.ready = false;
}

// ── Camera stream ─────────────────────────────────────────────────────────────
// The stream is opened once, by MediaPipe's Camera helper in initFaceMesh.
// Opening it here as well fails on Android, where a camera can only be held by
// one stream at a time (NotReadableError: Could not start video source).
function postCameraError(reason) {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'cameraError', reason: reason })
  );
}
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  postCameraError('unsupported');
  return;
}
// camera_utils reports failures with a raw alert() — route them to RN instead.
window.alert = function (msg) { postCameraError(String(msg)); };

// ── MediaPipe FaceMesh ────────────────────────────────────────────────────────
var lastPath = null;

function onResults(results) {
  // The stream can change resolution mid-session (or arrive after first paint).
  if (video.videoWidth && (video.videoWidth !== mapW || video.videoHeight !== mapH)) {
    updateVideoMapping();
  }
  drawBackground(results.image);

  var lm = results.multiFaceLandmarks && results.multiFaceLandmarks.length
    ? results.multiFaceLandmarks[0] : null;

  if (lm) {
    if (!faceFound) {
      faceFound = true;
      loading.style.display = 'none';
      setupOccluder();
      if (glassGroup) glassGroup.visible = true;
      status.textContent    = GLASS_NAME + ' — try on';
      status.style.background = ACCENT + 'CC';
    }
    if (glassGroup) {
      var t   = performance.now();
      var geo = geometryOn && results.multiFaceGeometry && results.multiFaceGeometry[0];
      var path = geo && applyFaceGeometry(geo, lm, t) ? 'geometry' : 'landmarks';
      if (path === 'landmarks') { applyLandmarkPose(lm, t); }
      if (lastPath && path !== lastPath) { resetTracking(); }
      lastPath = path;
    }
  } else if (faceFound) {
    faceFound = false;
    if (glassGroup) glassGroup.visible = false;
    resetTracking();
    status.textContent    = 'Point camera at your face';
    status.style.background = 'rgba(0,0,0,0.55)';
  }

  // Render here rather than on requestAnimationFrame, so every drawn frame
  // pairs the glasses with the camera image their pose was measured on.
  renderer.render(scene, activeCamera);
}

function faceMeshOptions() {
  return {
    maxNumFaces: 1,
    // The geometry pipeline is fitted to the 468-point canonical mesh; the
    // refined iris points are only needed by the landmark fallback.
    refineLandmarks: !geometryOn,
    enableFaceGeometry: geometryOn,
    cameraVerticalFovDegrees: GEOMETRY_FOV,
    cameraNear: 1,
    cameraFar: 10000,
    minDetectionConfidence: 0.55, minTrackingConfidence: 0.55,
  };
}

function initFaceMesh() {
  if (typeof FaceMesh === 'undefined' || typeof Camera === 'undefined') {
    return setTimeout(initFaceMesh, 250);
  }
  loading.style.display = 'block';
  var fm = new FaceMesh({
    locateFile: function (f) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/' + f; },
  });
  fm.setOptions(faceMeshOptions());
  fm.onResults(onResults);

  var cam = new Camera(video, {
    onFrame: async function () {
      try {
        await fm.send({ image: video });
      } catch (e) {
        // Face geometry failing must not take the try-on down with it.
        if (geometryOn) {
          console.warn('[TryOn] face geometry failed, using landmark tracking:', e && e.message);
          geometryOn = false;
          fm.setOptions(faceMeshOptions());
        }
      }
    },
    width: 640, height: 480, facingMode: 'user',
  });
  cam.start()
    .then(function () { loading.style.display = 'none'; })
    .catch(function (e) {
      loading.innerHTML = 'Camera error:<br>' + ((e && (e.message || e.name)) || e);
      postCameraError((e && e.name) || String(e));
    });
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
  // Same per-product model as the 3-D viewer, so the frame being tried on is
  // the one being sold. Every tuning constant below is a fraction of the model's
  // own width or the measured face width, so nothing here is calibrated to one
  // particular GLB.
  const { dataUri, error } = useGlassesGlb(glass.modelUrl);

  const html = useMemo(
    () => (dataUri ? buildHtml(glass, dataUri) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass.id, dataUri],
  );

  // Android: the WebView can only grant getUserMedia when the app itself holds
  // CAMERA, so ask before the page loads. iOS: WKWebView reuses the app-level
  // grant via mediaCapturePermissionGrantType="grant".
  const [cameraGranted, setCameraGranted] = useState(Platform.OS !== 'android');
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
      .then(result => {
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          setCameraGranted(true);
        } else {
          showCameraAlert();
        }
      })
      .catch(() => showCameraAlert());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  // camera_utils can report one failure twice (alert + rejected start), so the
  // alert is shown once per session.
  const alertShown = useRef(false);
  const showCameraAlert = useCallback(() => {
    if (alertShown.current) return;
    alertShown.current = true;
    Alert.alert(
      'Camera Access Required',
      Platform.OS === 'android'
        ? 'MOptic needs camera access for the glasses try-on.\n\nIf the camera is in use by another app, close it and try again. Otherwise allow Camera in Settings → Apps → MOptic → Permissions.'
        : 'MOptic needs camera access for the glasses try-on.\n\nGo to Settings → Privacy & Security → Camera.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openSettings },
      ],
    );
  }, [openSettings]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'cameraError') {
          console.warn('[TryOn] camera error:', msg.reason);
          showCameraAlert();
        }
      } catch {}
    },
    [showCameraAlert],
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

  if (!html || !cameraGranted) {
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
