/**
 * GlassModelScene — 3-D glasses viewer
 *
 * Loads oculos.obj via Metro asset server (fetch in RN JS thread → text
 * embedded in HTML → parsed inside WebView with Three.js).
 * Falls back to a procedural wayfarer if the fetch fails.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import WebView from 'react-native-webview';
import type { GlassItem } from '../types/navigation';
import { Colors, FontSize, Spacing } from '../theme';

interface Props { glass: GlassItem; }

// Metro gives us a server URL for the .obj asset
const OBJ_URI = Image.resolveAssetSource(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/models/oculos.obj'),
).uri;

const STATUS_HEX: Record<string, string> = {
  'In Stock':     '#2DBD7E',
  'Low Stock':    '#F7A440',
  'Out of Stock': '#F05252',
};

// Escape OBJ text so it can live inside a JS template-literal string
function escapeObj(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/`/g,  '\\`')
    .replace(/\${/g, '\\${');
}

function buildHtml(glass: GlassItem, objText: string): string {
  const accent  = STATUS_HEX[glass.status] ?? Colors.primary;
  const safeObj = escapeObj(objText);
  const accentNum = accent.replace('#', '');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#0E0B09}
    canvas{display:block;width:100%!important;height:100%!important}
    #label{position:absolute;top:20px;left:0;right:0;text-align:center;pointer-events:none}
    #lname {color:#fff;font-family:-apple-system,sans-serif;font-size:17px;font-weight:700;letter-spacing:-.3px}
    #lbrand{color:rgba(255,255,255,.5);font-family:-apple-system,sans-serif;font-size:12px;margin-top:2px}
    #lprice{color:${Colors.primary};font-family:-apple-system,sans-serif;font-size:15px;font-weight:800;margin-top:4px}
    #info{position:absolute;bottom:20px;left:0;right:0;text-align:center;pointer-events:none;
          font-family:-apple-system,sans-serif;font-size:11px;color:rgba(255,255,255,.35)}
  </style>
</head>
<body>
<div id="label">
  <div id="lname">${glass.name}</div>
  <div id="lbrand">${glass.brand}</div>
  <div id="lprice">$${glass.price}</div>
</div>
<div id="info">Drag to rotate · Pinch to zoom</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script>
(function(){
'use strict';

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x0E0B09);
scene.fog        = new THREE.Fog(0x0E0B09, 14, 32);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.001, 100);
camera.position.set(0, 0, 6);

// Lights
scene.add(new THREE.AmbientLight(0xfff4ee, 1.1));
const key  = new THREE.DirectionalLight(0xfff0e0, 1.8);  key.position.set(3,5,6);  scene.add(key);
const fill = new THREE.DirectionalLight(0xddeeff, 0.55); fill.position.set(-4,1,3); scene.add(fill);
const rim  = new THREE.DirectionalLight(0xffe8cc, 0.50); rim.position.set(0,-3,-4); scene.add(rim);
const aLight = new THREE.PointLight(0x${accentNum}, 1.1, 14);
aLight.position.set(0, 2, 3); scene.add(aLight);

// Material — single PBR material for the whole glasses mesh
const glassMat = new THREE.MeshPhysicalMaterial({
  color:      new THREE.Color('#0F0B08'),
  metalness:  0.60,
  roughness:  0.25,
  clearcoat:  0.70,
  clearcoatRoughness: 0.12,
});

// ── OBJ parser ────────────────────────────────────────────────────────────────
// Handles: v, vt, vn, f (tris and quads, any of v / v/vt / v//vn / v/vt/vn)
function parseOBJ(text) {
  const positions = [], normals = [], uvs = [];
  const posOut = [], normOut = [], uvOut = [];

  function addVert(tok) {
    const [vi, ti, ni] = tok.split('/').map(s => parseInt(s, 10) || 0);
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
    const line = rawLine.trim();
    if (!line || line[0] === '#') continue;
    const parts = line.split(/\\s+/);
    const cmd   = parts[0];
    if      (cmd === 'v')  positions.push(+parts[1], +parts[2], +parts[3]);
    else if (cmd === 'vn') normals.push(+parts[1], +parts[2], +parts[3]);
    else if (cmd === 'vt') uvs.push(+parts[1], +(parts[2] || 0));
    else if (cmd === 'f') {
      // Fan-triangulate: works for tris and quads
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

// ── Load model ────────────────────────────────────────────────────────────────
let modelMesh = null;

try {
  const geo = parseOBJ(\`${safeObj}\`);

  // Centre + scale to fill view nicely
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const cx  = (box.max.x + box.min.x) / 2;
  const cy  = (box.max.y + box.min.y) / 2;
  const cz  = (box.max.z + box.min.z) / 2;
  geo.translate(-cx, -cy, -cz);

  const spanX = box.max.x - box.min.x;
  const spanY = box.max.y - box.min.y;
  const spanZ = box.max.z - box.min.z;
  const maxDim = Math.max(spanX, spanY, spanZ);
  const scale  = 2.8 / maxDim;   // fill ~75% of view
  geo.scale(scale, scale, scale);

  modelMesh = new THREE.Mesh(geo, glassMat);
  scene.add(modelMesh);
} catch (e) {
  console.warn('OBJ parse error:', e.message);
}

// Ground blob shadow
const blob = new THREE.Mesh(
  new THREE.CircleGeometry(1.4, 32),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
);
blob.rotation.x = -Math.PI / 2;
blob.position.y = -1.4;
scene.add(blob);

// ── Touch controls ────────────────────────────────────────────────────────────
let dragging = false, autoRot = true;
let lastX = 0, lastY = 0, velX = 0, velY = 0;
let rotX = 0.18, rotY = 0, lastPinch = 0;

renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    dragging = true; autoRot = false;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    lastPinch = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    );
  }
  e.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && dragging) {
    const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
    velX = dy * 0.007; velY = dx * 0.007;
    rotX = Math.max(-0.8, Math.min(0.8, rotX + velX));
    rotY += velY;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    const d = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    );
    camera.position.z = Math.max(2, Math.min(14, camera.position.z + (lastPinch - d) * 0.018));
    lastPinch = d;
  }
  e.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener('touchend', () => { dragging = false; });

// ── Animate ───────────────────────────────────────────────────────────────────
let t = 0;
(function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  if (autoRot) {
    rotY += 0.007;
  } else {
    velX *= 0.88; velY *= 0.88;
    if (Math.abs(velX) < 0.0005 && Math.abs(velY) < 0.0005) autoRot = true;
  }
  if (modelMesh) {
    modelMesh.rotation.x = rotX;
    modelMesh.rotation.y = rotY;
    modelMesh.position.y = Math.sin(t * 0.55) * 0.06;
  }
  aLight.intensity = 0.9 + Math.sin(t * 1.1) * 0.2;
  renderer.render(scene, camera);
})();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

})();
</script>
</body>
</html>`;
}

// ─── Fallback HTML (no OBJ — shows a spinner-free error) ─────────────────────
function buildErrorHtml(): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#0E0B09;display:flex;align-items:center;justify-content:center;height:100vh">
<div style="color:rgba(255,255,255,.45);font-family:-apple-system,sans-serif;font-size:14px;text-align:center;line-height:1.8">
  Could not load model<br><span style="font-size:11px;opacity:.6">Make sure Metro is running</span>
</div></body></html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GlassModelScene: React.FC<Props> = ({ glass }) => {
  const [objText, setObjText] = useState<string | null>(null);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    setObjText(null);
    setError(false);
    fetch(OBJ_URI)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(setObjText)
      .catch(e => { console.warn('[3DModel] OBJ fetch failed:', e); setError(true); });
  }, []);

  const html = useMemo(
    () => (objText ? buildHtml(glass, objText) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass.id, glass.status, objText],
  );

  // Loading
  if (!html && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading 3D model…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: html ?? buildErrorHtml() }}
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
  container: { flex: 1, backgroundColor: '#0E0B09' },
  webview:   { flex: 1, backgroundColor: '#0E0B09' },
  center: {
    flex: 1, backgroundColor: '#0E0B09',
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingHorizontal: Spacing.xl,
  },
  loadingText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
});
