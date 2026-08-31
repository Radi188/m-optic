/**
 * GlassModelScene — 3-D glasses viewer
 *
 * Loads the default `essilor.glb` model: the GLB is fetched from the Metro
 * asset server on the RN JS thread, encoded as a base64 `data:` URI (see
 * ../ar/glassesModel) and parsed by Three.js `GLTFLoader` inside the WebView.
 *
 * The model's authored PBR materials are kept as-is (metal frame + transmissive
 * lenses), lit by a RoomEnvironment IBL so the reflections read correctly.
 *
 * The backdrop is a warm studio grey sweep (see STUDIO). Warm rather than
 * neutral, because the brand accent is a taupe (#9C8178) and the frame is pale
 * gold — a cold grey turns both of them green.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import WebView from 'react-native-webview';
import type { GlassItem } from '../types/navigation';
import { Colors, FontSize, Spacing } from '../theme';
import AppText from '../components/AppText';
import { useGlassesGlb } from './glassesModel';
import { GLB_SCRIPT_TAGS, GLB_HELPERS_JS } from './glassesModelWeb';

interface Props {
  glass: GlassItem;
}

/**
 * Studio backdrop. `top` → `bottom` is painted as a soft radial sweep behind the
 * model (as a real scene.background texture, so the transmissive lenses refract
 * it correctly); `mid` is the fog / RN container colour, and the two ink values
 * are the overlay text on top of it.
 */
const STUDIO = {
  top: '#EDEAE6',      // light warm grey, just above the model
  mid: '#CFC9C3',      // the colour the model actually sits against
  bottom: '#A79F99',   // grounded falloff at the base
  ink: '#2B2523',      // primary label
  inkSoft: 'rgba(43,37,35,0.52)',
  inkFaint: 'rgba(43,37,35,0.38)',
};

const STATUS_HEX: Record<string, string> = {
  'In Stock': '#2DBD7E',
  'Low Stock': '#F7A440',
  'Out of Stock': '#F05252',
};

/** Keeps model/brand names from breaking out of the HTML they're dropped into. */
function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(glass: GlassItem, glbDataUri: string): string {
  const accent = STATUS_HEX[glass.status] ?? Colors.primary;
  const accentNum = accent.replace('#', '');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:${STUDIO.mid}}
    canvas{display:block;width:100%!important;height:100%!important}
    #label{position:absolute;top:20px;left:0;right:0;text-align:center;pointer-events:none}
    #lname {color:${STUDIO.ink};font-family:-apple-system,sans-serif;font-size:17px;font-weight:700;letter-spacing:-.3px}
    #lbrand{color:${STUDIO.inkSoft};font-family:-apple-system,sans-serif;font-size:12px;margin-top:2px}
    #lprice{color:${Colors.primaryDark};font-family:-apple-system,sans-serif;font-size:15px;font-weight:800;margin-top:4px}
    #info{position:absolute;bottom:20px;left:0;right:0;text-align:center;pointer-events:none;
          font-family:-apple-system,sans-serif;font-size:11px;color:${STUDIO.inkFaint}}
    #boot{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;
          font-family:-apple-system,sans-serif;font-size:13px;color:${STUDIO.inkSoft};line-height:1.8}
    /* Floating controls, bottom-left — the exploded-view toggle. */
    #tools{position:absolute;left:18px;bottom:26px;display:flex;flex-direction:column;gap:12px;z-index:20}
    .tool{width:46px;height:46px;border-radius:23px;border:none;padding:0;
          display:flex;align-items:center;justify-content:center;
          background:rgba(43,37,35,0.08);border:1px solid rgba(43,37,35,0.14);
          color:${STUDIO.ink};cursor:pointer;-webkit-tap-highlight-color:transparent;
          transition:background .25s,color .25s}
    .tool.on{background:${STUDIO.ink};color:#F6F3EF;border-color:${STUDIO.ink}}
    .tool svg{width:22px;height:22px;display:block}
    #toolLabel{position:absolute;left:74px;bottom:37px;z-index:20;pointer-events:none;
               font-family:-apple-system,sans-serif;font-size:12px;font-weight:600;
               color:${STUDIO.inkSoft};opacity:0;transition:opacity .3s}
    #toolLabel.show{opacity:1}
    .spinner{width:32px;height:32px;border:3px solid rgba(43,37,35,.14);
             border-top-color:rgba(43,37,35,.55);border-radius:50%;
             animation:spin .8s linear infinite;margin:0 auto 10px}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
<div id="label">
  <div id="lname">${escapeHtml(glass.name)}</div>
  <div id="lbrand">${escapeHtml(glass.brand)}</div>
  <div id="lprice">$${escapeHtml(String(glass.price))}</div>
</div>
<div id="info">Drag to rotate · Pinch to zoom</div>
<div id="boot"><div class="spinner"></div>Loading 3D model…</div>
<div id="tools">
  <button id="spinBtn" class="tool" aria-label="Auto-rotate">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/>
      <path d="M20.6 4.2v4.4h-4.4"/>
    </svg>
  </button>
  <button id="explodeBtn" class="tool" aria-label="Exploded view">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2.5 19 6v.2L12 9.8 5 6.2V6z"/>
      <path d="M4 13.2 8.5 15.5 4 17.8 -0.5 15.5z" transform="translate(2.5,0)"/>
      <path d="M20 13.2 24.5 15.5 20 17.8 15.5 15.5z" transform="translate(-2.5,0)"/>
    </svg>
  </button>
</div>
<div id="toolLabel">Exploded view</div>
${GLB_SCRIPT_TAGS}
<script>
(function(){
'use strict';

${GLB_HELPERS_JS}

var GLB_DATA_URI = '${glbDataUri}';
var boot = document.getElementById('boot');

// ── Renderer ──────────────────────────────────────────────────────────────────
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding      = THREE.sRGBEncoding;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled   = false;
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();

// ── Studio backdrop ───────────────────────────────────────────────────────────
// Painted into a canvas and used as a real scene.background TEXTURE rather than
// a flat THREE.Color. Two reasons: a seamless sweep reads as a photo studio
// instead of a flat fill, and — because it is part of the scene — the
// transmissive lenses refract it, so clear glass stays legible instead of
// vanishing the way it does against a single solid colour.
function makeStudioBackdrop() {
  var c = document.createElement('canvas');
  c.width = 64; c.height = 512;         // sampled vertically, stretched across
  var ctx = c.getContext('2d');
  var g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0.00, '${STUDIO.top}');
  g.addColorStop(0.42, '${STUDIO.mid}');   // the model's own eye-line
  g.addColorStop(1.00, '${STUDIO.bottom}');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  var tex = new THREE.CanvasTexture(c);
  tex.encoding  = THREE.sRGBEncoding;   // matches renderer.outputEncoding
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
scene.background = makeStudioBackdrop();
scene.fog        = new THREE.Fog(0x${STUDIO.mid.slice(1)}, 14, 32);

var camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, 0, 6);

// ── Lights ────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xfff4ee, 0.7));
var key  = new THREE.DirectionalLight(0xfff0e0, 1.6);  key.position.set(3,5,6);  scene.add(key);
var fill = new THREE.DirectionalLight(0xddeeff, 0.55); fill.position.set(-4,1,3); scene.add(fill);
var rim  = new THREE.DirectionalLight(0xffe8cc, 0.50); rim.position.set(0,-3,-4); scene.add(rim);
// Status-coloured accent glow. Deliberately gentle: the same intensity that
// read as a tasteful rim on the old near-black scene stains a light grey
// backdrop with the status colour.
var aLight = new THREE.PointLight(0x${accentNum}, 0.45, 14);
aLight.position.set(0, 2, 3); scene.add(aLight);

// ── PBR environment — required for the metal frame + transmissive lenses ─────
try {
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
} catch (e) {
  console.warn('Environment map unavailable:', e.message);
}

// ── Contact shadow ────────────────────────────────────────────────────────────
// A soft radial falloff painted into a texture. The old version was a flat
// 45%-black disc, which disappeared into the near-black scene it was written
// for but reads as a hard blot on a light backdrop.
function makeShadowTexture() {
  var c = document.createElement('canvas');
  c.width = c.height = 128;
  var ctx = c.getContext('2d');
  var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0.00, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.20)');
  g.addColorStop(1.00, 'rgba(0,0,0,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
var blob = new THREE.Mesh(
  new THREE.PlaneGeometry(3.4, 3.4),
  new THREE.MeshBasicMaterial({
    map: makeShadowTexture(),
    transparent: true,
    depthWrite: false
  })
);
blob.rotation.x  = -Math.PI / 2;
blob.position.y  = -1.4;
blob.renderOrder = -1;
scene.add(blob);

// ── Load the GLB ──────────────────────────────────────────────────────────────
// essilor.glb is authored in real-world metres (~148 mm temple to temple), so
// it is scaled to fit the viewport rather than used at native size. The fit is
// derived from the camera frustum so it holds at any aspect ratio — a fixed
// scale that framed a wide viewport clipped a tall/narrow one.
//
// Fraction of the viewport width the model may span at its widest.
var FILL = 0.86;
// The model keeps spinning, so its widest on-screen extent is the larger of its
// X and Z spans, and its front face sits ~half its depth nearer the camera than
// the pivot — which magnifies it by roughly this much.
var PERSPECTIVE_BULGE = 1.35;

var modelPivot = null;
var modelSpin  = 1;   // max(size.x, size.z) of the loaded model, assembled

// ── Exploded view ────────────────────────────────────────────────────────────
var explodeParts = [];
var explodeSpin  = 1;   // the same measure with the parts fully apart
var explodeT     = 0;   // animated 0 → 1
var explodeTarget = 0;
// Where the frame turns to when it comes apart. Side-on: the parts separate
// along the temple axis, so face-on they would just line up behind each other.
var EXPLODE_VIEW_ROT_Y = Math.PI / 2;
var EXPLODE_VIEW_ROT_X = 0.06;

function fitModelToView() {
  if (!modelPivot) { return; }
  var vFOV   = camera.fov * Math.PI / 180;
  var worldH = 2 * Math.tan(vFOV / 2) * camera.position.z;
  var worldW = worldH * camera.aspect;
  // Blend towards the exploded extent as the parts separate, so the view pulls
  // back in step with them instead of letting them run off the edges.
  var spin = modelSpin + (explodeSpin - modelSpin) * explodeT;
  modelPivot.scale.setScalar((FILL * worldW) / (spin * PERSPECTIVE_BULGE));
}

loadGlassesGLB(GLB_DATA_URI).then(function (root) {
  hideFaceShadow(root);

  var centred = centreGlasses(root, 'bounds');
  modelPivot  = centred.pivot;
  modelSpin   = Math.max(centred.size.x, centred.size.z);

  explodeParts = collectExplodeParts(root, centred.size.x);
  explodeSpin  = measureExplodedSpan(root, explodeParts) || modelSpin;
  if (!explodeParts.length) {
    // Nothing to take apart — hide that one control rather than offer a dead
    // button. Only the explode button: auto-rotate works on any model.
    document.getElementById('explodeBtn').style.display = 'none';
  }

  fitModelToView();

  scene.add(modelPivot);
  boot.style.display = 'none';
}).catch(function (err) {
  console.warn('GLB load error:', err && err.message);
  boot.innerHTML = 'Could not load model<br><span style="font-size:11px;opacity:.6">' +
                   ((err && err.message) || 'unknown error') + '</span>';
});

// ── Touch controls ────────────────────────────────────────────────────────────
// The frame rests still by default and stays wherever the user leaves it. The
// spin is opt-in, from the auto-rotate button — a product that will not hold
// still is hard to actually look at.
var dragging = false, autoRot = false;
var lastX = 0, lastY = 0, velX = 0, velY = 0;
var rotX = 0.18, rotY = 0, lastPinch = 0;
var AUTO_ROT_SPEED = 0.007;   // radians per frame, about the vertical axis
var bobAmp = 0;               // idle float, eased in only while spinning

renderer.domElement.addEventListener('touchstart', function (e) {
  if (e.touches.length === 1) {
    dragging = true;
    setAutoRotate(false);
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    lastPinch = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    );
  }
  e.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener('touchmove', function (e) {
  if (e.touches.length === 1 && dragging) {
    var dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
    velX = dy * 0.007; velY = dx * 0.007;
    rotX = Math.max(-0.8, Math.min(0.8, rotX + velX));
    rotY += velY;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    var d = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    );
    camera.position.z = Math.max(2, Math.min(14, camera.position.z + (lastPinch - d) * 0.018));
    lastPinch = d;
  }
  e.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener('touchend', function () { dragging = false; });

// ── Tool buttons ──────────────────────────────────────────────────────────────
var explodeBtn = document.getElementById('explodeBtn');
var spinBtn    = document.getElementById('spinBtn');
var toolLabel  = document.getElementById('toolLabel');
var labelTimer = null;

function showToolLabel(text) {
  toolLabel.textContent = text;
  toolLabel.classList.add('show');
  clearTimeout(labelTimer);
  labelTimer = setTimeout(function () {
    toolLabel.classList.remove('show');
  }, 1400);
}

// Single place that owns the spin state, so the button, the explode toggle and
// a drag can all turn it off without their button styling drifting apart.
function setAutoRotate(on) {
  autoRot = on;
  spinBtn.classList.toggle('on', on);
  if (on) { velX = 0; velY = 0; }   // drop leftover flick momentum
}

spinBtn.addEventListener('click', function () {
  setAutoRotate(!autoRot);
  showToolLabel(autoRot ? 'Auto-rotate on' : 'Auto-rotate off');
});

explodeBtn.addEventListener('click', function () {
  var on = explodeTarget < 0.5;
  explodeTarget = on ? 1 : 0;
  explodeBtn.classList.toggle('on', on);

  if (on) {
    // Turn side-on so the separation is actually visible, and stop the spin —
    // a rotating exploded diagram is unreadable. Collapsing does NOT turn it
    // back on: the spin is the user's to switch, not ours.
    setAutoRotate(false);
    rotY = EXPLODE_VIEW_ROT_Y;
    rotX = EXPLODE_VIEW_ROT_X;
  }

  showToolLabel(on ? 'Exploded view' : 'Assembled');
});

// ── Animate ───────────────────────────────────────────────────────────────────
var t = 0;
(function animate() {
  requestAnimationFrame(animate);
  t += 0.016;

  // Ease towards the target rather than snapping, and re-fit every frame while
  // moving so the zoom-out tracks the parts as they travel.
  if (Math.abs(explodeTarget - explodeT) > 0.0005) {
    explodeT += (explodeTarget - explodeT) * 0.09;
    setExplode(explodeParts, explodeT * explodeT * (3 - 2 * explodeT));
    fitModelToView();
  }

  if (autoRot) {
    rotY += AUTO_ROT_SPEED;   // horizontal, about the vertical axis
  } else if (!dragging) {
    // Carry a flick on and ease it out. This used to only count down to
    // re-enabling the spin by itself; now it is the actual glide, and it ends
    // with the frame parked wherever it came to rest.
    if (Math.abs(velX) > 0.00005 || Math.abs(velY) > 0.00005) {
      rotX = Math.max(-0.8, Math.min(0.8, rotX + velX));
      rotY += velY;
      velX *= 0.92; velY *= 0.92;
    }
  }

  if (modelPivot) {
    modelPivot.rotation.x = rotX;
    modelPivot.rotation.y = rotY;
    // The idle float belongs to the spin: a frame that is meant to be standing
    // still should not bob.
    bobAmp += ((autoRot ? 1 : 0) - bobAmp) * 0.06;
    modelPivot.position.y = Math.sin(t * 0.55) * 0.06 * bobAmp;
  }
  aLight.intensity = 0.40 + Math.sin(t * 1.1) * 0.10;
  renderer.render(scene, camera);
})();

window.addEventListener('resize', function () {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  fitModelToView();   // the fit depends on aspect, so re-derive it
});

})();
</script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GlassModelScene: React.FC<Props> = ({ glass }) => {
  // The product's own .glb when the shop has uploaded one; the bundled
  // essilor.glb otherwise.
  const { dataUri, error } = useGlassesGlb(glass.modelUrl);

  const html = useMemo(
    () => (dataUri ? buildHtml(glass, dataUri) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass.id, glass.status, dataUri],
  );

  if (error) {
    return (
      <View style={styles.center}>
        <AppText style={styles.errorIcon}>⚠</AppText>
        <AppText style={styles.errorTitle}>Could not load model</AppText>
        <AppText style={styles.loadingText}>
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
        <AppText style={styles.loadingText}>Loading 3D model…</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html, baseUrl: 'http://localhost' }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onError={e => console.warn('[3DModel] WebView error:', e.nativeEvent)}
      />
    </View>
  );
};

export default GlassModelScene;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: STUDIO.mid },
  webview: { flex: 1, backgroundColor: STUDIO.mid },
  center: {
    flex: 1,
    backgroundColor: STUDIO.mid,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: STUDIO.inkSoft,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorIcon: { fontSize: 36, color: '#B4761F' },
  errorTitle: { fontSize: FontSize.md, fontWeight: '700', color: STUDIO.ink },
});
