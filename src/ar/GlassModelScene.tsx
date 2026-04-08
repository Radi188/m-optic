import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import WebView from 'react-native-webview';
import type { GlassItem } from '../types/navigation';
import { Colors, FontSize, Spacing } from '../theme';

interface Props {
  glass: GlassItem;
}

// Use Image.resolveAssetSource so Metro gives us the correct server URL
// (works on simulators AND real devices — localhost would fail on device)
const OBJ_ASSET = Image.resolveAssetSource(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/models/TestMug.obj'),
);
const OBJ_METRO_URL = OBJ_ASSET.uri;

const STATUS_HEX: Record<string, string> = {
  'In Stock':     '#2DBD7E',
  'Low Stock':    '#F7A440',
  'Out of Stock': '#F05252',
};

function buildHtml(glass: GlassItem, objText: string): string {
  const accent  = STATUS_HEX[glass.status] ?? '#9C8178';
  // Escape only what can break a JS template literal inside the HTML blob
  const safeObj = objText
    .replace(/\\/g, '\\\\')
    .replace(/`/g,  '\\`')
    .replace(/\${/g, '\\${');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#0E0B09}
    canvas{display:block;width:100%!important;height:100%!important}
    #label{position:absolute;top:20px;left:0;right:0;text-align:center;pointer-events:none}
    #lname{color:#fff;font-family:-apple-system,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.3px}
    #lbrand{color:rgba(255,255,255,0.5);font-family:-apple-system,sans-serif;font-size:12px;margin-top:2px}
    #lprice{color:${Colors.primary};font-family:-apple-system,sans-serif;font-size:15px;font-weight:800;margin-top:4px}
    #info{position:absolute;bottom:20px;left:0;right:0;text-align:center;pointer-events:none;
      font-family:-apple-system,sans-serif;font-size:11px;color:rgba(255,255,255,0.35)}
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
// ─── Minimal inline OBJ parser — no CDN needed ───────────────────────────────
function parseOBJ(text) {
  const positions = [], normals = [], uvs = [];
  const posArr = [], normArr = [], uvArr = [];
  const objects = [];
  let currentObj = null;

  function newObj(name) {
    currentObj = { name: name || 'default', indices: [] };
    objects.push(currentObj);
  }
  newObj('default');

  const lines = text.split('\\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line[0] === '#') continue;
    const parts = line.split(/\\s+/);
    const cmd   = parts[0];

    if (cmd === 'v') {
      positions.push(+parts[1], +parts[2], +parts[3]);
    } else if (cmd === 'vn') {
      normals.push(+parts[1], +parts[2], +parts[3]);
    } else if (cmd === 'vt') {
      uvs.push(+parts[1], +parts[2] || 0);
    } else if (cmd === 'o' || cmd === 'g') {
      newObj(parts[1]);
    } else if (cmd === 'f') {
      // Fan-triangulate polygon faces
      const verts = parts.slice(1).map(tok => {
        const s = tok.split('/');
        return {
          vi: (+s[0] || 0) - 1,
          ui: s[1] ? (+s[1] || 0) - 1 : -1,
          ni: s[2] ? (+s[2] || 0) - 1 : -1,
        };
      });
      for (let t = 1; t < verts.length - 1; t++) {
        [verts[0], verts[t], verts[t+1]].forEach(v => {
          currentObj.indices.push(v.vi, v.ui, v.ni);
        });
      }
    }
  }

  // Build a BufferGeometry per object
  const group = new THREE.Group();

  objects.forEach(obj => {
    if (obj.indices.length === 0) return;
    const geo     = new THREE.BufferGeometry();
    const posData = [], normData = [], uvData = [];
    const idxTriples = obj.indices;

    for (let i = 0; i < idxTriples.length; i += 3) {
      const vi = idxTriples[i],     ui = idxTriples[i+1], ni = idxTriples[i+2];
      posData.push(
        positions[vi*3]   || 0,
        positions[vi*3+1] || 0,
        positions[vi*3+2] || 0,
      );
      if (ni >= 0 && normals.length) {
        normData.push(normals[ni*3]||0, normals[ni*3+1]||0, normals[ni*3+2]||0);
      }
      if (ui >= 0 && uvs.length) {
        uvData.push(uvs[ui*2]||0, uvs[ui*2+1]||0);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(posData, 3));
    if (normData.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(normData, 3));
    else geo.computeVertexNormals();
    if (uvData.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvData, 2));

    const mesh = new THREE.Mesh(geo);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  return group;
}

// ─── Scene setup ─────────────────────────────────────────────────────────────
(function(){
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputEncoding    = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0E0B09);
  scene.fog        = new THREE.Fog(0x0E0B09, 14, 32);

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.01, 100);
  camera.position.set(0, 0.5, 8);

  // Lights
  scene.add(new THREE.AmbientLight(0xfff4ee, 0.9));
  const key = new THREE.DirectionalLight(0xfff0e0, 1.5);
  key.position.set(4, 6, 5); key.castShadow = true; scene.add(key);
  const fill = new THREE.DirectionalLight(0xddeeff, 0.5);
  fill.position.set(-4, 2, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe8cc, 0.6);
  rim.position.set(0, -3, -4); scene.add(rim);
  const point = new THREE.PointLight(0x${accent.replace('#','')}, 1.2, 12);
  point.position.set(0, 2, 3); scene.add(point);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20,20),
    new THREE.MeshStandardMaterial({color:0x0e0b09,roughness:1,metalness:0})
  );
  ground.rotation.x=-Math.PI/2; ground.position.y=-1.4; ground.receiveShadow=true;
  scene.add(ground);

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.4,32),
    new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.4})
  );
  blob.rotation.x=-Math.PI/2; blob.position.y=-1.39;
  scene.add(blob);

  // Materials
  const frameMat = new THREE.MeshPhysicalMaterial({
    color:new THREE.Color('#9C8178'),
    metalness:0.55, roughness:0.28,
    clearcoat:0.5, clearcoatRoughness:0.15,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color:new THREE.Color('${accent}'),
    transparent:true, opacity:0.30,
    roughness:0.04, side:THREE.DoubleSide, depthWrite:false,
  });

  // ── Parse OBJ ──────────────────────────────────────────────────────────────
  let modelGroup = null;
  try {
    const objText = \`${safeObj}\`;
    const obj     = parseOBJ(objText);

    // Assign materials: sort children by vertex count, smallest = lenses
    const meshes = [];
    obj.traverse(c => { if(c.isMesh) meshes.push(c); });
    meshes.sort((a,b)=>
      (a.geometry.attributes.position?.count||0) -
      (b.geometry.attributes.position?.count||0)
    );
    const lensCount = Math.max(1, Math.floor(meshes.length * 0.2));
    meshes.forEach((m, i) => { m.material = i < lensCount ? lensMat : frameMat; });

    // Centre + scale to fill view
    const box = new THREE.Box3().setFromObject(obj);
    const cen = new THREE.Vector3();
    box.getCenter(cen);
    obj.position.sub(cen);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) obj.scale.setScalar(3.0 / maxDim);

    modelGroup = obj;
    scene.add(obj);
  } catch(e) {
    console.error('OBJ parse error:', e.message);
  }

  // ── Touch controls ────────────────────────────────────────────────────────
  let isDragging=false, autoRotate=true;
  let lastX=0, lastY=0, velX=0, velY=0;
  let rotX=0.15, rotY=0, lastPinch=0;

  renderer.domElement.addEventListener('touchstart', e=>{
    if(e.touches.length===1){
      isDragging=true; autoRotate=false;
      lastX=e.touches[0].clientX; lastY=e.touches[0].clientY;
    } else if(e.touches.length===2){
      lastPinch=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,
                           e.touches[1].clientY-e.touches[0].clientY);
    }
    e.preventDefault();
  },{passive:false});

  renderer.domElement.addEventListener('touchmove', e=>{
    if(e.touches.length===1&&isDragging){
      const dx=e.touches[0].clientX-lastX, dy=e.touches[0].clientY-lastY;
      velX=dy*0.007; velY=dx*0.007;
      rotX=Math.max(-0.8,Math.min(0.8,rotX+velX)); rotY+=velY;
      lastX=e.touches[0].clientX; lastY=e.touches[0].clientY;
    } else if(e.touches.length===2){
      const d=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,
                         e.touches[1].clientY-e.touches[0].clientY);
      camera.position.z=Math.max(1.5,Math.min(12,camera.position.z+(lastPinch-d)*0.015));
      lastPinch=d;
    }
    e.preventDefault();
  },{passive:false});

  renderer.domElement.addEventListener('touchend',()=>{ isDragging=false; });

  // ── Animate ───────────────────────────────────────────────────────────────
  let t=0;
  (function animate(){
    requestAnimationFrame(animate);
    t+=0.016;
    if(autoRotate){ rotY+=0.007; } else {
      velX*=0.90; velY*=0.90;
      if(Math.abs(velX)<0.0005&&Math.abs(velY)<0.0005) autoRotate=true;
    }
    if(modelGroup){
      modelGroup.rotation.x=rotX;
      modelGroup.rotation.y=rotY;
      modelGroup.position.y=Math.sin(t*0.55)*0.1;
    }
    point.intensity=0.9+Math.sin(t*1.1)*0.3;
    renderer.render(scene,camera);
  })();

  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
})();
</script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GlassModelScene: React.FC<Props> = ({ glass }) => {
  const [objText, setObjText] = useState<string | null>(null);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    setObjText(null);
    setError(false);
    fetch(OBJ_METRO_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(setObjText)
      .catch(e => { console.warn('OBJ fetch failed:', e); setError(true); });
  }, []);

  const html = useMemo(
    () => (objText ? buildHtml(glass, objText) : null),
    [glass.id, objText],
  );

  if (!html && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading 3D model…</Text>
      </View>
    );
  }

  if (error || !html) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Could not load model</Text>
        <Text style={styles.errorSub}>
          Make sure Metro bundler is running{'\n'}and the app is on the same network.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onError={e => console.warn('WebView error:', e.nativeEvent)}
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
  errorIcon:   { fontSize: 36, color: Colors.warning, marginBottom: Spacing.xs },
  errorTitle:  { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
  errorSub:    { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },
});
