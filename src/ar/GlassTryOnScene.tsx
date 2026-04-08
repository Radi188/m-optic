/**
 * GlassTryOnScene
 * Front camera + MediaPipe FaceMesh → crisp vector wayfarer glasses.
 * Drawn entirely with Canvas 2D — no raster image, no pixelation, any resolution.
 */
import React, { useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Colors, FontSize, Spacing, BorderRadius } from '../theme';
import type { GlassItem } from '../types/navigation';

interface Props { glass: GlassItem; }

function buildHtml(glassName: string, accentColor: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#000}
    #video{
      position:absolute;top:0;left:0;width:100%;height:100%;
      object-fit:cover;
      transform:scaleX(-1);
    }
    #overlay{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
    #status{
      position:absolute;top:18px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.55);color:#fff;
      font-family:-apple-system,sans-serif;font-size:13px;font-weight:600;
      padding:6px 16px;border-radius:20px;white-space:nowrap;transition:background 0.4s;
    }
    #loading{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      color:rgba(255,255,255,0.65);font-family:-apple-system,sans-serif;
      font-size:14px;text-align:center;line-height:1.8;pointer-events:none;
    }
    .spinner{
      width:34px;height:34px;
      border:3px solid rgba(255,255,255,0.15);
      border-top-color:rgba(255,255,255,0.85);
      border-radius:50%;animation:spin 0.8s linear infinite;
      margin:0 auto 10px;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
<video id="video" autoplay playsinline muted></video>
<canvas id="overlay"></canvas>
<div id="status">Point camera at your face</div>
<div id="loading"><div class="spinner"></div>Loading…</div>

<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js" crossorigin="anonymous"></script>

<script>
(function(){
  const video   = document.getElementById('video');
  const canvas  = document.getElementById('overlay');
  const status  = document.getElementById('status');
  const loading = document.getElementById('loading');
  const ctx     = canvas.getContext('2d');

  const ACCENT      = '${accentColor}';
  const FRAME_COLOR = '#0D0D0D';
  const NAME        = \`${glassName}\`;

  function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  // Landmark → mirrored canvas pixel (video is CSS-flipped scaleX(-1))
  function px(lm){ return { x:(1-lm.x)*canvas.width, y:lm.y*canvas.height, z:lm.z }; }

  // Rounded-rect path (reusable, drawn relative to current transform origin)
  function roundRect(x, y, w, h, r){
    r = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);    ctx.arcTo(x+w, y,   x+w, y+r,   r);
    ctx.lineTo(x+w, y+h-r);  ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h);    ctx.arcTo(x,   y+h, x,   y+h-r, r);
    ctx.lineTo(x, y+r);      ctx.arcTo(x,   y,   x+r, y,     r);
    ctx.closePath();
  }

  // Hex color → r,g,b string for rgba()
  function hexRgb(hex){
    const h = hex.replace('#','');
    return [
      parseInt(h.slice(0,2),16),
      parseInt(h.slice(2,4),16),
      parseInt(h.slice(4,6),16),
    ].join(',');
  }
  const ACCENT_RGB = hexRgb(ACCENT);

  // ── Main draw ───────────────────────────────────────────────────────────────
  function drawGlasses(lm){

    // ── Landmarks ──────────────────────────────────────────────────────────────
    // Left eye  (screen-left):  outer=263, inner=362, top=386, bot=374
    // Right eye (screen-right): outer=33,  inner=133, top=159, bot=145
    // Temples: 234 (left), 454 (right)  ← full face width reference
    const lOut = px(lm[263]), lInn = px(lm[362]);
    const lTop = px(lm[386]), lBot = px(lm[374]);
    const rOut = px(lm[33]),  rInn = px(lm[133]);
    const rTop = px(lm[159]), rBot = px(lm[145]);
    const lTemple = px(lm[234]);
    const rTemple = px(lm[454]);

    // Eye centres
    const lCX = (lOut.x + lInn.x) / 2,  lCY = (lTop.y + lBot.y) / 2;
    const rCX = (rOut.x + rInn.x) / 2,  rCY = (rTop.y + rBot.y) / 2;
    const cx  = (lCX + rCX) / 2;
    const cy  = (lCY + rCY) / 2;

    // ── Head pose ──────────────────────────────────────────────────────────────
    // Yaw from z-depth of mirrored outer-eye landmarks
    const rawYaw = (lm[263].z - lm[33].z) * 3.0;
    const yaw    = Math.max(-1, Math.min(1, rawYaw));
    // Roll from slope of the eye-centre line
    const roll   = Math.atan2(rCY - lCY, rCX - lCX);

    // ── Sizing — temple-to-temple (how real frames are measured) ──────────────
    const templeSpan = Math.abs(rTemple.x - lTemple.x);
    const frameW     = templeSpan * 0.88;   // total visible front width
    const bridgeW    = frameW * 0.085;      // nose-bridge gap
    const lensW      = (frameW - bridgeW) / 2;

    // Real wayfarer lens height ≈ 72–78% of lens width (tall, covering the eye fully)
    const lensH = lensW * 0.75;

    const ft = Math.max(4, lensH * 0.125); // frame stroke thickness
    const cr = lensH * 0.20;               // corner radius

    // ── Perspective squish on yaw ──────────────────────────────────────────────
    const perspX = Math.max(0.10, Math.cos(yaw * Math.PI * 0.48));

    // ── All drawing happens in local space centred on (cx, cy) ────────────────
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);
    ctx.scale(perspX, 1);

    // Lens origin offsets from centre (0,0)
    const lLX = -frameW / 2;          // left edge of left lens
    const rLX =  bridgeW / 2;         // left edge of right lens
    const lY  = -lensH  / 2;          // top of both lenses (vertically centred on eyes)

    // ── 1. Drop shadow ──────────────────────────────────────────────────────────
    ctx.shadowColor   = 'rgba(0,0,0,0.70)';
    ctx.shadowBlur    = lensH * 0.25;
    ctx.shadowOffsetY = lensH * 0.08;

    // ── 2. Lens tint fill ───────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(' + ACCENT_RGB + ',0.22)';
    roundRect(lLX, lY, lensW, lensH, cr); ctx.fill();
    roundRect(rLX, lY, lensW, lensH, cr); ctx.fill();

    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // ── 3. Outer frame stroke ───────────────────────────────────────────────────
    ctx.strokeStyle = FRAME_COLOR;
    ctx.lineWidth   = ft;
    ctx.lineJoin    = 'round';
    roundRect(lLX, lY, lensW, lensH, cr); ctx.stroke();
    roundRect(rLX, lY, lensW, lensH, cr); ctx.stroke();

    // ── 4. Thick top bar — the wayfarer signature ───────────────────────────────
    ctx.lineWidth = ft * 1.8;
    ctx.lineCap   = 'round';
    ctx.strokeStyle = FRAME_COLOR;
    ctx.beginPath(); ctx.moveTo(lLX + cr, lY); ctx.lineTo(lLX + lensW - cr, lY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rLX + cr, lY); ctx.lineTo(rLX + lensW - cr, lY); ctx.stroke();

    // ── 5. Nose bridge (curved) ─────────────────────────────────────────────────
    ctx.lineWidth   = ft * 0.70;
    ctx.strokeStyle = FRAME_COLOR;
    ctx.beginPath();
    ctx.moveTo(lLX + lensW, -ft * 0.15);
    ctx.quadraticCurveTo(0, ft * 1.4, rLX, -ft * 0.15);
    ctx.stroke();

    // ── 6. Nose pads (small ovals on the bridge) ────────────────────────────────
    ctx.fillStyle = '#333';
    ctx.save();
    ctx.translate(lLX + lensW + bridgeW * 0.18, ft * 0.55);
    ctx.scale(1, 1.6);
    ctx.beginPath(); ctx.arc(0, 0, ft * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(rLX - bridgeW * 0.18, ft * 0.55);
    ctx.scale(1, 1.6);
    ctx.beginPath(); ctx.arc(0, 0, ft * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── 7. Hinge dots ───────────────────────────────────────────────────────────
    ctx.fillStyle = '#2A2A2A';
    const hY = lY + lensH * 0.20;
    ctx.beginPath(); ctx.arc(lLX,       hY, ft * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rLX+lensW, hY, ft * 0.55, 0, Math.PI * 2); ctx.fill();

    // ── 8. Temple arms (fade in as you turn) ────────────────────────────────────
    const tLen  = templeSpan * 0.28;
    const lAlpha = Math.max(0, Math.min(1, (-yaw + 0.12) / 0.60));
    const rAlpha = Math.max(0, Math.min(1, ( yaw + 0.12) / 0.60));

    ctx.lineWidth   = ft * 1.10;
    ctx.lineCap     = 'round';
    ctx.strokeStyle = FRAME_COLOR;

    if(lAlpha > 0.02){
      ctx.globalAlpha = lAlpha;
      ctx.beginPath();
      ctx.moveTo(lLX, hY);
      ctx.lineTo(lLX - tLen * lAlpha, hY + lensH * 0.04);
      ctx.stroke();
    }
    if(rAlpha > 0.02){
      ctx.globalAlpha = rAlpha;
      ctx.beginPath();
      ctx.moveTo(rLX + lensW, hY);
      ctx.lineTo(rLX + lensW + tLen * rAlpha, hY + lensH * 0.04);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── 9. Inner accent line (thin coloured rim inside the frame) ───────────────
    const ip = ft * 0.65;
    ctx.strokeStyle = 'rgba(' + ACCENT_RGB + ',0.55)';
    ctx.lineWidth   = ft * 0.18;
    roundRect(lLX + ip, lY + ip, lensW - ip*2, lensH - ip*2, cr * 0.6); ctx.stroke();
    roundRect(rLX + ip, lY + ip, lensW - ip*2, lensH - ip*2, cr * 0.6); ctx.stroke();

    // ── 10. Specular glare (top-left highlight on each lens) ────────────────────
    const glareH = lensH * 0.38;
    const shine  = ctx.createLinearGradient(0, lY, 0, lY + glareH);
    shine.addColorStop(0, 'rgba(255,255,255,0.20)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    const gp = ft * 0.5;
    roundRect(lLX + gp, lY + gp, lensW - gp*2, glareH, cr * 0.5); ctx.fill();
    roundRect(rLX + gp, lY + gp, lensW - gp*2, glareH, cr * 0.5); ctx.fill();

    ctx.restore();
  }

  // ── Camera ───────────────────────────────────────────────────────────────────
  if(!navigator.mediaDevices?.getUserMedia){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'cameraError',reason:'unsupported'}));
    return;
  }
  navigator.mediaDevices.getUserMedia({
    video:{ facingMode:'user', width:{ideal:1280}, height:{ideal:720} },
    audio:false,
  }).then(stream => {
    video.srcObject = stream;
    video.play().catch(()=>{});
  }).catch(err => {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({type:'cameraError', reason: err.name || 'unknown'})
    );
  });

  // ── MediaPipe FaceMesh ────────────────────────────────────────────────────────
  let faceFound = false;

  function onResults(results){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(results.multiFaceLandmarks?.length){
      if(!faceFound){
        faceFound = true;
        loading.style.display = 'none';
        status.textContent = NAME + ' — try on';
        status.style.background = ACCENT + 'CC';
      }
      drawGlasses(results.multiFaceLandmarks[0]);
    } else {
      if(faceFound){
        faceFound = false;
        status.textContent = 'Point camera at your face';
        status.style.background = 'rgba(0,0,0,0.55)';
      }
    }
  }

  function initFaceMesh(){
    if(typeof FaceMesh === 'undefined' || typeof Camera === 'undefined'){
      return setTimeout(initFaceMesh, 250);
    }
    loading.style.display = 'block';
    const faceMesh = new FaceMesh({
      locateFile: f => 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/' + f,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
    faceMesh.onResults(onResults);

    const cam = new Camera(video, {
      onFrame: async () => { await faceMesh.send({ image: video }); },
      width: 640, height: 480,
    });
    cam.start()
      .then(() => { loading.style.display = 'none'; })
      .catch(e => { loading.innerHTML = 'Camera error:<br>' + e.message; });
  }

  if(document.readyState === 'complete'){ initFaceMesh(); }
  else { window.addEventListener('load', initFaceMesh); }

})();
</script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GlassTryOnScene: React.FC<Props> = ({ glass }) => {
  const webviewRef = useRef<WebView>(null);

  const html = useMemo(
    () => buildHtml(glass.name, Colors.primary),
    [glass.name],
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
          'MOptic needs camera access for the glasses try-on.\n\nGo to Settings → Privacy & Security → Camera and enable it for MOptic.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openSettings },
          ],
        );
      }
    } catch {}
  }, [openSettings]);

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
        onError={e => console.warn('TryOn WebView error:', e.nativeEvent)}
      />

      <View style={styles.bottomBar}>
        <View style={styles.glassInfo}>
          <Text style={styles.glassName}>{glass.name}</Text>
          <Text style={styles.glassBrand}>{glass.brand} · ${glass.price}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>LIVE</Text>
        </View>
      </View>
    </View>
  );
};

export default GlassTryOnScene;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview:   { flex: 1, backgroundColor: '#000' },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.80)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  glassInfo: { flex: 1 },
  glassName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
  glassBrand: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
});
