/**
 * GlassTryOnScene — real-time AR glasses try-on
 *
 * Uses the same oculos.obj as GlassModelScene:
 *  1. OBJ text fetched from Metro in the RN JS thread, embedded in HTML.
 *  2. Parsed + rendered by Three.js on an alpha-transparent canvas
 *     overlaid on the mirrored front-camera video.
 *  3. MediaPipe FaceMesh drives position / rotation / scale every frame.
 */
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Alert, Linking,
  ActivityIndicator, Image,
} from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Colors, FontSize, Spacing, BorderRadius } from '../theme';
import type { GlassItem } from '../types/navigation';

interface Props { glass: GlassItem; }

const OBJ_URI = Image.resolveAssetSource(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/models/oculos.obj'),
).uri;

function escapeObj(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/`/g,  '\\`')
    .replace(/\${/g, '\\${');
}

function buildHtml(glass: GlassItem, objText: string): string {
  const accentHex = Colors.primary;
  const safeObj   = escapeObj(objText);

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
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js"       crossorigin="anonymous"></script>

<script>
(function(){
'use strict';

const ACCENT     = '${accentHex}';
const GLASS_NAME = '${glass.name.replace(/'/g, "\\'")}';

const video   = document.getElementById('video');
const loading = document.getElementById('loading');
const status  = document.getElementById('status');

// ── Three.js — transparent overlay ───────────────────────────────────────────
const canvas   = document.getElementById('ar-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);   // fully transparent

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.001, 200);
camera.position.z = 10;

scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const key  = new THREE.DirectionalLight(0xfff8ee, 2.0); key.position.set(2, 4, 6);  scene.add(key);
const fill = new THREE.DirectionalLight(0xddeeff, 0.7); fill.position.set(-3, 1, 3); scene.add(fill);

const glassMat = new THREE.MeshPhysicalMaterial({
  color:      new THREE.Color('#0F0B08'),
  metalness:  0.60,
  roughness:  0.25,
  clearcoat:  0.70,
  clearcoatRoughness: 0.12,
});

// ── OBJ parser (same as GlassModelScene) ─────────────────────────────────────
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

// ── Parse + centre the model ──────────────────────────────────────────────────
let glassGroup  = null;
let MODEL_WIDTH = 1.0;   // raw X-span after centring (used for AR scale)

try {
  const geo = parseOBJ(\`${safeObj}\`);
  geo.computeBoundingBox();
  const box = geo.boundingBox;

  // Centre at origin
  const cx = (box.max.x + box.min.x) / 2;
  const cy = (box.max.y + box.min.y) / 2;
  const cz = (box.max.z + box.min.z) / 2;
  geo.translate(-cx, -cy, -cz);

  MODEL_WIDTH = box.max.x - box.min.x;   // width in raw OBJ units (≈1.547)

  const mesh = new THREE.Mesh(geo, glassMat);
  glassGroup = new THREE.Group();
  glassGroup.add(mesh);
  glassGroup.visible = false;
  scene.add(glassGroup);
} catch (e) {
  console.warn('OBJ parse error:', e.message);
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
  // Target = 90 % of temple span so the frame sits just inside the hairline.
  const lTemple = px(lm[234]);
  const rTemple = px(lm[454]);
  const templePx    = Math.abs(rTemple.x - lTemple.x);

  // ── Vertical position ─────────────────────────────────────────────────────
  // Nose-bridge landmark 6 sits right between the eyes on the bridge.
  // Place the glasses centre there — the frame naturally covers both eyes.
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
  // Real glasses span slightly beyond the temples — 1.05× gives a natural fit.
  const worldTemple = (templePx / W) * worldW;
  const targetWidth = worldTemple * 1.05;
  const scale       = targetWidth / MODEL_WIDTH;

  glassGroup.position.set(wX, wY, 0);
  glassGroup.scale.setScalar(scale);
  glassGroup.rotation.order = 'YXZ';
  // Negate yaw: MediaPipe reads unflipped pixels; the video is CSS-mirrored.
  // Without negation the glasses rotate opposite to the head turn direction.
  glassGroup.rotation.y = -yaw;
  glassGroup.rotation.x =  pitch;
  glassGroup.rotation.z = -roll;
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
  const [objText,   setObjText]   = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setObjText(null);
    setLoadError(false);
    fetch(OBJ_URI)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(setObjText)
      .catch(e => { console.warn('[TryOn] OBJ fetch failed:', e); setLoadError(true); });
  }, []);

  const html = useMemo(
    () => (objText ? buildHtml(glass, objText) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass.id, objText],
  );

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
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
  }, [openSettings]);

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
          Make sure Metro bundler is running{'\n'}and the device is on the same network.
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
          <Text style={styles.glassBrand}>{glass.brand} · ${glass.price}</Text>
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
  webview:   { flex: 1, backgroundColor: '#000' },

  center: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingHorizontal: Spacing.xl,
  },
  loadingText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  errorIcon:   { fontSize: 36, color: '#F7A440' },
  errorTitle:  { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  errorSub:    { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  glassInfo:  { flex: 1 },
  glassName:  { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  glassBrand: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1 },
});
