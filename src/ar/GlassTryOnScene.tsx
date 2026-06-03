/**
 * GlassTryOnScene — real-time AR glasses try-on
 *
 * Always renders the default `oculos.obj` model:
 *  1. The OBJ text is fetched from Metro in the RN JS thread and embedded
 *     in the HTML.
 *  2. Parsed + rendered by Three.js on an alpha-transparent canvas overlaid
 *     on the mirrored front-camera video.
 *  3. MediaPipe FaceMesh drives position / rotation / scale every frame, with a
 *     depth-only occluder so the temple arms hide behind the sides of the face.
 */
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Colors, FontSize, Spacing, BorderRadius } from '../theme';
import type { GlassItem } from '../types/navigation';

interface Props {
  glass: GlassItem;
}

// Default try-on model used for every glass item.
const OBJ_URI = Image.resolveAssetSource(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/models/oculos.obj'),
).uri;

function escapeObj(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
}

function buildHtml(glass: GlassItem, objText: string): string {
  const accentHex = Colors.primary;
  const safeObj = escapeObj(objText);

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

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/environments/RoomEnvironment.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js"       crossorigin="anonymous"></script>

<script>
(function(){
'use strict';

const ACCENT     = '${accentHex}';
const GLASS_NAME = '${glass.name.replace(/'/g, "\\'")}';

// If the glasses appear to face away from the camera, set this to Math.PI.
const MODEL_BASE_ROT_Y = 0;

// Overall size of the glasses relative to the temple-to-temple span.
// 1.0 = exactly temple width. Increase to make the glasses bigger.
const SIZE_MULT = 1.25;

// ── Temple (arm) progressive reveal ───────────────────────────────────────────
// The OBJ mesh is split into a "front" piece (rims / lenses / bridge) and the two
// "temple" side arms (left + right). Facing the camera head-on both arms are
// hidden. As the head turns, BOTH arms fade in — bit by bit with the turn angle.
// The arm rotating toward the camera shows in front of the cheek; the far arm is
// kept behind the face by the depth occluder, so it reads as "behind the head".
// Fraction of the model's front-most Z used as the rim/temple split plane.
const TEMPLE_SPLIT_FRAC = 0.66;
// |yaw| (normalised, 0 = head-on) where the arms just begin to appear…
const TEMPLE_REVEAL_START = 0.10;
// …and where they reach full opacity.
const TEMPLE_REVEAL_FULL = 0.45;

// ── Occlusion ────────────────────────────────────────────────────────────────
// Renders an invisible "occluder" face mesh that writes depth only, so the
// temple arms get hidden behind the sides of the face when the head turns.
const OCCLUSION_ENABLED = true;
// Pushes the occluder surface back along Z. More negative = occluder sits
// further behind the lenses (lenses stay visible, arms get hidden sooner).
const OCC_BASE_Z  = -0.12;
// How much MediaPipe depth relief to apply to the occluder (face curvature).
const OCC_Z_GAIN  = 1.0;

const video   = document.getElementById('video');
const loading = document.getElementById('loading');
const status  = document.getElementById('status');

// ── Three.js — transparent overlay ───────────────────────────────────────────
const canvas   = document.getElementById('ar-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);   // fully transparent
renderer.outputEncoding   = THREE.sRGBEncoding;
renderer.toneMapping      = THREE.ACESFilmicToneMapping;   // filmic PBR look
renderer.toneMappingExposure = 1.05;
renderer.physicallyCorrectLights = true;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.001, 200);
camera.position.z = 10;

scene.add(new THREE.AmbientLight(0xffffff, 1.6));
const key  = new THREE.DirectionalLight(0xfff8ee, 2.0); key.position.set(2, 4, 6);  scene.add(key);
const fill = new THREE.DirectionalLight(0xddeeff, 0.7); fill.position.set(-3, 1, 3); scene.add(fill);

// ── PBR environment map — gives metal/glass realistic reflections ────────────
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
} catch (e) {
  console.warn('Environment map unavailable:', e.message);
}

// ── Glass material (reflects the PBR environment map) ────────────────────────
const glassMat = new THREE.MeshPhysicalMaterial({
  color:      new THREE.Color('#0F0B08'),
  metalness:  0.60,
  roughness:  0.25,
  clearcoat:  0.70,
  clearcoatRoughness: 0.12,
});

// ── OBJ parser ───────────────────────────────────────────────────────────────
function parseOBJ(text) {
  const positions = [], normals = [], uvs = [];
  const posOut = [], normOut = [], uvOut = [];

  function addVert(tok) {
    const parts = tok.split('/');
    const vi = parseInt(parts[0], 10) || 0;
    const ti = parseInt(parts[1], 10) || 0;
    const ni = parseInt(parts[2], 10) || 0;

    const pi = (vi > 0 ? vi - 1 : positions.length / 3 + vi) * 3;
    posOut.push(positions[pi] || 0, positions[pi+1] || 0, positions[pi+2] || 0);

    if (ni) {
      const nii = (ni > 0 ? ni - 1 : normals.length / 3 + ni) * 3;
      normOut.push(normals[nii] || 0, normals[nii+1] || 0, normals[nii+2] || 0);
    } else {
      normOut.push(0, 0, 1);
    }
    if (ti) {
      const uvi = (ti > 0 ? ti - 1 : uvs.length / 2 + ti) * 2;
      uvOut.push(uvs[uvi] || 0, uvs[uvi+1] || 0);
    } else {
      uvOut.push(0, 0);
    }
  }

  for (const rawLine of text.split('\\n')) {
    const line  = rawLine.trim();
    if (!line || line[0] === '#') continue;
    const parts = line.split(/\\s+/);
    const cmd   = parts[0];
    if      (cmd === 'v')  positions.push(+parts[1], +parts[2], +parts[3]);
    else if (cmd === 'vn') normals.push(+parts[1], +parts[2], +parts[3]);
    else if (cmd === 'vt') uvs.push(+parts[1], +(parts[2] || 0));
    else if (cmd === 'f') {
      const verts = parts.slice(1);
      for (let i = 1; i < verts.length - 1; i++) {
        addVert(verts[0]);
        addVert(verts[i]);
        addVert(verts[i + 1]);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posOut, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normOut, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvOut, 2));
  if (!normals.length) geo.computeVertexNormals();
  return geo;
}

// ── Split a (non-indexed) triangle-soup geometry by a per-triangle predicate ───
// pick(cx,cy,cz) receives each triangle's centroid; true -> group A, false -> B.
function partitionSoup(geo, pick) {
  const p = geo.attributes.position.array;
  const n = geo.attributes.normal ? geo.attributes.normal.array : null;
  const u = geo.attributes.uv ? geo.attributes.uv.array : null;
  const A = { p: [], n: [], u: [] };
  const B = { p: [], n: [], u: [] };

  // 9 position/normal floats per triangle (3 verts × xyz); 6 uv floats per tri.
  for (let t = 0; t < p.length; t += 9) {
    const cx = (p[t]     + p[t + 3] + p[t + 6]) / 3;
    const cy = (p[t + 1] + p[t + 4] + p[t + 7]) / 3;
    const cz = (p[t + 2] + p[t + 5] + p[t + 8]) / 3;
    const dst = pick(cx, cy, cz) ? A : B;
    for (let k = 0; k < 9; k++) dst.p.push(p[t + k]);
    if (n) for (let k = 0; k < 9; k++) dst.n.push(n[t + k]);
    if (u) { const ub = (t / 9) * 6; for (let k = 0; k < 6; k++) dst.u.push(u[ub + k]); }
  }

  function make(o) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3));
    if (o.n.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3));
    if (o.u.length) g.setAttribute('uv',     new THREE.Float32BufferAttribute(o.u, 2));
    if (!o.n.length) g.computeVertexNormals();
    return g;
  }
  return { a: make(A), b: make(B) };
}

// ── Parse + centre the OBJ model ─────────────────────────────────────────────
let glassGroup  = null;
let templePlus  = null;   // temple arm on the +X side — fades in with head yaw
let templeMinus = null;   // temple arm on the −X side — fades in with head yaw
let MODEL_WIDTH = 1.0;   // raw X-span after centring (used for AR scale)

// A temple material that can fade from invisible → solid as the head turns.
function makeTempleMat() {
  const m = glassMat.clone();
  m.transparent = true;
  m.opacity = 0;
  m.depthWrite = false;   // depth-tested against the occluder, but never writes
  return m;
}

try {
  const geo = parseOBJ(\`${safeObj}\`);
  geo.computeBoundingBox();
  const box = geo.boundingBox;

  // Centre at origin
  const cx = (box.max.x + box.min.x) / 2;
  const cy = (box.max.y + box.min.y) / 2;
  const cz = (box.max.z + box.min.z) / 2;
  geo.translate(-cx, -cy, -cz);

  MODEL_WIDTH = box.max.x - box.min.x;   // width in raw OBJ units

  // 1) Split into front rims + temple arms on a Z plane near the front.
  geo.computeBoundingBox();
  const splitZ = geo.boundingBox.max.z * TEMPLE_SPLIT_FRAC;
  const byZ = partitionSoup(geo, (x, y, z) => z >= splitZ);   // a=front, b=temples

  // 2) Split the temple arms into +X / −X halves (kept separate so each side
  //    can be tuned independently; both currently fade in together).
  const byX = partitionSoup(byZ.b, x => x >= 0);              // a=+X, b=−X

  glassGroup = new THREE.Group();

  const frontMesh = new THREE.Mesh(byZ.a, glassMat);
  frontMesh.renderOrder = 1;   // draw AFTER the occluder so depth can hide arms
  glassGroup.add(frontMesh);

  templePlus = new THREE.Mesh(byX.a, makeTempleMat());
  templePlus.renderOrder = 2;  // draw after the front rims (it's a fading overlay)
  glassGroup.add(templePlus);

  templeMinus = new THREE.Mesh(byX.b, makeTempleMat());
  templeMinus.renderOrder = 2;
  glassGroup.add(templeMinus);

  glassGroup.rotation.y = MODEL_BASE_ROT_Y;
  glassGroup.visible = false;
  scene.add(glassGroup);
} catch (e) {
  console.warn('OBJ parse error:', e.message);
}

// ── Occluder: invisible face mesh that writes depth only ─────────────────────
// Built from MediaPipe's FACEMESH_FACE_OVAL ring (a closed loop around the
// face). We fan-triangulate it into a cap and update its vertices each frame.
let occluder    = null;   // THREE.Mesh
let OCC_RING    = null;   // ordered array of landmark indices around the oval

function buildOccluderRing(connections) {
  // connections: array of [a,b] edges forming a directed cycle
  const next = new Map();
  connections.forEach(function (c) { next.set(c[0], c[1]); });
  const start = connections[0][0];
  const ring  = [start];
  let cur = next.get(start), guard = 0;
  while (cur !== undefined && cur !== start && guard < 500) {
    ring.push(cur);
    cur = next.get(cur);
    guard++;
  }
  return ring;
}

function setupOccluder() {
  if (occluder || !OCCLUSION_ENABLED) return;
  if (typeof FACEMESH_FACE_OVAL === 'undefined') return;

  OCC_RING = buildOccluderRing(FACEMESH_FACE_OVAL);
  const N = OCC_RING.length;

  // Vertices: N ring points + 1 centroid (last). Positions filled per-frame.
  const positions = new Float32Array((N + 1) * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));

  const index = [];
  for (let i = 0; i < N; i++) index.push(N, i, (i + 1) % N);   // triangle fan
  geo.setIndex(index);

  // colorWrite:false → invisible, but still writes depth.
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false });
  occluder = new THREE.Mesh(geo, mat);
  occluder.renderOrder    = 0;       // before the glasses (renderOrder 1)
  occluder.frustumCulled  = false;
  scene.add(occluder);
}

// ── Render loop ───────────────────────────────────────────────────────────────
(function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
})();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Face pose → Three.js transform ───────────────────────────────────────────
function applyFacePose(lm) {
  if (!glassGroup) return;

  const W = innerWidth, H = innerHeight;
  // Mirror X to match CSS-flipped video
  function px(l) { return { x: (1 - l.x) * W, y: l.y * H, z: l.z }; }

  // Eye-centre landmarks
  const lTop = px(lm[386]), lBot = px(lm[374]);
  const rTop = px(lm[159]), rBot = px(lm[145]);
  const lOut = px(lm[263]), lInn = px(lm[362]);
  const rOut = px(lm[33]),  rInn = px(lm[133]);

  const lCX = (lOut.x + lInn.x) / 2,  lCY = (lTop.y + lBot.y) / 2;
  const rCX = (rOut.x + rInn.x) / 2,  rCY = (rTop.y + rBot.y) / 2;
  const eyeMidX = (lCX + rCX) / 2;
  const eyeMidY = (lCY + rCY) / 2;

  // ── Width: use temple-to-temple landmarks (234 / 454) ─────────────────────
  // This is how real glasses are sized — they span from temple to temple.
  const lTemple = px(lm[234]);
  const rTemple = px(lm[454]);
  const templePx    = Math.abs(rTemple.x - lTemple.x);

  // ── Vertical position ─────────────────────────────────────────────────────
  // Nose-bridge landmark 6 sits right between the eyes on the bridge.
  const noseBridge = px(lm[6]);
  const faceCX     = eyeMidX;
  // 60 % eye-midpoint + 40 % nose-bridge so glasses sit slightly lower,
  // matching where real nose-pads rest.
  const faceCY     = eyeMidY * 0.60 + noseBridge.y * 0.40;

  // ── Head pose ─────────────────────────────────────────────────────────────
  const rawYaw = (lm[263].z - lm[33].z) * 3.5;
  const yaw    = Math.max(-1, Math.min(1, rawYaw));
  const roll   = Math.atan2(rCY - lCY, rCX - lCX);
  const noseTip = px(lm[1]);
  const pitch   = ((noseTip.y - eyeMidY) / H) * 1.5;

  // ── Pixel → Three.js world coords ────────────────────────────────────────
  const camZ   = camera.position.z;
  const vFOV   = camera.fov * Math.PI / 180;
  const worldH = 2 * Math.tan(vFOV / 2) * camZ;
  const worldW = worldH * (W / H);

  const wX = (faceCX / W - 0.5) *  worldW;
  const wY = (faceCY / H - 0.5) * -worldH;

  // ── Scale ────────────────────────────────────────────────────────────────
  // Sized relative to the temple-to-temple span (see SIZE_MULT to tune).
  const worldTemple = (templePx / W) * worldW;
  const targetWidth = worldTemple * SIZE_MULT;
  const scale       = targetWidth / MODEL_WIDTH;

  glassGroup.position.set(wX, wY, 0);
  glassGroup.scale.setScalar(scale);
  glassGroup.rotation.order = 'YXZ';
  // Negate yaw: MediaPipe reads unflipped pixels; the video is CSS-mirrored.
  glassGroup.rotation.y = MODEL_BASE_ROT_Y - yaw;
  glassGroup.rotation.x =  pitch;
  glassGroup.rotation.z = -roll;

  // ── Reveal the temple arms progressively as the head turns ────────────────
  // Both arms fade in bit by bit with the turn angle. The arm rotating toward
  // the camera shows in front of the cheek; the far arm is depth-tested against
  // the occluder (depthWrite:false), so it stays behind the face / head.
  if (templePlus && templeMinus) {
    const reveal = Math.max(0, Math.min(1,
      (Math.abs(yaw) - TEMPLE_REVEAL_START) /
      (TEMPLE_REVEAL_FULL - TEMPLE_REVEAL_START)));
    templePlus.material.opacity  = reveal;
    templeMinus.material.opacity = reveal;
    templePlus.visible  = reveal > 0.001;
    templeMinus.visible = reveal > 0.001;
  }

  // ── Update the occluder face mesh to the live landmarks ────────────────────
  if (occluder && OCC_RING) {
    const pos = occluder.geometry.attributes.position;
    const arr = pos.array;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < OCC_RING.length; i++) {
      const l  = lm[OCC_RING[i]];
      const ox = (1 - l.x) * W;
      const oy = l.y * H;
      const vx = (ox / W - 0.5) *  worldW;
      const vy = (oy / H - 0.5) * -worldH;
      // MediaPipe z: more negative = closer to camera → larger world Z.
      const vz = OCC_BASE_Z - l.z * worldW * OCC_Z_GAIN;
      arr[i * 3] = vx; arr[i * 3 + 1] = vy; arr[i * 3 + 2] = vz;
      cx += vx; cy += vy; cz += vz;
    }
    const c = OCC_RING.length;
    arr[c * 3] = cx / c; arr[c * 3 + 1] = cy / c; arr[c * 3 + 2] = cz / c;
    pos.needsUpdate = true;
  }
}

// ── Camera stream ─────────────────────────────────────────────────────────────
if (!navigator.mediaDevices?.getUserMedia) {
  window.ReactNativeWebView?.postMessage(
    JSON.stringify({ type: 'cameraError', reason: 'unsupported' })
  );
  return;
}
navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: false,
}).then(stream => {
  video.srcObject = stream;
  video.play().catch(() => {});
}).catch(err => {
  window.ReactNativeWebView?.postMessage(
    JSON.stringify({ type: 'cameraError', reason: err.name || 'unknown' })
  );
});

// ── MediaPipe FaceMesh ────────────────────────────────────────────────────────
let faceFound = false;

function onResults(results) {
  if (results.multiFaceLandmarks?.length) {
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
  const fm = new FaceMesh({
    locateFile: f => 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/' + f,
  });
  fm.setOptions({
    maxNumFaces: 1, refineLandmarks: true,
    minDetectionConfidence: 0.55, minTrackingConfidence: 0.55,
  });
  fm.onResults(onResults);

  const cam = new Camera(video, {
    onFrame: async () => { await fm.send({ image: video }); },
    width: 640, height: 480,
  });
  cam.start()
    .then(() => { loading.style.display = 'none'; })
    .catch(e => { loading.innerHTML = 'Camera error:<br>' + e.message; });
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
  const [objText, setObjText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setObjText(null);
    setLoadError(false);
    fetch(OBJ_URI)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(setObjText)
      .catch(e => {
        console.warn('[TryOn] OBJ fetch failed:', e);
        setLoadError(true);
      });
  }, []);

  const html = useMemo(
    () => (objText ? buildHtml(glass, objText) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass.id, objText],
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

  if (!html && !loadError) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading glasses model…</Text>
      </View>
    );
  }

  if (loadError || !html) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Could not load model</Text>
        <Text style={styles.errorSub}>
          Make sure Metro bundler is running{'\n'}and the device is on the same
          network.
        </Text>
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
          <Text style={styles.glassName}>{glass.name}</Text>
          <Text style={styles.glassBrand}>
            {glass.brand} · ${glass.price}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>3D LIVE</Text>
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
