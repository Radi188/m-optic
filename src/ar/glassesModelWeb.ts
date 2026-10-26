/**
 * glassesModelWeb — WebView-side (Three.js) helpers for the glasses GLB.
 *
 * These are plain strings injected into the generated HTML of both
 * `GlassModelScene` (product viewer) and `GlassTryOnScene` (AR try-on), so the
 * GLB loading / centring / temple-fade logic lives in exactly one place.
 *
 * Three r134 is used because it is the last line that still ships the
 * non-module `examples/js` builds. Its GLTFLoader supports every extension this
 * file declares, including the two *required* ones (KHR_mesh_quantization,
 * EXT_texture_webp).
 */

/** CDN <script> tags: three + GLTFLoader + RoomEnvironment (for PBR lighting). */
export const GLB_SCRIPT_TAGS = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/loaders/GLTFLoader.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/environments/RoomEnvironment.js" crossorigin="anonymous"></script>
`;

/**
 * Helper functions available to the page after injection:
 *   loadGlassesGLB(dataUri)            -> Promise<THREE.Group>  (gltf.scene)
 *   centreGlasses(root, zMode)         -> { pivot, size }
 *   frontWidth(root, fullWidth)        -> width of the front, without the arms
 *   findLens(root)                     -> the lens group, by GLB_NODE or by name
 *   hasNamedTemples(root)              -> whether the arms are separate groups
 *   softenNosePads(root, opacity)
 *   setupArmClipping(root, frontW, hingeDepth) -> clip state, for models whose
 *                                         arms are part of the frame mesh
 *   updateArmClipping(clip, group, hide) hide: 'both' | 'left' | 'right'
 *   collectTemples(root)               -> { templeL, matsL, templeR, matsR, mats }
 *   frontAlwaysOnTop(root)
 *   makeHeadOccluder()                 -> THREE.Mesh (depth-only ellipsoid)
 *   updateHeadOccluder(mesh, pose, cfg)
 *   hideFaceShadow(root)
 *   simplifyLenses(root, opacity)
 *   collectExplodeParts(root, modelWidth) -> parts[]
 *   setExplode(parts, t)               t = 0 assembled … 1 apart
 *   measureExplodedFraming(root, parts) -> { span, shift } for framing it
 */
export const GLB_HELPERS_JS = `
// Named nodes authored into essilor.glb (glTF-Transform / Luxottica export).
var GLB_NODE = {
  root:     'Root_Glasses_GRP',
  frame:    'Frame_GRP',
  lens:     'Lens_GRP',
  logoLens: 'LogoLens_GRP',
  templeL:  'Temple_L_Locator_GRP',
  templeR:  'Temple_R_Locator_GRP',
  extras:   'Extras_GRP'
};

function loadGlassesGLB(dataUri) {
  return new Promise(function (resolve, reject) {
    if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
      reject(new Error('GLTFLoader unavailable'));
      return;
    }
    new THREE.GLTFLoader().load(
      dataUri,
      function (gltf) { resolve(gltf.scene); },
      undefined,
      function (err) { reject(err || new Error('GLTF parse failed')); }
    );
  });
}

// Wraps the model in a pivot group and offsets it so the pivot is a useful
// origin. zMode 'bounds' centres the whole model (product viewer framing);
// zMode 'lens' puts the front face of the lenses at z = 0, so the temple arms
// extend backwards along -Z behind the wearer's face (AR try-on).
function centreGlasses(root, zMode) {
  var pivot = new THREE.Group();
  pivot.add(root);

  root.updateWorldMatrix(true, true);
  var box  = new THREE.Box3().setFromObject(root);
  var mid  = box.getCenter(new THREE.Vector3());
  var size = box.getSize(new THREE.Vector3());

  var zRef = mid.z;
  if (zMode === 'lens') {
    var lens = findLens(root);
    // No lens to measure from: the front of the model is the next best
    // reference. Its middle is not — the arms run far back, so the middle
    // sits halfway down them and the frame floated off the face.
    zRef = lens ? new THREE.Box3().setFromObject(lens).max.z : box.max.z;
  }
  root.position.set(-mid.x, -mid.y, -zRef);
  return { pivot: pivot, size: size };
}

// ── Models without the named groups ──────────────────────────────────────────
// Not every product GLB is authored with Frame_GRP / Lens_GRP / Temple_*_GRP.
// Some arrive as a few plain meshes, e.g. 'lens', 'nose.001' and one mesh for
// the whole frame with its arms. Parts are then found by name instead.
var NAME_LENS = /lens/i;
var NAME_LOGO = /logo/i;
var NAME_NOSE = /nose|pad/i;

function meshNamed(o, re) {
  if (re.test(o.name || '')) { return true; }
  var ms = Array.isArray(o.material) ? o.material : [o.material];
  return ms.some(function (m) { return m && re.test(m.name || ''); });
}

function findLens(root) {
  var named = root.getObjectByName(GLB_NODE.lens);
  if (named) { return named; }
  var hit = null;
  root.traverse(function (o) {
    if (!hit && o.isMesh && meshNamed(o, NAME_LENS) && !meshNamed(o, NAME_LOGO)) { hit = o; }
  });
  return hit;
}

function hasNamedTemples(root) {
  return !!(root.getObjectByName(GLB_NODE.templeL) || root.getObjectByName(GLB_NODE.templeR));
}

// Nose pads are clear silicone. Models author them as an opaque, metallic
// white, which reads as two bright white blobs on the nose in the try-on.
function softenNosePads(root, opacity) {
  var soft = null;
  root.traverse(function (o) {
    if (!o.isMesh || !meshNamed(o, NAME_NOSE)) { return; }
    soft = soft || new THREE.MeshStandardMaterial({
      color:       0xd8dcdf,
      metalness:   0,
      roughness:   0.35,
      transparent: true,
      opacity:     opacity,
      depthWrite:  false,
      depthTest:   false   // the pads always sit in front of the face
    });
    o.material  = soft;
    o.renderOrder = 3;
  });
}

// Arm hiding for a model whose arms are part of the frame mesh. Three.js
// clipping planes, in the glasses' own space (lens front at z = 0, +X = the
// wearer's left), cut away:
//   - head-on: everything behind the hinges (both arms run back behind the
//     head, which the camera cannot see);
//   - turned:  only the far arm (far side AND behind the hinges), so the near
//     arm shows at full length.
// Both planes are always set with clipIntersection, so the program never has
// to be rebuilt: head-on simply passes the hinge plane twice.
function setupArmClipping(root, frontW, hingeDepth) {
  var mats = [];
  root.traverse(function (o) {
    if (!o.isMesh || meshNamed(o, NAME_LENS) || meshNamed(o, NAME_NOSE)) { return; }
    var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function (m) { if (mats.indexOf(m) === -1) { mats.push(m); } });
  });
  var local = {
    hinge: new THREE.Plane(new THREE.Vector3(0, 0, 1), hingeDepth * frontW),
    left:  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),   // clips x > 0
    right: new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)     // clips x < 0
  };
  var planes = [new THREE.Plane(), new THREE.Plane()];
  mats.forEach(function (m) {
    m.clippingPlanes   = planes;
    m.clipIntersection = true;
  });
  return { mats: mats, local: local, planes: planes };
}

// hide: 'both' | 'left' | 'right' — which arm(s) to cut away this frame.
function updateArmClipping(clip, group, hide) {
  group.updateWorldMatrix(true, false);
  var second = hide === 'left' ? clip.local.left
             : hide === 'right' ? clip.local.right
             : clip.local.hinge;
  clip.planes[0].copy(clip.local.hinge).applyMatrix4(group.matrixWorld);
  clip.planes[1].copy(second).applyMatrix4(group.matrixWorld);
}

// Width of the frame FRONT only — lenses, rims, bridge and hinges — leaving out
// the temple arms and the Extras group. The arms often splay wider than the
// front, so the whole model's bounding box overstates the width a frame
// measurement (hinge to hinge) describes.
//
// Call after centreGlasses(root, 'lens'), with the pivot not yet parented: the
// lens front is then at z = 0 in world space.
var FRONT_BAND = 0.08;   // depth behind the lens front that still counts as front

function frontWidth(root, fullWidth) {
  var skip = [
    root.getObjectByName(GLB_NODE.templeL),
    root.getObjectByName(GLB_NODE.templeR),
    root.getObjectByName(GLB_NODE.extras)
  ].filter(Boolean);
  if (!skip.length) { return frontWidthByDepth(root, fullWidth); }

  function skipped(o) {
    for (var p = o; p; p = p.parent) {
      if (skip.indexOf(p) !== -1) { return true; }
    }
    return false;
  }

  root.updateWorldMatrix(true, true);
  var box = new THREE.Box3();
  root.traverse(function (o) {
    if (o.isMesh && !skipped(o)) { box.expandByObject(o); }
  });
  var w = box.isEmpty() ? 0 : box.max.x - box.min.x;
  return w > 0 ? w : fullWidth;
}

// Arms that are part of the frame mesh cannot be left out by name, so the
// front is measured as every vertex within FRONT_BAND of the lens front. The
// arms only start there, and splay out further back.
function frontWidthByDepth(root, fullWidth) {
  root.updateWorldMatrix(true, true);
  var band = -FRONT_BAND * fullWidth;
  var v = new THREE.Vector3();
  var minX = Infinity, maxX = -Infinity;
  root.traverse(function (o) {
    var pos = o.isMesh && o.geometry && o.geometry.attributes.position;
    if (!pos) { return; }
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.z < band) { continue; }
      if (v.x < minX) { minX = v.x; }
      if (v.x > maxX) { maxX = v.x; }
    }
  });
  var w = maxX - minX;
  return w > 0 && w <= fullWidth ? w : fullWidth;
}

// The GLB carries a 'Shadow_GEO' plane under Extras_GRP meant for a baked
// face-shadow composite. It reads as a stray grey quad in both of our scenes.
function hideFaceShadow(root) {
  var extras = root.getObjectByName(GLB_NODE.extras);
  if (extras) { extras.visible = false; }
}

// Grabs the two temple (arm) groups and clones their materials so their opacity
// can be animated PER SIDE without touching the frame — several temple meshes
// share the frame's 'PaleGold_060_Glossy_GLTF' material instance.
//
// The arms keep depthTest on (they must be hidden by the head occluder) but
// never write depth, so a half-faded arm cannot punch a hole in the frame.
function collectTemples(root) {
  var all = [];

  function prepare(group) {
    if (!group) { return { group: null, mats: [] }; }
    var mats = [];
    group.traverse(function (o) {
      if (!o.isMesh) { return; }
      var src = Array.isArray(o.material) ? o.material : [o.material];
      var cloned = src.map(function (m) {
        var c = m.clone();
        c.transparent = true;
        c.opacity     = 0;
        c.depthTest   = true;    // occluded by the head proxy
        c.depthWrite  = false;
        mats.push(c);
        all.push(c);
        return c;
      });
      o.material    = Array.isArray(o.material) ? cloned : cloned[0];
      o.renderOrder = 2;
    });
    return { group: group, mats: mats };
  }

  var L = prepare(root.getObjectByName(GLB_NODE.templeL));
  var R = prepare(root.getObjectByName(GLB_NODE.templeR));

  return {
    templeL: L.group, matsL: L.mats,
    templeR: R.group, matsR: R.mats,
    mats: all
  };
}

// The front of the glasses (frame + lenses) is always nearer the camera than
// the head itself, so it opts out of depth testing entirely. That frees the
// head occluder below to be a generous, full head-sized volume — it only has to
// be right for the temple arms, and can poke through the nose without ever
// clipping the frame.
function frontAlwaysOnTop(root) {
  var frame = root.getObjectByName(GLB_NODE.frame);
  if (frame) {
    frame.traverse(function (o) {
      if (!o.isMesh) { return; }
      var ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(function (m) { m.depthTest = false; m.depthWrite = false; });
      o.renderOrder = 1;
    });
  }
  var logo = root.getObjectByName(GLB_NODE.logoLens);
  if (logo) {
    logo.traverse(function (o) {
      if (!o.isMesh) { return; }
      var ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(function (m) { m.depthTest = false; m.depthWrite = false; });
      o.renderOrder = 4;
    });
  }
}

// ── Head occluder ────────────────────────────────────────────────────────────
// An invisible, depth-only ellipsoid standing in for the wearer's head. The old
// occluder was a flat cap fanned from the face-oval landmarks and pushed BEHIND
// the lenses, which is why a temple arm swinging past the cheek was drawn on
// top of the face: the cap sat further from the camera than the arm did.
//
// A head is a volume, not a plane. This proxy has real depth and real width, so
// the arm on the far side of a turned head is genuinely inside it (hidden), and
// the near arm only re-appears once it has actually cleared the cheek.
function makeHeadOccluder() {
  var geo = new THREE.SphereGeometry(1, 24, 16);
  var mat = new THREE.MeshBasicMaterial({ colorWrite: false });   // depth only
  var mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder   = 0;      // before the glasses (renderOrder 1+)
  mesh.frustumCulled = false;
  return mesh;
}

// cfg: { width, height, depth, back, down } — semi-axes and the centre offset,
// all as fractions of the measured face width. Oriented by the head basis, so
// the proxy rolls / pitches / yaws exactly with the wearer.
function updateHeadOccluder(mesh, pose, cfg) {
  var fw = pose.faceWidth;
  mesh.quaternion.copy(pose.quaternion);
  mesh.scale.set(cfg.width * fw, cfg.height * fw, cfg.depth * fw);
  mesh.position.copy(pose.position)
    .addScaledVector(pose.zAxis, -cfg.back * fw)
    .addScaledVector(pose.yAxis, -cfg.down * fw);
}

// ── Exploded view ────────────────────────────────────────────────────────────
// Separates the frame into its parts along the temple axis, the way an optician
// lays a frame out: temples pulled back off the hinges, lenses lifted forward
// out of the rims, the front left in place as the anchor.
//
// The offsets are fractions of the model's own width, so they hold whatever
// frame is loaded. Every node here is part of the Luxottica naming convention
// the supplier exports (verified on both the bundled essilor.glb and the
// per-product .glb files the API serves) — and each one is optional, so a model
// missing a part simply contributes nothing.
//
// Offsets are applied to node.position, which is in the PARENT's space. All of
// these nodes hang off identity-transform parents (Root_Glasses_GRP, Lens_GRP),
// so the offsets act along the model's own axes: +X wearer's left, +Y up,
// +Z out of the face.
//
// Every part moves along ONE axis — the temple axis the frame is built on — and
// nothing is pushed sideways or vertically, so the pieces stay in a straight
// line with the frame instead of scattering. Small offsets: every neighbouring
// pair clears by 4-6 mm on a ~145 mm frame — enough to show the frame is made
// of separate pieces without throwing them apart. Solved against both the
// bundled and the API model, because a lens that still intersects its rim on
// one of them is the thing that reads as "not clean".
//
// lead = where the part starts moving on a 0-1 timeline: the temples come off
// first and the lenses follow, so the frame reads as being taken apart rather
// than everything sliding at once.
var EXPLODE_PARTS = [
  // Lenses lift forward out of the rims, the near one a little past the far one.
  { name: 'Lens_L_GEO', offset: [0, 0, 0.175], lead: 0.28 },
  { name: 'Lens_R_GEO', offset: [0, 0, 0.09], lead: 0.28 },
  { name: 'LogoLens_L_GEO', offset: [0, 0, 0.175], lead: 0.28 },
  { name: 'LogoLens_R_GEO', offset: [0, 0, 0.09], lead: 0.28 },
  // Temples slide straight back off their hinges, staying on the frame's line.
  { name: 'Temple_L_Locator_GRP', offset: [0, 0, -0.05], lead: 0 },
  { name: 'Temple_R_Locator_GRP', offset: [0, 0, -0.10], lead: 0 }
];

function explodeEase(t) {
  return t * t * (3 - 2 * t);
}

function collectExplodeParts(root, modelWidth) {
  var parts = [];
  for (var i = 0; i < EXPLODE_PARTS.length; i++) {
    var spec = EXPLODE_PARTS[i];
    var node = root.getObjectByName(spec.name);
    if (!node) { continue; }        // frame does not have this part
    parts.push({
      node: node,
      home: node.position.clone(),
      lead: spec.lead || 0,
      delta: new THREE.Vector3(
        spec.offset[0] * modelWidth,
        spec.offset[1] * modelWidth,
        spec.offset[2] * modelWidth
      )
    });
  }
  return parts;
}

/**
 * t = 0 assembled, 1 fully apart. Each part eases across its own slice of the
 * timeline (see lead), so pass a plain linear t — the shaping happens here.
 */
function setExplode(parts, t) {
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var local = (t - p.lead) / (1 - p.lead);
    local = local < 0 ? 0 : (local > 1 ? 1 : local);
    p.node.position.copy(p.home).addScaledVector(p.delta, explodeEase(local));
  }
}

/**
 * How the exploded model needs to be framed. Measured by actually exploding it
 * and boxing the result, rather than derived from the offsets — the parts have
 * real size, so the arithmetic would understate it and the view would overflow.
 *
 *   span  — widest extent when apart, for the fit
 *   shift — how far the centre of mass moves. The pivot sits at the ASSEMBLED
 *           centre, and the parts do not travel symmetrically (both temples go
 *           back, both lenses forward but by less), so without countering this
 *           the whole thing drifts off-centre as it opens.
 */
function measureExplodedFraming(root, parts) {
  var zero = { span: 0, shift: new THREE.Vector3() };
  if (!parts.length) { return zero; }

  root.updateWorldMatrix(true, true);
  var assembled = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());

  setExplode(parts, 1);
  root.updateWorldMatrix(true, true);
  var box = new THREE.Box3().setFromObject(root);
  var size = box.getSize(new THREE.Vector3());
  var centre = box.getCenter(new THREE.Vector3());

  setExplode(parts, 0);
  root.updateWorldMatrix(true, true);

  return { span: Math.max(size.x, size.z), shift: centre.sub(assembled) };
}

// KHR_materials_transmission lenses sample Three's transmission render target,
// which does NOT contain the <video> element sitting behind the alpha canvas.
// On the AR overlay that makes the lenses read as dark grey blanks, so swap
// transmission for plain alpha there. (The product viewer keeps real
// transmission, since it renders against an opaque background.)
function simplifyLenses(root, minAlpha) {
  var g = findLens(root);
  if (!g) { return; }
  // NOTE: mutating the authored material does NOT work. Once three has built a
  // material from KHR_materials_transmission it keeps drawing it through the
  // transmission pass, where opacity is ignored — setting transmission = 0
  // and opacity = 0 still renders a fully opaque lens. Building a fresh
  // material is the only reliable way to get a blended one.
  //
  // Only the lenses themselves are touched. LogoLens_GRP is the etched brand
  // decal, already authored as an alphaMode:BLEND texture; forcing an opacity
  // onto it just dims the logo.
  var swapped = [];   // [source, replacement] so both lenses share one material

  function replacementFor(src) {
    for (var i = 0; i < swapped.length; i++) {
      if (swapped[i][0] === src) { return swapped[i][1]; }
    }
    // Scale the substitute alpha by how transmissive the lens really is: a
    // clear prescription lens (transmission 1, as in essilor.glb) stays nearly
    // invisible, while a dark sunglass lens keeps most of its tint.
    var t = src.transmission === undefined ? 0 : src.transmission;
    var a = minAlpha + (1 - t) * (0.6 - minAlpha);
    var m = new THREE.MeshPhysicalMaterial({
      color:       src.color ? src.color.clone() : new THREE.Color(0xffffff),
      map:         src.map || null,      // keeps a tinted/gradient lens faithful
      metalness:   0,
      roughness:   0.08,                 // glossy, so the environment reads as glass
      transparent: true,
      opacity:     Math.min(1, Math.max(0, a)),
      depthWrite:  false,
      depthTest:   false,        // the lenses are always in front of the head
      side:        src.side
    });
    if (src.envMapIntensity !== undefined) { m.envMapIntensity = src.envMapIntensity; }
    swapped.push([src, m]);
    return m;
  }

  g.traverse(function (o) {
    if (!o.isMesh) { return; }
    o.material = Array.isArray(o.material)
      ? o.material.map(replacementFor)
      : replacementFor(o.material);
    o.renderOrder = 3;
  });
}

`;

/**
 * Head-pose solver for the AR try-on.
 *
 * The previous version derived yaw / pitch / scale from ad-hoc 2-D pixel
 * heuristics, which had two structural faults: the temple-to-temple width was
 * measured on the PROJECTED landmarks (so the glasses shrank as the head
 * turned), and pitch was a pixel gap divided by screen height (so the glasses
 * tilted differently depending on how close the user sat).
 *
 * This builds a proper orthonormal head basis from the 3-D landmarks instead,
 * giving position, orientation and scale that are all invariant to distance and
 * to head rotation.
 *
 * `view` carries the video->world mapping:
 *   { W, H, dispW, dispH, offX, offY, worldW, worldH, worldVideoW }
 */
export const HEAD_POSE_JS = `
var HEAD_LM = {
  earR:   234,   // face-oval extreme, wearer's right
  earL:   454,   // face-oval extreme, wearer's left
  brow:    10,   // top of forehead
  chin:   152,   // bottom of chin
  bridge:   6,   // nose bridge, between the eyes
  noseTip:  1,
  // Iris centres. Only present when FaceMesh runs with refineLandmarks:true
  // (it does here) — the 478-point model appends 468..472 / 473..477.
  irisL:  468,
  irisR:  473,
  // Eye-corner fallback for the 468-point model, averaged to the same line.
  cornerRO: 33, cornerRI: 133, cornerLI: 362, cornerLO: 263
};

// Where the glasses sit relative to the head basis, in units of face width.
// Positive Z is out of the face towards the camera.
//
// DEPTH comes from the nose bridge (landmark 6) — that is where real glasses
// physically rest, and it is the most forward-stable point on the face.
// HEIGHT comes from the measured pupil line instead. Deriving height from the
// bridge too meant guessing how far below landmark 6 the eyes sit, and the
// guess ran ~6 mm low, which is what made the frame sit under the eyes.
var BRIDGE_FORWARD = 0.06;   // stand the lenses off the nose bridge
// How far BELOW the pupil line the lens centre sits, in face widths. Real
// dispensing puts the pupil at ~57% of lens height rather than dead centre, so
// the lens centre is a little under the pupil — about 3 mm on a 145 mm face.
var EYE_DROP = 0.02;

var _hp = {
  earL: null, earR: null, brow: null, chin: null, bridge: null,
  eye: null, eyeAcc: null, tmp: null,
  x: null, y: null, z: null, m: null
};

function headPoseInit() {
  if (_hp.earL) { return; }
  _hp.earL = new THREE.Vector3(); _hp.earR = new THREE.Vector3();
  _hp.brow = new THREE.Vector3(); _hp.chin = new THREE.Vector3();
  _hp.bridge = new THREE.Vector3();
  _hp.eye = new THREE.Vector3(); _hp.eyeAcc = new THREE.Vector3();
  _hp.tmp = new THREE.Vector3();
  _hp.x = new THREE.Vector3(); _hp.y = new THREE.Vector3(); _hp.z = new THREE.Vector3();
  _hp.m = new THREE.Matrix4();
}

// Midpoint of the two pupils, in UNMIRRORED world space (same convention as
// landmarkToWorld). Prefers the refined iris centres and falls back to the mean
// of the four eye corners, which lands on the same line to within a millimetre.
function eyeLineToWorld(lm, view, out) {
  out.set(0, 0, 0);
  var pts;
  if (lm.length > HEAD_LM.irisR) {
    pts = [HEAD_LM.irisL, HEAD_LM.irisR];
  } else {
    pts = [HEAD_LM.cornerRO, HEAD_LM.cornerRI, HEAD_LM.cornerLI, HEAD_LM.cornerLO];
  }
  for (var i = 0; i < pts.length; i++) {
    out.add(landmarkToWorld(lm[pts[i]], view, _hp.eyeAcc));
  }
  return out.multiplyScalar(1 / pts.length);
}

// Landmark -> world space, UNMIRRORED. MediaPipe normalises x/y to the CAMERA
// FRAME and scales z like x, so all three convert through the video's world
// size. The mirror is deliberately NOT applied here: reflecting the points
// first would make the head basis left-handed, which is not a rotation. The
// mirror is applied to the finished pose instead (see below).
function landmarkToWorld(l, view, out) {
  var sx = view.offX + l.x * view.dispW;
  var sy = view.offY + l.y * view.dispH;
  return out.set(
    (sx / view.W - 0.5) *  view.worldW,
    (sy / view.H - 0.5) * -view.worldH,
    -l.z * view.worldVideoW
  );
}

function headPose(lm, view, out) {
  headPoseInit();
  var r = out || {};

  var earL = landmarkToWorld(lm[HEAD_LM.earL], view, _hp.earL);
  var earR = landmarkToWorld(lm[HEAD_LM.earR], view, _hp.earR);
  var brow = landmarkToWorld(lm[HEAD_LM.brow], view, _hp.brow);
  var chin = landmarkToWorld(lm[HEAD_LM.chin], view, _hp.chin);
  var bridge = landmarkToWorld(lm[HEAD_LM.bridge], view, _hp.bridge);

  // Face width in 3-D, so turning the head does not shrink the glasses.
  var faceWidth = earL.distanceTo(earR);

  // Basis: X along the temple line towards the wearer's left, Y up the face,
  // Z out of the face towards the camera. Re-derived through cross products so
  // the result is orthonormal and right-handed however noisy the raw landmark
  // triangle is. These align with the model's own axes (Eyerim_L sits at +X,
  // the frame front faces +Z), so no extra axis remap is needed.
  var x0 = _hp.x.subVectors(earL, earR);
  var y0 = _hp.y.subVectors(brow, chin);
  var z  = _hp.z.crossVectors(x0, y0).normalize();
  var x  = x0.crossVectors(y0, z).normalize();
  var y  = y0.crossVectors(z, x).normalize();

  // Anchor: nose bridge for the side-to-side and forward placement, but the
  // measured pupil line for the height. rise = how far up the head's own Y
  // axis the eyes sit above the bridge landmark — measured per frame, per face,
  // instead of assumed — so the lens centres land on the eyes for any face.
  var eye  = eyeLineToWorld(lm, view, _hp.eye);
  var rise = _hp.tmp.subVectors(eye, bridge).dot(y);

  var fwd  = view.bridgeForward !== undefined ? view.bridgeForward : BRIDGE_FORWARD;
  var drop = view.eyeDrop       !== undefined ? view.eyeDrop       : EYE_DROP;
  var pos = (r.position || new THREE.Vector3())
    .copy(bridge)
    .addScaledVector(y, rise)                  // up onto the pupil line
    .addScaledVector(z, fwd  * faceWidth)      // out off the face
    .addScaledVector(y, -drop * faceWidth);    // lens centre just under the pupil

  _hp.m.makeBasis(x, y, z);
  var q = (r.quaternion || new THREE.Quaternion()).setFromRotationMatrix(_hp.m);

  // Apply the mirror (the video is CSS-flipped) to the finished pose.
  // Reflecting a rotation across the plane x = 0 negates the y and z parts of
  // its quaternion, which flips yaw and roll but leaves pitch alone — exactly
  // what a mirror does to a head. Skipped when the canvas itself is CSS-flipped
  // along with the video (view.mirror === false).
  if (view.mirror !== false) {
    q.set(q.x, -q.y, -q.z, q.w);
    pos.x = -pos.x;
  }

  r.position = pos;
  r.quaternion = q;
  r.faceWidth = faceWidth;
  r.faceHeight = brow.distanceTo(chin);

  // The head basis in FINAL (mirrored) world space. xAxis points towards the
  // wearer's left temple, yAxis up the face, zAxis out of the face. The head
  // occluder is placed with these, and xAxis.z is the cleanest possible
  // "which arm is swinging towards the camera" signal: it is +1 when the
  // wearer's left temple faces us and -1 when their right one does.
  r.xAxis = (r.xAxis || new THREE.Vector3()).set(1, 0, 0).applyQuaternion(q);
  r.yAxis = (r.yAxis || new THREE.Vector3()).set(0, 1, 0).applyQuaternion(q);
  r.zAxis = (r.zAxis || new THREE.Vector3()).set(0, 0, 1).applyQuaternion(q);
  // Yaw about world Y (mirrored), used to fade the temple arms in on turn.
  r.yaw = Math.atan2(-z.x, z.z);
  return r;
}
`;

/**
 * Face-geometry helpers for the AR try-on.
 *
 * FaceMesh with `enableFaceGeometry` returns, per face, a rigid pose matrix and
 * a METRIC face mesh (centimetres, canonical-face axes: +X wearer's left, +Y
 * up, +Z out of the face). The pose maps that mesh into the space of a
 * perspective camera with a known vertical FOV, so rendering with the same
 * camera puts the glasses exactly where the face is — at any yaw — instead of
 * reconstructing the head from a handful of 2-D landmarks.
 *
 *   OneEuro(minCutoff, beta)              scalar One Euro filter
 *   PoseSmoother(cfg)                     position + rotation One Euro smoothing
 *   meshVertex(vertexBuffer, index, out)  metric mesh vertex (VERTEX_PT layout)
 *   FlipCalibrator(frames)                checks the pose against the landmarks
 */
export const FACE_GEOMETRY_JS = `
function oneEuroAlpha(cutoff, dt) {
  var tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

// One Euro filter: heavy smoothing while still (kills jitter), light smoothing
// while moving (no lag on a head turn). t in milliseconds.
function OneEuro(minCutoff, beta) {
  this.minCutoff = minCutoff; this.beta = beta;
  this.x = null; this.dx = 0; this.t = 0;
}
OneEuro.prototype.reset = function () { this.x = null; this.dx = 0; };
OneEuro.prototype.filter = function (x, t) {
  if (this.x === null) { this.x = x; this.t = t; this.dx = 0; return x; }
  var dt = Math.max((t - this.t) / 1000, 1e-3);
  this.t = t;
  this.dx += oneEuroAlpha(1.0, dt) * ((x - this.x) / dt - this.dx);
  this.x  += oneEuroAlpha(this.minCutoff + this.beta * Math.abs(this.dx), dt) * (x - this.x);
  return this.x;
};

// cfg: { posMinCutoff, posBeta, rotMinCutoff, rotBeta } — the same One Euro
// idea applied to a position (per axis) and a rotation (slerp, driven by the
// angular speed in rad/s).
function PoseSmoother(cfg) {
  this.cfg = cfg;
  this.px = new OneEuro(cfg.posMinCutoff, cfg.posBeta);
  this.py = new OneEuro(cfg.posMinCutoff, cfg.posBeta);
  this.pz = new OneEuro(cfg.posMinCutoff, cfg.posBeta);
  this.q = new THREE.Quaternion();
  this.hasQ = false; this.t = 0; this.speed = 0;
}
PoseSmoother.prototype.reset = function () {
  this.px.reset(); this.py.reset(); this.pz.reset();
  this.hasQ = false; this.speed = 0;
};
PoseSmoother.prototype.update = function (pos, quat, t, outPos, outQuat) {
  outPos.set(this.px.filter(pos.x, t), this.py.filter(pos.y, t), this.pz.filter(pos.z, t));
  if (!this.hasQ) {
    this.q.copy(quat); this.hasQ = true; this.t = t; this.speed = 0;
  } else {
    var dt = Math.max((t - this.t) / 1000, 1e-3);
    this.t = t;
    var d = Math.min(1, Math.abs(this.q.dot(quat)));
    this.speed += oneEuroAlpha(1.0, dt) * ((2 * Math.acos(d)) / dt - this.speed);
    var cutoff = this.cfg.rotMinCutoff + this.cfg.rotBeta * this.speed;
    this.q.slerp(quat, oneEuroAlpha(cutoff, dt));
  }
  return outQuat.copy(this.q);
};

// The geometry mesh uses the VERTEX_PT layout: x, y, z, u, v per vertex, in
// landmark order.
function meshVertex(vb, i, out) {
  var k = i * 5;
  return out.set(vb[k], vb[k + 1], vb[k + 2]);
}

// Projects a few mesh vertices through pose + camera and compares them with the
// 2-D landmarks for the first frames. That settles any axis flip between the
// pose's camera space and the image (sx / sy), and flags a pose that does not
// line up with the face at all, so the caller can fall back to the landmarks.
var FLIP_PROBES = [234, 454, 10, 152];
function FlipCalibrator(lockAfter) {
  this.lockAfter = lockAfter;
  this.reset();
}
FlipCalibrator.prototype.reset = function () {
  this.err = [0, 0, 0, 0];   // x as-is, x flipped, y as-is, y flipped
  this.frames = 0; this.sx = 1; this.sy = 1;
  this._v = this._v || new THREE.Vector3();
};
FlipCalibrator.prototype.update = function (vb, poseM, projM, lm) {
  if (this.frames >= this.lockAfter) { return; }
  for (var i = 0; i < FLIP_PROBES.length; i++) {
    var idx = FLIP_PROBES[i];
    var v = meshVertex(vb, idx, this._v).applyMatrix4(poseM).applyMatrix4(projM);
    var ex = 2 * lm[idx].x - 1, ey = 1 - 2 * lm[idx].y;
    this.err[0] += Math.abs(v.x - ex);  this.err[1] += Math.abs(-v.x - ex);
    this.err[2] += Math.abs(v.y - ey);  this.err[3] += Math.abs(-v.y - ey);
  }
  this.frames++;
  this.sx = this.err[0] <= this.err[1] ? 1 : -1;
  this.sy = this.err[2] <= this.err[3] ? 1 : -1;
};
// Mean per-probe error (NDC units) of the best hypothesis once calibration is
// done. A good pose reprojects within a couple of hundredths.
FlipCalibrator.prototype.unreliable = function (maxErr) {
  if (this.frames < this.lockAfter) { return false; }
  var n = this.frames * FLIP_PROBES.length;
  var e = (Math.min(this.err[0], this.err[1]) + Math.min(this.err[2], this.err[3])) / (2 * n);
  return e > maxErr;
};
`;
