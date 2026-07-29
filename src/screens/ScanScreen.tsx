import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
  Animated,
  Dimensions,
  Platform,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import { useProductList } from '../hook/useProductList';
import type { Product } from '../types/glasses';
import AppText from '../components/AppText';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'face' | 'refraction';
type FaceScanStage = 'idle' | 'countdown' | 'scanning' | 'selecting';
type RefractionStage =
  | 'intro'
  | 'acuityLeftReady'
  | 'acuityLeft'
  | 'acuityRightReady'
  | 'acuityRight'
  | 'colorVision'
  | 'astigmatismLeftReady'
  | 'astigmatismLeft'
  | 'astigmatismRightReady'
  | 'astigmatismRight'
  | 'result';
type ColorResult = 'normal' | 'mild' | 'deficient';
type FaceShape =
  | 'Oval'
  | 'Round'
  | 'Square'
  | 'Heart'
  | 'Oblong'
  | 'Diamond'
  | 'Triangle';

// Normalized 0..100 measurement readouts posted from the scanner.
type FaceMetrics = {
  pFaceWidth: number;
  pFaceLength: number;
  pJawAngle: number;
  pForehead: number;
  pCheekbone: number;
  pJawline: number;
};
// TEMPORARY — raw classifier features surfaced on-screen for debugging.
// Safe to remove; classification no longer depends on tuning against these.
type FaceDebug = {
  raw: { aspect: number; fVc: number; jVc: number; jawDeg: number } | null;
  scores: Record<string, number> | null;
  samples: number;
};
type RiskLevel = 'low' | 'medium' | 'high';
type HairStyle = 'Short' | 'Medium' | 'Long' | 'Curly' | 'Wavy' | 'Bald';
type ResultTab = 'face' | 'hair';

// ─── Face Shape Data ──────────────────────────────────────────────────────────

const FACE_SHAPE_INFO: Record<
  FaceShape,
  { icon: string; description: string; frames: string[]; tip: string }
> = {
  Oval: {
    icon: 'ellipse-outline',
    description:
      'Balanced proportions — slightly wider at the cheeks and gently tapering to the forehead and jaw.',
    frames: ['Wayfarer', 'Aviator', 'Round', 'Cat-Eye'],
    tip: 'Lucky you — almost any frame style suits an oval face.',
  },
  Round: {
    icon: 'radio-button-off-outline',
    description:
      'Similar width and height, with soft curved lines and fuller cheeks.',
    frames: ['Rectangle', 'Square', 'Browline', 'Geometric'],
    tip: 'Angular frames add definition and make the face appear slimmer.',
  },
  Square: {
    icon: 'square-outline',
    description:
      'Strong jawline, broad forehead, and wide cheekbones of similar width.',
    frames: ['Round', 'Oval', 'Aviator', 'Cat-Eye'],
    tip: 'Curved frames soften strong angles and balance the jawline.',
  },
  Heart: {
    icon: 'heart-outline',
    description: 'Wider forehead tapering down to a narrow, pointed chin.',
    frames: ['Aviator', 'Round', 'Rimless', 'Oval'],
    tip: 'Bottom-heavy or light frames balance a wider forehead.',
  },
  Oblong: {
    icon: 'ellipse-outline',
    description:
      'Face is notably longer than it is wide, with a long straight cheek line and a narrow chin.',
    frames: ['Wayfarer', 'Round', 'Oversized', 'Decorative'],
    tip: "Wider frames with depth add width and shorten the face's appearance.",
  },
  Diamond: {
    icon: 'diamond-outline',
    description:
      'Narrow forehead and jawline with wide, prominent cheekbones as the widest point.',
    frames: ['Cat-Eye', 'Oval', 'Rimless', 'Browline'],
    tip: 'Frames with detailing on the top edge or rimless styles highlight the eyes and soften the cheekbones.',
  },
  Triangle: {
    icon: 'triangle-outline',
    description:
      'Narrow forehead widening to a strong, broad jawline — the jaw is the widest point.',
    frames: ['Browline', 'Cat-Eye', 'Aviator', 'Round'],
    tip: 'Frames wider on top, like browline or cat-eye, balance a strong jaw.',
  },
};

// ─── Refraction Test Data ─────────────────────────────────────────────────────

// ── Randomisation helpers — fresh test content on every run ──────────────────
const randInt = (n: number) => Math.floor(Math.random() * n);
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Pick `n` distinct items at random.
const pick = <T,>(arr: T[], n: number): T[] => shuffle(arr).slice(0, n);

// Landolt C — a ring with a gap; the gap direction is the thing being tested.
// 16 directions around the clock, spaced 22.5° apart, 0 = gap pointing up —
// a fine enough step that guessing is unreliable.
const LANDOLT_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5);
const LANDOLT_DIRECTIONS: { angle: number; label: string }[] =
  LANDOLT_ANGLES.map(angle => ({ angle, label: `${angle}°` }));

type AcuityRow = { size: number; angle: number; label: string };

// Sizes/labels are fixed (they define the acuity line); only the gap angle
// varies. Eight shrinking levels — reaching the bottom requires seven
// consecutive correct reads under the timer.
const ACUITY_SPEC = [
  { size: 64, label: '20/200' },
  { size: 50, label: '20/100' },
  { size: 40, label: '20/70' },
  { size: 32, label: '20/50' },
  { size: 26, label: '20/40' },
  { size: 21, label: '20/30' },
  { size: 17, label: '20/20' },
  { size: 14, label: '20/15' },
];
const genAcuityRows = (): AcuityRow[] =>
  ACUITY_SPEC.map(s => ({
    size: s.size,
    label: s.label,
    angle: LANDOLT_ANGLES[randInt(LANDOLT_ANGLES.length)],
  }));

// Seconds allowed to answer each ring before it's auto-marked wrong.
const ACUITY_TIME_LIMIT = 4;

function computeRisk(
  acuityPassCount: number,
  astigmatism: 'equal' | 'unequal',
  colorVision: ColorResult,
): RiskLevel {
  let score = 0;
  if (acuityPassCount <= 1) score += 4;
  else if (acuityPassCount <= 3) score += 2;
  else if (acuityPassCount === 4) score += 1;
  if (astigmatism === 'unequal') score += 2;
  if (colorVision === 'deficient') score += 3;
  else if (colorVision === 'mild') score += 1;
  if (score >= 7) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

const RISK_CONFIG: Record<
  RiskLevel,
  {
    color: string;
    bg: string;
    label: string;
    icon: string;
    summary: string;
    advice: string;
  }
> = {
  low: {
    color: '#2DBD7E',
    bg: 'rgba(45,189,126,0.12)',
    label: 'Low Risk',
    icon: 'checkmark-circle-outline',
    summary: 'Your vision appears healthy based on this screening.',
    advice:
      'No immediate concerns detected. Routine annual check-ups are still recommended to keep your eyes healthy.',
  },
  medium: {
    color: '#F4A830',
    bg: 'rgba(244,168,48,0.12)',
    label: 'Possible Issue',
    icon: 'alert-circle-outline',
    summary: 'Some signs of a possible refractive error were detected.',
    advice:
      'We recommend a professional eye examination within the next 1–3 months. An optometrist can confirm and prescribe the right correction.',
  },
  high: {
    color: '#E74C3C',
    bg: 'rgba(231,76,60,0.12)',
    label: 'Attention Needed',
    icon: 'warning-outline',
    summary: 'Significant signs of refractive error were detected.',
    advice:
      'Please book an appointment with our optometrist as soon as possible. Early correction prevents further deterioration.',
  },
};

// ─── Booking Data ─────────────────────────────────────────────────────────────

const BRANCHES = [
  {
    id: 'b1',
    name: 'M Optic Centre',
    address: 'Boulevard Zerktouni, Casablanca',
  },
  { id: 'b2', name: 'M Optic Maarif', address: 'Maarif District, Casablanca' },
  { id: 'b3', name: 'M Optic Ain Sebaa', address: 'Ain Sebaa, Casablanca' },
];

const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getAvailableDays(count = 10): Date[] {
  const days: Date[] = [];
  const today = new Date();
  let offset = 1;
  while (days.length < count) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    if (d.getDay() !== 0) days.push(d); // skip Sunday
    offset++;
  }
  return days;
}

const AVAILABLE_DAYS = getAvailableDays(10);

// ─── Ishihara-style Plate Data & HTML Generator ───────────────────────────────

const CANT_SEE = 'Nothing';
type CvPlate = {
  number: string;
  hint: string;
  question: string;
  options: string[];
  correct: string;
};

// Pool of numbers an Ishihara-style plate can hide. Each run picks fresh ones
// with random distractor options so the test isn't memorisable.
const CV_NUMBERS = [
  '2',
  '3',
  '5',
  '6',
  '7',
  '8',
  '12',
  '15',
  '16',
  '26',
  '29',
  '42',
  '45',
  '57',
  '73',
  '74',
];
const genCvPlates = (n = 3): CvPlate[] => {
  const targets = pick(CV_NUMBERS, n);
  return targets.map(num => {
    const distractors = pick(
      CV_NUMBERS.filter(x => x !== num),
      2,
    );
    return {
      number: num,
      hint:
        num.length > 1
          ? 'A two-digit number is hidden among the dots.'
          : 'A single digit is concealed in the pattern.',
      question: 'What number do you see?',
      options: [...shuffle([num, ...distractors]), CANT_SEE],
      correct: num,
    };
  });
};

function makeIshiharaHtml(number: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100vh;background:#f5f0eb;display:flex;justify-content:center;align-items:center;overflow:hidden}
</style>
</head>
<body>
<canvas id="c" width="260" height="260" style="border-radius:50%;box-shadow:0 3px 20px rgba(0,0,0,0.18)"></canvas>
<script>
(function(){
var DIGITS={
  '0':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '1':[[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  '2':[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
  '3':[[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
  '4':[[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
  '5':[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
  '6':[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '7':[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0]],
  '8':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '9':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0]],
};
var BG=['#7db648','#8bc340','#6aaa38','#5d9b2f','#9ecf55','#a2c94a','#88bd3c','#72b030'];
var FIG=['#e05c2a','#d4401e','#e87640','#c93c18','#f08050','#d85c34','#e06844','#cc4422'];
var NUM='${number}';
var canvas=document.getElementById('c');
var ctx=canvas.getContext('2d');
var W=260,H=260,CX=130,CY=130,R=126;
function buildMask(str){
  var chars=str.split('');
  var totalCols=chars.length*5+(chars.length-1)*2;
  var grid=[];
  for(var r=0;r<7;r++){
    var row=new Array(totalCols).fill(0);
    for(var d=0;d<chars.length;d++){
      var dm=DIGITS[chars[d]];
      var offset=d*7;
      for(var k=0;k<5;k++) row[offset+k]=dm[r][k];
    }
    grid.push(row);
  }
  return {grid:grid,rows:7,cols:totalCols};
}
var m=buildMask(NUM);
var cellW=(W*0.52)/m.cols;
var cellH=(H*0.48)/m.rows;
var sx=CX-m.cols*cellW/2;
var sy=CY-m.rows*cellH/2;
function isFig(px,py){
  var gx=Math.floor((px-sx)/cellW);
  var gy=Math.floor((py-sy)/cellH);
  if(gx<0||gx>=m.cols||gy<0||gy>=m.rows)return false;
  return m.grid[gy][gx]===1;
}
var seed=12345;
function rng(){seed=((seed*1664525+1013904223)>>>0);return seed/4294967296;}
ctx.save();
ctx.beginPath();
ctx.arc(CX,CY,R,0,Math.PI*2);
ctx.fillStyle='#f0ece6';
ctx.fill();
ctx.clip();
var attempts=0,placed=0;
while(placed<480&&attempts<8000){
  attempts++;
  var ang=rng()*Math.PI*2;
  var dist=Math.sqrt(rng())*(R-10);
  var x=CX+Math.cos(ang)*dist;
  var y=CY+Math.sin(ang)*dist;
  var r=5.5+rng()*7.5;
  if(Math.sqrt((x-CX)*(x-CX)+(y-CY)*(y-CY))+r>R-2)continue;
  var fig=isFig(x,y);
  var palette=fig?FIG:BG;
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=palette[Math.floor(rng()*palette.length)];
  ctx.fill();
  placed++;
}
ctx.restore();
ctx.beginPath();
ctx.arc(CX,CY,R,0,Math.PI*2);
ctx.strokeStyle='rgba(0,0,0,0.08)';
ctx.lineWidth=2;
ctx.stroke();
})();
</script>
</body>
</html>`;
}

// ─── Scanner WebView HTML ─────────────────────────────────────────────────────
// baseUrl:'https://localhost' makes iOS WKWebView treat this as a secure context
// so that navigator.mediaDevices.getUserMedia is available.

const SCAN_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
#snapCanvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}
#overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}

/* Top HUD chip — sits below the notch / status bar */
.topbar{position:absolute;top:max(30px,calc(env(safe-area-inset-top) + 16px));left:0;right:0;display:flex;justify-content:center;z-index:8}
.topchip{display:flex;align-items:center;gap:9px;padding:9px 18px;border-radius:100px;background:rgba(12,16,20,0.5);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);border:1px solid rgba(95,233,255,0.22);box-shadow:0 6px 22px rgba(0,0,0,0.28)}
.topchip .pulse{width:7px;height:7px;border-radius:50%;background:#5FE9FF;box-shadow:0 0 10px #5FE9FF;animation:blink 1.4s ease-in-out infinite}
.topchip span{color:rgba(255,255,255,0.96);font-size:11px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

/* Corner HUD readouts — clearly below the chip */
.hud{position:absolute;z-index:7;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:9.5px;letter-spacing:1.4px;color:rgba(95,233,255,0.72);text-transform:uppercase;text-shadow:0 0 8px rgba(95,233,255,0.35)}
.hud.searching{color:rgba(244,168,48,0.85);text-shadow:0 0 8px rgba(244,168,48,0.35)}
.hud-tl{top:max(90px,calc(env(safe-area-inset-top) + 74px));left:22px}
.hud-tr{top:max(90px,calc(env(safe-area-inset-top) + 74px));right:22px;text-align:right}
.hud-bl{bottom:max(150px,calc(env(safe-area-inset-bottom) + 150px));left:22px}
.hud-br{bottom:max(150px,calc(env(safe-area-inset-bottom) + 150px));right:22px;text-align:right}

/* Larger rounded-square frame — easier to fill while holding the phone */
.oval-wrap{position:relative;width:min(84vw,340px);height:min(84vw,340px)}

/* Mesh + scan-beam layer, clipped to the frame */
.oval-clip{position:absolute;inset:0;border-radius:34px;overflow:hidden;z-index:1}
.mesh{position:absolute;inset:0;background-image:linear-gradient(rgba(95,233,255,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(95,233,255,0.10) 1px,transparent 1px);background-size:22px 22px;-webkit-mask-image:radial-gradient(closest-side,#000 78%,transparent 100%);mask-image:radial-gradient(closest-side,#000 78%,transparent 100%);animation:meshpulse 3s ease-in-out infinite}
@keyframes meshpulse{0%,100%{opacity:.35}50%{opacity:.72}}
.scanbeam{position:absolute;left:-3%;right:-3%;height:2px;top:8%;border-radius:2px;background:linear-gradient(90deg,transparent,#5FE9FF 20%,#EAFBFF 50%,#5FE9FF 80%,transparent);box-shadow:0 0 16px 4px rgba(95,233,255,0.55);animation:scanmove 2.8s cubic-bezier(.55,0,.45,1) infinite}
.scanbeam::before{content:'';position:absolute;left:0;right:0;top:-64px;height:64px;background:linear-gradient(to top,rgba(95,233,255,0.20),transparent)}
@keyframes scanmove{0%{top:8%;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:90%;opacity:0}}

/* Guide frame — dims everything outside */
.guide-oval{border-radius:34px;position:absolute;inset:0;z-index:2;border:1.5px solid rgba(255,255,255,0.5);box-shadow:0 0 0 2000px rgba(6,10,14,0.66),inset 0 0 22px rgba(95,233,255,0.10);transition:border-color .35s ease,box-shadow .35s ease}
.guide-oval.locked{border-color:rgba(111,227,174,0.9);box-shadow:0 0 0 2000px rgba(6,10,14,0.66),inset 0 0 40px rgba(45,189,126,0.28),0 0 40px rgba(45,189,126,0.5)}
/* Expanding pulse frame on lock */
.guide-oval::after{content:'';position:absolute;inset:-1.5px;border-radius:35px;border:1.5px solid rgba(111,227,174,0.8);opacity:0;pointer-events:none}
.guide-oval.locked::after{animation:pulsering 1.7s ease-out infinite}
@keyframes pulsering{0%{transform:scale(1);opacity:.8}70%{transform:scale(1.13);opacity:0}100%{opacity:0}}

/* HUD corner brackets — reticle framing the square */
.bracket{position:absolute;width:42px;height:42px;z-index:4;border:2.5px solid rgba(95,233,255,0.85);filter:drop-shadow(0 0 6px rgba(95,233,255,0.5));transition:border-color .35s,filter .35s;animation:brfloat 2.4s ease-in-out infinite}
.b-tl{top:-13px;left:-13px;border-right:0;border-bottom:0;border-top-left-radius:20px}
.b-tr{top:-13px;right:-13px;border-left:0;border-bottom:0;border-top-right-radius:20px}
.b-bl{bottom:-13px;left:-13px;border-right:0;border-top:0;border-bottom-left-radius:20px}
.b-br{bottom:-13px;right:-13px;border-left:0;border-top:0;border-bottom-right-radius:20px}
@keyframes brfloat{0%,100%{opacity:.85}50%{opacity:.42}}
#oval.locked ~ .bracket{border-color:rgba(111,227,174,0.95);filter:drop-shadow(0 0 8px rgba(45,189,126,0.6));animation:none;opacity:1}
#oval.locked ~ .oval-clip .scanbeam{background:linear-gradient(90deg,transparent,#6FE3AE 20%,#EAFFF3 50%,#6FE3AE 80%,transparent);box-shadow:0 0 16px 4px rgba(45,189,126,0.55)}

#hint{
  position:relative;z-index:8;
  margin-top:38px;display:inline-flex;align-items:center;
  background:rgba(12,16,20,0.52);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);
  color:#fff;font-size:14px;font-weight:600;
  padding:12px 24px;border-radius:100px;border:1px solid rgba(255,255,255,0.14);
  letter-spacing:0.2px;transition:background .3s,border-color .3s;box-shadow:0 8px 26px rgba(0,0,0,0.30)
}
#hint.success{background:rgba(45,189,126,0.9);border-color:rgba(255,255,255,0.28)}
#hint.warn{background:rgba(244,168,48,0.92);border-color:rgba(255,255,255,0.28)}

/* Capture button */
#captureBtn{
  position:relative;z-index:8;margin-top:26px;pointer-events:auto;
  width:72px;height:72px;border-radius:50%;
  background:rgba(255,255,255,0.14);border:3px solid rgba(255,255,255,0.35);
  display:flex;align-items:center;justify-content:center;
  transition:all .25s ease;
}
#captureBtn::after{content:'';width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.4);transition:all .25s ease}
#captureBtn.enabled{border-color:#6FE3AE;box-shadow:0 0 22px rgba(111,227,174,0.55)}
#captureBtn.enabled::after{background:#6FE3AE}
#captureBtn:disabled{opacity:.55}
#captureHint{position:relative;z-index:8;margin-top:10px;color:rgba(255,255,255,0.55);font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase}

/* Review step — shown after capture, before the user commits to analyzing */
#reviewRow{position:relative;z-index:8;margin-top:26px;display:none;gap:14px;pointer-events:auto}
#reviewRow.show{display:flex}
.reviewBtn{padding:14px 26px;border-radius:100px;font-size:14px;font-weight:700;letter-spacing:0.3px;border:1px solid rgba(255,255,255,0.22);transition:transform .15s ease}
.reviewBtn:active{transform:scale(0.96)}
#retakeBtn{background:rgba(12,16,20,0.55);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);color:#fff}
#analyzeBtn{background:#6FE3AE;color:#06120c;border-color:transparent;box-shadow:0 8px 22px rgba(111,227,174,0.45)}

/* Shape-detected reveal badge — pops in once the measurement animation lands */
#shapeBadge{
  position:absolute;left:50%;top:16%;z-index:9;pointer-events:none;
  transform:translate(-50%,-50%) scale(.7);opacity:0;
  display:flex;align-items:center;gap:8px;
  background:rgba(45,189,126,0.95);border:1px solid rgba(255,255,255,0.32);
  padding:11px 22px;border-radius:100px;box-shadow:0 10px 28px rgba(0,0,0,0.35);
  transition:opacity .35s ease,transform .5s cubic-bezier(.34,1.56,.64,1);
}
#shapeBadge.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
#shapeBadge .ic{color:#fff;font-size:15px}
#shapeBadge span{color:#fff;font-weight:700;font-size:14px;letter-spacing:0.3px}

#loading{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  color:rgba(255,255,255,.78);font-size:14px;text-align:center;line-height:2
}
.spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,.15);border-top-color:#5FE9FF;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 10px}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<video id="video" autoplay playsinline muted></video>
<canvas id="snapCanvas"></canvas>
<div id="overlay">
  <div class="topbar"><div class="topchip"><span class="pulse"></span><span>Biometric Face Scan</span></div></div>

  <div class="hud hud-tl">Mesh &middot; 468 pts</div>
  <div class="hud hud-tr searching" id="hudStatus">&#9679; Searching</div>
  <div class="hud hud-bl">Depth Map &middot; Live</div>
  <div class="hud hud-br" id="hudCoord">Yaw --&nbsp;&nbsp;Sz --</div>

  <div class="oval-wrap">
    <div class="guide-oval" id="oval"></div>
    <div class="oval-clip"><div class="mesh"></div><div class="scanbeam"></div></div>
    <span class="bracket b-tl"></span><span class="bracket b-tr"></span><span class="bracket b-bl"></span><span class="bracket b-br"></span>
  </div>
  <div id="hint">Position your face in the frame</div>
  <button id="captureBtn" disabled></button>
  <div id="captureHint">Tap to capture</div>
  <div id="reviewRow">
    <button id="retakeBtn" class="reviewBtn">Retake</button>
    <button id="analyzeBtn" class="reviewBtn">Analyze</button>
  </div>
</div>
<div id="shapeBadge"><span class="ic">&#10003;</span><span id="shapeBadgeText"></span></div>
<div id="loading"><div class="spinner"></div>Starting camera…</div>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js" crossorigin="anonymous"></script>
<script>
(function(){
'use strict';
function post(obj){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(obj));}

// ── Check for camera support before doing anything ──────────────────────────
if(!navigator.mediaDevices||typeof navigator.mediaDevices.getUserMedia!=='function'){
  post({type:'cameraError',reason:'getUserMedia not supported'});
  document.getElementById('loading').innerHTML='<p style="color:rgba(255,255,255,.7);padding:20px;text-align:center">Camera not available on this device.</p>';
  return;
}

var oval=document.getElementById('oval'),hint=document.getElementById('hint');
var hudStatus=document.getElementById('hudStatus'),hudCoord=document.getElementById('hudCoord');
var captureBtn=document.getElementById('captureBtn'),captureHint=document.getElementById('captureHint');
var reviewRow=document.getElementById('reviewRow'),retakeBtn=document.getElementById('retakeBtn'),analyzeBtn=document.getElementById('analyzeBtn');
var snapCanvas=document.getElementById('snapCanvas');
var shapeBadge=document.getElementById('shapeBadge'),shapeBadgeText=document.getElementById('shapeBadgeText');

// ── Single-shot capture flow: hold still facing forward, tap to capture ─────
var done=false,aligned=false,lastLm=null;
// Rolling buffer of recent well-aligned samples, so the tapped result is an
// average of the last ~1s of tracking rather than one noisy frame.
var recentMetrics=[],recentShapes=[];
var MAX_SAMPLES=30;
// Detection stays paused until RN "arms" it (after the 3-2-1 countdown), so the
// camera can warm up behind the countdown overlay without capturing anything.
var armed=false;
window.armScan=function(){armed=true;};
var MIRROR=true;           // front-camera preview is mirrored
var FRONT_MAX=0.10;        // max yaw to count as "looking straight"

// ── Landmark helpers ────────────────────────────────────────────────────────
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}

// ── Face measurements → shape + normalized 0..100 metrics ───────────────────
// Landmark coords are normalized 0..1 separately by frame width and height, so
// we convert back to real pixels using the actual video dimensions before
// taking any ratio, otherwise every face collapses to one shape.
function clampN(v,a,b){return v<a?a:(v>b?b:v);}
function mapPct(v,lo,hi){return Math.round(clampN((v-lo)/(hi-lo),0,1)*100);}
function angleAt(c,a,b,W,H){
  var ax=(a.x-c.x)*W,ay=(a.y-c.y)*H,bx=(b.x-c.x)*W,by=(b.y-c.y)*H;
  var dot=ax*bx+ay*by,mg=Math.sqrt(ax*ax+ay*ay)*Math.sqrt(bx*bx+by*by)||1;
  return Math.acos(Math.max(-1,Math.min(1,dot/mg)))*180/Math.PI;
}
function computeMetrics(lm){
  var W=(video&&video.videoWidth)||640, H=(video&&video.videoHeight)||480;
  function pd(a,b){var dx=(a.x-b.x)*W,dy=(a.y-b.y)*H;return Math.sqrt(dx*dx+dy*dy);}
  var faceL=pd(lm[10],lm[152]);      // forehead top → chin
  var cheekW=pd(lm[234],lm[454]);    // cheekbone (widest) width
  var jawW=pd(lm[172],lm[397]);      // jaw width
  var fhW=pd(lm[54],lm[284]);        // forehead width
  if(faceL<1)return null;
  var jawDeg=angleAt(lm[152],lm[172],lm[397],W,H); // chin / jaw angle
  return {
    faceL:faceL,cheekW:cheekW,jawW:jawW,fhW:fhW,jawDeg:jawDeg,
    aspect:faceL/cheekW, fVc:fhW/cheekW, jVc:jawW/cheekW,
    pFaceWidth:mapPct(cheekW/faceL,0.62,0.98),
    pFaceLength:mapPct(faceL/cheekW,1.02,1.62),
    pJawAngle:mapPct(jawDeg,78,148),
    pForehead:mapPct(fhW/cheekW,0.72,1.02),
    pCheekbone:mapPct(cheekW/faceL,0.62,0.98),
    pJawline:mapPct(jawW/cheekW,0.68,1.0)
  };
}
// ── 7-way classification via percentile decision tree ────────────────────────
// v1 scored against 7 "ideal" profiles with a gaussian similarity (biased to
// whichever profile sat nearest the population average — collapsed almost
// everyone to one shape). v2 replaced that with AND-conditions on absolute
// ratio cutoffs (e.g. fVc>=0.92 && jVc<=0.82) — but cheekbones (lm 234/454)
// are the widest points on nearly every face, so fVc/jVc cluster in a narrow
// band and rarely clear BOTH halves of a tight AND at once. Almost every scan
// fell through to the Oval default, and since the identical bug also ran on
// every single frame, agreement-based confidence pegged near max (~98%) too.
// v3: classify off the pFaceLength/pForehead/pJawline/pJawAngle percentiles
// that computeMetrics already derives (0..100, scaled against the same
// assumed real-face ranges used for the on-screen bars) and compare them
// relative to each other with modest margins, instead of absolute ratio
// cutoffs — this tracks the shape of each individual face rather than requiring
// it to clear fixed thresholds that most real faces never reach.
function classify(m){
  if(!m)return 'Oval';
  var len=m.pFaceLength,fh=m.pForehead,jw=m.pJawline,ang=m.pJawAngle;

  // Face is notably longer than wide — dominates regardless of width shape.
  if(len>=68) return 'Oblong';

  var diff=fh-jw; // + : forehead relatively wider than jaw; - : jaw relatively wider

  // Forehead clearly wider than the jaw, tapering to a narrower chin.
  if(diff>=16 && fh>=45) return 'Heart';

  // Jaw as wide or wider than the forehead — widest point is at the chin.
  if(diff<=-16 && jw>=45) return 'Triangle';

  // Both forehead and jaw pull in well short of the cheekbones.
  if(fh<=35 && jw<=35) return 'Diamond';

  // Forehead, cheekbones and jaw all close in width, face isn't long —
  // classic Round vs Square split, decided by how angular the jaw is.
  if(fh>=40 && jw>=40 && len<=45){
    return ang<=40 ? 'Square' : 'Round';
  }

  // Balanced proportions, gently tapering — the fallback bucket.
  return 'Oval';
}
function computeShape(lm){return classify(computeMetrics(lm));}
// Average the per-frame display metrics for a stable readout.
function avgMetrics(arr){
  if(!arr.length)return null;
  var k=['pFaceWidth','pFaceLength','pJawAngle','pForehead','pCheekbone','pJawline'],o={},i,n=arr.length;
  for(var x=0;x<k.length;x++){var s=0;for(i=0;i<n;i++)s+=arr[i][k[x]];o[k[x]]=Math.round(s/n);}
  return o;
}
// Average the raw classification features across the front stage — logged as
// "[FaceScan DBG]" for reference/debugging.
function avgRaw(arr){
  if(!arr.length)return null;
  var k=['aspect','fVc','jVc','jawDeg'],o={},i,n=arr.length;
  for(var x=0;x<k.length;x++){var s=0;for(i=0;i<n;i++)s+=arr[i][k[x]];o[k[x]]=+(s/n).toFixed(3);}
  return o;
}

// Most frequent shape across sampled frames — smooths single-frame noise.
function modeOf(arr){
  if(!arr.length)return null;
  var counts={},best=arr[0],bestN=0;
  for(var i=0;i<arr.length;i++){
    counts[arr[i]]=(counts[arr[i]]||0)+1;
    if(counts[arr[i]]>bestN){bestN=counts[arr[i]];best=arr[i];}
  }
  return best;
}

function faceSize(lm){return dist(lm[10],lm[152]);}

function centeredEnough(lm){
  var nose=lm[4];
  return Math.abs(nose.x-0.5)<0.18 && nose.y>0.18 && nose.y<0.78;
}

// Signed head yaw: ~0 looking straight, negative = turned left, positive = right
function yawOf(lm){
  var nose=lm[1],L=lm[234],R=lm[454];
  var center=(L.x+R.x)/2;
  var w=Math.abs(R.x-L.x)||0.0001;
  var raw=(nose.x-center)/w;
  return MIRROR?-raw:raw;
}

function setCaptureEnabled(v){
  aligned=v;
  captureBtn.disabled=!v;
  if(v)captureBtn.classList.add('enabled');else captureBtn.classList.remove('enabled');
}

// ── Captured-face reveal animation ───────────────────────────────────────────
// Snapshots the mirrored frame once, then runs a timed sequence over it:
// mesh fades in -> a scan sweep -> each measurement line draws in with a
// label -> a pulsing outline + badge confirms the detected shape. Everything
// is drawn fresh each frame from the frozen photo so nothing flickers.
function easeOut(t){return 1-Math.pow(1-t,3);}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function drawMeasureLabel(ctx,x,y,text,color,canvasW){
  var fontSize=Math.max(15,Math.round(canvasW/30));
  ctx.font='700 '+fontSize+'px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  var padX=13,padY=8;
  var tw=ctx.measureText(text).width;
  var bw=tw+padX*2,bh=fontSize+padY*2;
  var bx=x-bw/2,by=y-bh-16;
  ctx.fillStyle='rgba(6,10,14,0.8)';
  roundRect(ctx,bx,by,bw,bh,bh/2);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=1.3;
  roundRect(ctx,bx,by,bw,bh,bh/2);ctx.stroke();
  ctx.fillStyle='#fff';
  ctx.fillText(text,x,by+bh/2+1);
}

var MEASURES=[
  {a:54,b:284,color:'#6FE3AE',label:'Forehead'},
  {a:234,b:454,color:'#F4A830',label:'Cheekbones'},
  {a:172,b:397,color:'#E86AD8',label:'Jawline'},
  {a:10,b:152,color:'#5FE9FF',label:'Face length'}
];
var MESH_END=480,SWEEP_END=740,LINE_DUR=320,LINE_GAP=60,LINE_LABEL_FADE=220;

// photo is the already-frozen, mirrored snapshot taken at capture time (see
// freezeFrame) — replayed every animation frame instead of re-sampling video,
// since by this point the camera preview is hidden and paused anyway.
function runCaptureAnimation(lm,shapeName,photo,onDone){
  var w=photo.width,h=photo.height;
  snapCanvas.width=w;snapCanvas.height=h;
  var ctx=snapCanvas.getContext('2d');

  function px(i){return w-lm[i].x*w;}
  function py(i){return lm[i].y*h;}

  var lineStart=[];
  for(var i=0;i<MEASURES.length;i++) lineStart.push(SWEEP_END+120+i*(LINE_DUR+LINE_GAP));
  var linesEnd=lineStart[lineStart.length-1]+LINE_DUR;
  var badgeStart=linesEnd+240;
  var badgeDur=450;
  var totalDur=badgeStart+badgeDur+650;

  var hints=[
    {t:0,text:'Mapping facial structure…'},
    {t:SWEEP_END+40,text:'Measuring proportions…'},
    {t:badgeStart-160,text:'Analyzing shape…'},
    {t:badgeStart,text:'Shape detected!'}
  ];
  var hintIdx=-1;
  var badgeShown=false;
  var t0=null;

  function frame(ts){
    if(t0===null)t0=ts;
    var t=ts-t0;

    for(var hi=0;hi<hints.length;hi++){
      if(t>=hints[hi].t && hintIdx<hi){
        hintIdx=hi;hint.className='success';hint.textContent=hints[hi].text;
      }
    }

    ctx.clearRect(0,0,w,h);
    ctx.drawImage(photo,0,0,w,h);

    // Mesh fades in over the frozen photo.
    var meshT=Math.min(1,t/MESH_END);
    if(meshT>0 && window.drawConnectors){
      ctx.save();
      ctx.globalAlpha=easeOut(meshT);
      var thin={color:'rgba(95,233,255,0.30)',lineWidth:1};
      var bold={color:'rgba(95,233,255,0.95)',lineWidth:2.5};
      if(typeof FACEMESH_TESSELATION!=='undefined') window.drawConnectors(ctx,lm,FACEMESH_TESSELATION,thin);
      if(typeof FACEMESH_FACE_OVAL!=='undefined') window.drawConnectors(ctx,lm,FACEMESH_FACE_OVAL,bold);
      if(typeof FACEMESH_LEFT_EYEBROW!=='undefined') window.drawConnectors(ctx,lm,FACEMESH_LEFT_EYEBROW,bold);
      if(typeof FACEMESH_RIGHT_EYEBROW!=='undefined') window.drawConnectors(ctx,lm,FACEMESH_RIGHT_EYEBROW,bold);
      if(typeof FACEMESH_LIPS!=='undefined') window.drawConnectors(ctx,lm,FACEMESH_LIPS,bold);
      ctx.restore();
    }

    // A light sweep crosses the face once, reinforcing "actively scanning".
    if(t<SWEEP_END){
      var sweepT=Math.min(1,t/SWEEP_END);
      var sy=sweepT*h;
      var grad=ctx.createLinearGradient(0,sy-46,0,sy+46);
      grad.addColorStop(0,'rgba(95,233,255,0)');
      grad.addColorStop(0.5,'rgba(95,233,255,0.4)');
      grad.addColorStop(1,'rgba(95,233,255,0)');
      ctx.fillStyle=grad;
      ctx.fillRect(0,sy-46,w,92);
    }

    // Measurement lines draw in one at a time, each with a glowing leading
    // dot, then leave a label once complete.
    for(var mi=0;mi<MEASURES.length;mi++){
      var m=MEASURES[mi];
      var lt=(t-lineStart[mi])/LINE_DUR;
      if(lt<=0)continue;
      lt=Math.min(1,lt);
      var et=easeOut(lt);
      var ax=px(m.a),ay=py(m.a),bx=px(m.b),by=py(m.b);
      var cx=ax+(bx-ax)*et,cy=ay+(by-ay)*et;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(cx,cy);
      ctx.strokeStyle=m.color;ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();
      ctx.beginPath();ctx.arc(ax,ay,4.5,0,Math.PI*2);ctx.fillStyle=m.color;ctx.fill();
      if(lt<1){
        ctx.save();
        ctx.shadowColor=m.color;ctx.shadowBlur=12;
        ctx.beginPath();ctx.arc(cx,cy,5.5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();ctx.arc(bx,by,4.5,0,Math.PI*2);ctx.fillStyle=m.color;ctx.fill();
        var labelT=Math.min(1,(t-(lineStart[mi]+LINE_DUR))/LINE_LABEL_FADE);
        if(labelT>0){
          ctx.save();
          ctx.globalAlpha=easeOut(labelT);
          drawMeasureLabel(ctx,(ax+bx)/2,Math.min(ay,by),m.label,m.color,w);
          ctx.restore();
        }
      }
    }

    // Final pulsing outline confirms the detected shape.
    var bt=(t-badgeStart)/badgeDur;
    if(bt>0 && window.drawConnectors && typeof FACEMESH_FACE_OVAL!=='undefined'){
      var pulse=easeOut(Math.min(1,bt));
      ctx.save();
      ctx.globalAlpha=0.9;
      ctx.shadowColor='#6FE3AE';ctx.shadowBlur=14*pulse;
      window.drawConnectors(ctx,lm,FACEMESH_FACE_OVAL,{color:'#6FE3AE',lineWidth:3+pulse*1.5});
      ctx.restore();
    }
    if(bt>0 && !badgeShown){
      badgeShown=true;
      shapeBadgeText.textContent=shapeName+' Face Detected';
      shapeBadge.classList.add('show');
    }

    if(t<totalDur){
      requestAnimationFrame(frame);
    } else {
      onDone();
    }
  }
  requestAnimationFrame(frame);
}

// ── Capture → Review (Retake / Analyze) → Analyze flow ──────────────────────
var capturedPhoto=null,capturedLm=null;

// Freeze the current frame into a still photo and show it for review, without
// running any analysis yet — the user decides whether to keep it or retake.
function freezeFrame(lm){
  if(video.pause) video.pause();
  var w=(video.videoWidth||640),h=(video.videoHeight||480);
  var photo=document.createElement('canvas');
  photo.width=w;photo.height=h;
  var pctx=photo.getContext('2d');
  pctx.save();pctx.translate(w,0);pctx.scale(-1,1);pctx.drawImage(video,0,0,w,h);pctx.restore();
  capturedPhoto=photo;
  capturedLm=lm;

  snapCanvas.width=w;snapCanvas.height=h;
  snapCanvas.getContext('2d').drawImage(photo,0,0);
  video.style.display='none';
  snapCanvas.style.display='block';
}

captureBtn.addEventListener('click',function(){
  if(done||!aligned||!lastLm)return;
  done=true;
  freezeFrame(lastLm);
  captureBtn.style.display='none';
  captureHint.style.display='none';
  oval.className='guide-oval locked';
  hint.className='success';
  hint.textContent='Nice! Retake or analyze this photo';
  reviewRow.classList.add('show');
});

retakeBtn.addEventListener('click',function(){
  reviewRow.classList.remove('show');
  capturedPhoto=null;capturedLm=null;
  recentMetrics=[];recentShapes=[];
  lastLm=null;
  snapCanvas.style.display='none';
  video.style.display='block';
  if(video.play) video.play();
  captureBtn.style.display='';
  captureBtn.disabled=true;
  captureBtn.classList.remove('enabled');
  captureHint.style.display='';
  oval.className='guide-oval';
  hint.className='';
  hint.textContent='Position your face in the frame';
  done=false;
  aligned=false;
});

analyzeBtn.addEventListener('click',function(){
  if(!capturedLm||!capturedPhoto)return;
  reviewRow.classList.remove('show');

  // Compute the result now, from the buffered samples, so the reveal
  // animation shows the shape that actually gets sent to RN.
  var modal=modeOf(recentShapes)||computeShape(capturedLm)||'Oval';
  var agreeN=0;
  for(var i=0;i<recentShapes.length;i++){if(recentShapes[i]===modal)agreeN++;}
  var agree=recentShapes.length?agreeN/recentShapes.length:0.8;
  var confidence=Math.max(62,Math.min(98,Math.round(agree*100)));
  var rawAvg=avgRaw(recentMetrics);
  var metricsAvg=avgMetrics(recentMetrics);

  runCaptureAnimation(capturedLm,modal,capturedPhoto,function(){
    post({
      type:'faceShape',shape:modal,confidence:confidence,
      metrics:metricsAvg,
      debug:{raw:rawAvg,scores:null,samples:recentShapes.length}
    });
  });
});

// ── MediaPipe face mesh ──────────────────────────────────────────────────────
var faceMesh=new FaceMesh({locateFile:function(f){return'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/'+f;}});
faceMesh.setOptions({maxNumFaces:1,refineLandmarks:false,minDetectionConfidence:0.55,minTrackingConfidence:0.55});

faceMesh.onResults(function(results){
  if(done||!armed)return;
  var lms=results.multiFaceLandmarks;

  if(!lms||!lms[0]){
    lastLm=null;
    setCaptureEnabled(false);
    oval.className='guide-oval';
    hint.className='';
    hint.textContent='Position your face in the frame';
    if(hudStatus){hudStatus.textContent='Searching';hudStatus.className='hud hud-tr searching';}
    if(hudCoord){hudCoord.textContent='Yaw --  Sz --';}
    return;
  }

  var lm=lms[0];
  lastLm=lm;
  var sz=faceSize(lm);

  if(sz<0.16){
    setCaptureEnabled(false);
    oval.className='guide-oval';hint.className='warn';
    hint.textContent='Move closer';return;
  }
  if(sz>0.80){
    setCaptureEnabled(false);
    oval.className='guide-oval';hint.className='warn';
    hint.textContent='Move farther away';return;
  }

  var yaw=yawOf(lm);
  if(hudStatus){hudStatus.textContent='Tracking';hudStatus.className='hud hud-tr';}
  if(hudCoord){hudCoord.textContent='Yaw '+(yaw>=0?'+':'')+yaw.toFixed(2)+'  Sz '+sz.toFixed(2);}

  if(!centeredEnough(lm)){
    setCaptureEnabled(false);
    oval.className='guide-oval';hint.className='warn';
    hint.textContent='Center your face in the frame';return;
  }
  if(Math.abs(yaw)>FRONT_MAX){
    setCaptureEnabled(false);
    oval.className='guide-oval';hint.className='warn';
    hint.textContent='Look straight at the camera';return;
  }

  setCaptureEnabled(true);
  oval.className='guide-oval locked';
  hint.className='success';
  hint.textContent='Perfect - tap to capture';
  var mm=computeMetrics(lm);
  if(mm){
    recentMetrics.push(mm);
    recentShapes.push(classify(mm));
    if(recentMetrics.length>MAX_SAMPLES){recentMetrics.shift();recentShapes.shift();}
  }
});

// ── Start camera ─────────────────────────────────────────────────────────────
var video=document.getElementById('video');
var cam=new Camera(video,{
  onFrame:async function(){await faceMesh.send({image:video});},
  width:640,height:480,facingMode:'user'
});
cam.start()
  .then(function(){document.getElementById('loading').style.display='none';})
  .catch(function(err){
    post({type:'cameraError',reason:String(err)});
    document.getElementById('loading').innerHTML='<p style="color:rgba(255,255,255,.7);padding:20px;text-align:center">Camera access denied.<br>Please allow camera permission and try again.</p>';
  });
})();
</script>
</body>
</html>`;

// ─── Face Scan — Real Camera (WebView + MediaPipe) ────────────────────────────

// ─── Pre-Scan Countdown ───────────────────────────────────────────────────────
// Counts 3 → 2 → 1, then shows "Ready to scan face" before opening the camera.

const COUNTDOWN_STEPS = ['3', '2', '1', 'Ready to scan face'];

const ScanCountdown: React.FC<{ onComplete: () => void }> = ({
  onComplete,
}) => {
  const [index, setIndex] = useState(0);
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scrim = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let i = 0;
    const animateIn = () => {
      scale.setValue(0.5);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateIn();
    const timer = setInterval(() => {
      i += 1;
      if (i < COUNTDOWN_STEPS.length) {
        setIndex(i);
        animateIn();
      } else {
        clearInterval(timer);
        // Fade the overlay away to smoothly reveal the already-running camera.
        Animated.timing(scrim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }).start(() => onCompleteRef.current());
      }
    }, 950);

    return () => clearInterval(timer);
  }, [scale, opacity, scrim]);

  const value = COUNTDOWN_STEPS[index];
  const isNumber = value.length <= 2;

  return (
    <Animated.View style={[cdStyles.root, { opacity: scrim }]}>
      <AppText style={cdStyles.heading}>Get ready</AppText>
      <Animated.View
        style={[
          cdStyles.ring,
          { opacity, transform: [{ scale }] },
          !isNumber && cdStyles.ringText,
        ]}
      >
        <AppText style={isNumber ? cdStyles.number : cdStyles.readyText}>
          {value}
        </AppText>
      </Animated.View>
      <AppText style={cdStyles.sub}>
        Hold your phone at eye level and look straight ahead.
      </AppText>
    </Animated.View>
  );
};

const cdStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,8,7,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  heading: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FontSize.sm,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xl,
  },
  ring: {
    width: 180,
    height: 180,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(45,189,126,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,189,126,0.10)',
  },
  ringText: {
    width: 230,
    height: 230,
    borderRadius: 46,
    paddingHorizontal: Spacing.lg,
  },
  number: {
    color: Colors.white,
    fontSize: 90,
    fontWeight: '800',
    letterSpacing: -1,
  },
  readyText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xl,
    lineHeight: 20,
  },
});

const FaceScanCamera: React.FC<{
  armed: boolean;
  onShapeDetected: (
    shape: FaceShape,
    confidence: number,
    metrics: FaceMetrics | null,
    debug: FaceDebug | null,
  ) => void;
  onCameraError: () => void;
  onCancel: () => void;
}> = ({ armed, onShapeDetected, onCameraError, onCancel }) => {
  const webViewRef = useRef<WebView>(null);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const d = JSON.parse(e.nativeEvent.data);
        if (d.type === 'faceShape' && d.shape) {
          // Temporary debugging aid — surfaces the raw ratios behind each result.
          if (d.debug) {
            console.log(
              `[FaceScan DBG] shape=${d.shape} raw=${JSON.stringify(
                d.debug.raw,
              )} scores=${JSON.stringify(d.debug.scores)}`,
            );
          }
          onShapeDetected(
            d.shape as FaceShape,
            typeof d.confidence === 'number' ? d.confidence : 90,
            (d.metrics as FaceMetrics) || null,
            (d.debug as FaceDebug) || null,
          );
        } else if (d.type === 'cameraError') {
          onCameraError();
        }
      } catch {}
    },
    [onShapeDetected, onCameraError],
  );

  // Start detection only once the countdown is done (camera already warm).
  useEffect(() => {
    if (armed) {
      webViewRef.current?.injectJavaScript(
        'window.armScan&&window.armScan();true;',
      );
    }
  }, [armed]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <WebView
        ref={webViewRef}
        source={{ html: SCAN_HTML, baseUrl: 'https://localhost' }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        originWhitelist={['*']}
        mixedContentMode="always"
        contentInsetAdjustmentBehavior="never"
        onMessage={onMessage}
      />
      <SafeAreaView style={styles.cancelArea} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

// ─── Face Shape Selector ──────────────────────────────────────────────────────

const FaceShapeSelector: React.FC<{
  onSelect: (shape: FaceShape) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}> = ({
  onSelect,
  onCancel,
  title = 'Select Your Face Shape',
  subtitle = 'Camera is not available on this device. Pick the shape that best matches your face to get personalised recommendations.',
}) => (
  <ScrollView
    contentContainerStyle={styles.contentPad}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.heroCard}>
      <View style={styles.heroIconRing}>
        <Ionicons name="scan-outline" size={48} color={Colors.primary} />
      </View>
      <AppText style={styles.heroTitle}>{title}</AppText>
      <AppText style={styles.heroSub}>{subtitle}</AppText>
    </View>

    {(
      Object.entries(FACE_SHAPE_INFO) as [
        FaceShape,
        (typeof FACE_SHAPE_INFO)[FaceShape],
      ][]
    ).map(([shape, info]) => (
      <TouchableOpacity
        key={shape}
        style={scanStyles.shapeRow}
        onPress={() => onSelect(shape)}
        activeOpacity={0.8}
      >
        <View style={scanStyles.shapeIcon}>
          <Ionicons name={info.icon as any} size={26} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={scanStyles.shapeName}>{shape}</AppText>
          <AppText style={scanStyles.shapeDesc} numberOfLines={2}>
            {info.description}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
      </TouchableOpacity>
    ))}

    <TouchableOpacity
      style={[styles.outlineBtn, { marginTop: Spacing.md }]}
      onPress={onCancel}
      activeOpacity={0.8}
    >
      <Ionicons name="arrow-back-outline" size={17} color={Colors.primary} />
      <AppText style={styles.outlineBtnText}>Go Back</AppText>
    </TouchableOpacity>
  </ScrollView>
);

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TabBar: React.FC<{ active: Tab; onChange: (t: Tab) => void }> = ({
  active,
  onChange,
}) => (
  <View style={styles.tabBar}>
    {(
      [
        { key: 'face', icon: 'scan-outline', label: 'Face Scan' },
        { key: 'refraction', icon: 'eye-outline', label: 'Eye Test' },
      ] as { key: Tab; icon: string; label: string }[]
    ).map(tab => {
      const isActive = active === tab.key;
      return (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabBtn, isActive && styles.tabBtnActive]}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={tab.icon as any}
            size={17}
            color={isActive ? Colors.primary : Colors.gray400}
          />
          <AppText style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
            {tab.label}
          </AppText>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Face Scan — Idle ─────────────────────────────────────────────────────────

const FaceScanIdle: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <ScrollView
    contentContainerStyle={styles.contentPad}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.heroCard}>
      <View style={styles.heroIconRing}>
        <Ionicons name="scan-circle-outline" size={64} color={Colors.primary} />
      </View>
      <AppText style={styles.heroTitle}>Face Shape Scan</AppText>
      <AppText style={styles.heroSub}>
        We'll analyse your face shape using your front camera and recommend the
        perfect frames for you.
      </AppText>
    </View>

    {[
      { n: '1', text: 'Find good lighting and hold your phone at eye level.' },
      {
        n: '2',
        text: 'Position your face inside the frame and look straight ahead.',
      },
      {
        n: '3',
        text: 'When the frame locks green, tap Capture to scan your face.',
      },
    ].map(step => (
      <View key={step.n} style={styles.stepRow}>
        <View style={styles.stepBadge}>
          <AppText style={styles.stepNum}>{step.n}</AppText>
        </View>
        <AppText style={styles.stepText}>{step.text}</AppText>
      </View>
    ))}

    <TouchableOpacity
      style={styles.primaryBtn}
      onPress={onStart}
      activeOpacity={0.82}
    >
      <Ionicons name="scan-outline" size={20} color={Colors.white} />
      <AppText style={styles.primaryBtnText}>Start Scan</AppText>
    </TouchableOpacity>
  </ScrollView>
);

// ─── Product Recommendations (by face shape) ──────────────────────────────────

// Why a given frame shape flatters each face shape — used to explain each pick.
const SHAPE_EFFECT: Record<FaceShape, string> = {
  Oval: 'keeps your naturally balanced proportions in harmony.',
  Round: 'adds definition and makes your face look slimmer.',
  Square: 'softens your strong jawline and angular features.',
  Heart: 'balances your wider forehead and narrower chin.',
  Oblong: 'adds width and makes your face appear shorter.',
  Diamond: 'highlights your cheekbones and softens the angles.',
  Triangle: 'adds balance to your wider jawline.',
};

// Per-frame-shape icon + the reason it flatters a face — shown in the
// "Recommended Frame Shapes" section.
const FRAME_INFO: Record<string, { icon: string; reason: string }> = {
  Wayfarer: {
    icon: 'square-outline',
    reason:
      'Bold angular lines add structure and definition to softer features.',
  },
  Aviator: {
    icon: 'triangle-outline',
    reason:
      'Teardrop curves balance an angular jaw and gently elongate the face.',
  },
  Round: {
    icon: 'ellipse-outline',
    reason: 'Soft circular frames offset strong angles and a wide jawline.',
  },
  'Cat-Eye': {
    icon: 'sparkles-outline',
    reason: 'Upswept outer corners lift the face and draw the eye upward.',
  },
  Rectangle: {
    icon: 'tablet-landscape-outline',
    reason: 'Straight, wider lines add definition and slim a rounder face.',
  },
  Square: {
    icon: 'square-outline',
    reason: 'Sharp geometric edges contrast soft curves for a balanced look.',
  },
  Browline: {
    icon: 'glasses-outline',
    reason:
      'Weight on the top frame widens the forehead and offsets a strong jaw.',
  },
  Geometric: {
    icon: 'shapes-outline',
    reason: 'Distinct angles add a modern, structured edge to your look.',
  },
  Oval: {
    icon: 'ellipse-outline',
    reason: 'Gently rounded frames flatter almost any face and soften angles.',
  },
  Rimless: {
    icon: 'remove-outline',
    reason: 'Minimal, light frames keep the focus on your eyes and cheekbones.',
  },
  Oversized: {
    icon: 'expand-outline',
    reason: 'Larger frames add width and shorten the look of a longer face.',
  },
  Decorative: {
    icon: 'diamond-outline',
    reason: 'Detailing and depth add width and visual interest to a long face.',
  },
};

const ProductRecommendations: React.FC<{
  shape: FaceShape;
  recommendedFrames: string[];
  mode: ResultTab;
  hairStyle: HairStyle | null;
  onPickProduct: (id: number) => void;
}> = ({ shape, recommendedFrames, mode, hairStyle, onPickProduct }) => {
  const { products, loading } = useProductList({
    page: 1,
    is_active_mobile: true,
    limit: 50,
  });

  const wanted = recommendedFrames.map(f => f.toLowerCase());
  const matched = products.filter(
    p =>
      p.frame_shape?.name && wanted.includes(p.frame_shape.name.toLowerCase()),
  );
  // Fall back to the general catalogue if nothing matches the face shape.
  const recommended = (matched.length ? matched : products).slice(0, 6);

  const reasonFor = (p: Product): string => {
    const fs = p.frame_shape?.name?.toLowerCase();
    if (mode === 'hair' && hairStyle) {
      return fs
        ? `Its ${fs} shape complements ${hairStyle.toLowerCase()} hair.`
        : `A great match for ${hairStyle.toLowerCase()} hair.`;
    }
    return fs
      ? `Its ${fs} shape ${SHAPE_EFFECT[shape]}`
      : `A great match for your ${shape.toLowerCase()} face.`;
  };

  if (loading) {
    return (
      <View style={prStyles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!recommended.length) {
    return (
      <View style={prStyles.empty}>
        <Ionicons name="glasses-outline" size={28} color={Colors.gray300} />
        <AppText style={prStyles.emptyText}>
          No matching frames available right now.
        </AppText>
      </View>
    );
  }

  return (
    <View style={prStyles.list}>
      {recommended.map(p => (
        <TouchableOpacity
          key={p.id}
          style={prStyles.card}
          activeOpacity={0.8}
          onPress={() => onPickProduct(p.id)}
        >
          <Image
            source={{ uri: p.image }}
            style={prStyles.image}
            resizeMode="contain"
          />
          <View style={prStyles.info}>
            <AppText style={prStyles.name} numberOfLines={1}>
              {p.name}
            </AppText>
            {p.brand?.name ? (
              <AppText style={prStyles.brand}>{p.brand.name}</AppText>
            ) : null}
            <View style={prStyles.reasonRow}>
              <Ionicons
                name="sparkles-outline"
                size={12}
                color={Colors.primary}
              />
              <AppText style={prStyles.reason} numberOfLines={2}>
                {reasonFor(p)}
              </AppText>
            </View>
            <AppText style={prStyles.price}>${p.price}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Glasses Recommendation Bottom Sheet ──────────────────────────────────────

const GlassesBottomSheet: React.FC<{
  visible: boolean;
  shape: FaceShape;
  confidence?: number | null;
  metrics?: FaceMetrics | null;
  debug?: FaceDebug | null;
  onClose: () => void;
}> = ({ visible, shape, confidence, metrics, debug, onClose }) => {
  const navigation = useNavigation<any>();
  const info = FACE_SHAPE_INFO[shape];
  const [showMeasure, setShowMeasure] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 200,
          mass: 0.9,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[gsStyles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[gsStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={gsStyles.handle} />

        {/* Header — minimal: title + close */}
        <View style={gsStyles.header}>
          <AppText style={gsStyles.headerTitle}>Your Results</AppText>
          <TouchableOpacity
            onPress={onClose}
            style={gsStyles.closeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={Colors.gray600} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={gsStyles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero — face shape + confidence, compact */}
          <View style={gsStyles.heroCard}>
            <View style={gsStyles.heroIcon}>
              <Ionicons
                name={info.icon as any}
                size={26}
                color={Colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={gsStyles.heroOverline}>YOUR FACE SHAPE</AppText>
              <AppText style={gsStyles.heroShape}>{shape}</AppText>
            </View>
            {typeof confidence === 'number' && (
              <View style={gsStyles.heroConf}>
                <AppText style={gsStyles.heroConfPct}>{confidence}%</AppText>
                <AppText style={gsStyles.heroConfLabel}>match</AppText>
              </View>
            )}
          </View>
          <AppText style={gsStyles.heroDesc}>{info.description}</AppText>

          {/* ── Recommendations — the hero of this screen ── */}
          <View style={gsStyles.sectionHeadRow}>
            <AppText style={gsStyles.sectionH}>Best Frames for You</AppText>
            <View style={gsStyles.countBadge}>
              <AppText style={gsStyles.countBadgeText}>
                {info.frames.length}
              </AppText>
            </View>
          </View>
          <AppText style={gsStyles.sectionSub}>
            Tap a shape to browse matching frames in store
          </AppText>

          <View style={gsStyles.recList}>
            {info.frames.map((frame, idx) => {
              const fi = FRAME_INFO[frame] || {
                icon: 'glasses-outline',
                reason: `A flattering match for your ${shape.toLowerCase()} face.`,
              };
              const best = idx === 0;
              return (
                <TouchableOpacity
                  key={frame}
                  style={[gsStyles.recCard, best && gsStyles.recCardBest]}
                  activeOpacity={0.85}
                  onPress={() => {
                    onClose();
                    navigation.navigate('GlassesList', {
                      from: 'frame',
                      frameShape: frame,
                    });
                  }}
                >
                  {best && (
                    <View style={gsStyles.bestTag}>
                      <Ionicons name="star" size={9} color={Colors.white} />
                      <AppText style={gsStyles.bestTagText}>BEST MATCH</AppText>
                    </View>
                  )}
                  <View style={gsStyles.recCardTop}>
                    <View
                      style={[gsStyles.recIcon, best && gsStyles.recIconBest]}
                    >
                      <Ionicons
                        name={fi.icon as any}
                        size={24}
                        color={best ? Colors.white : Colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={gsStyles.recName}>{frame}</AppText>
                      <AppText style={gsStyles.recReason}>{fi.reason}</AppText>
                    </View>
                  </View>
                  <View style={gsStyles.recCta}>
                    <AppText style={gsStyles.recCtaText}>View frames</AppText>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={Colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Styling tip */}
          <View style={gsStyles.tipCard}>
            <Ionicons name="bulb" size={16} color={Colors.primary} />
            <AppText style={gsStyles.tipText}>{info.tip}</AppText>
          </View>

          {/* ── Secondary: measurements, collapsed by default ── */}
          {metrics && (
            <>
              <TouchableOpacity
                style={gsStyles.measureToggle}
                onPress={() => setShowMeasure(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="analytics-outline"
                  size={16}
                  color={Colors.gray600}
                />
                <AppText style={gsStyles.measureToggleText}>
                  Face measurements
                </AppText>
                <Ionicons
                  name={showMeasure ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.gray500}
                />
              </TouchableOpacity>

              {showMeasure && (
                <View style={gsStyles.analysisCard}>
                  <AppText style={gsStyles.analysisLabel}>
                    Face Landmarks
                  </AppText>
                  {[
                    {
                      label: 'Face Width',
                      value: metrics.pFaceWidth,
                      color: Colors.info,
                    },
                    {
                      label: 'Face Length',
                      value: metrics.pFaceLength,
                      color: Colors.primary,
                    },
                    {
                      label: 'Jaw Angle',
                      value: metrics.pJawAngle,
                      color: Colors.error,
                    },
                  ].map(row => (
                    <View key={row.label} style={gsStyles.barRow}>
                      <View style={gsStyles.barTop}>
                        <AppText style={gsStyles.barLabel}>{row.label}</AppText>
                        <AppText
                          style={[gsStyles.barPct, { color: row.color }]}
                        >
                          {row.value}%
                        </AppText>
                      </View>
                      <View style={gsStyles.barTrack}>
                        <View
                          style={[
                            gsStyles.barFill,
                            {
                              width: `${row.value}%` as any,
                              backgroundColor: row.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}

                  <View style={gsStyles.tileGrid}>
                    {[
                      { label: 'Forehead Width', value: metrics.pForehead },
                      { label: 'Cheekbone', value: metrics.pCheekbone },
                      { label: 'Jawline', value: metrics.pJawline },
                      { label: 'Face Length', value: metrics.pFaceLength },
                    ].map(t => (
                      <View key={t.label} style={gsStyles.tile}>
                        <AppText style={gsStyles.tileLabel}>{t.label}</AppText>
                        <AppText style={gsStyles.tileValue}>{t.value}%</AppText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── TEMPORARY debug panel showing the raw ratios behind the result.
                 Safe to delete (along with the FaceDebug plumbing) any time. ── */}
          {debug?.raw && (
            <View style={gsStyles.dbgCard}>
              <AppText style={gsStyles.dbgTitle}>
                CALIBRATION DATA (temporary)
              </AppText>
              <AppText style={gsStyles.dbgRow}>
                aspect (len/width) : {debug.raw.aspect.toFixed(3)}
              </AppText>
              <AppText style={gsStyles.dbgRow}>
                fVc (forehead/cheek): {debug.raw.fVc.toFixed(3)}
              </AppText>
              <AppText style={gsStyles.dbgRow}>
                jVc (jaw/cheek) : {debug.raw.jVc.toFixed(3)}
              </AppText>
              <AppText style={gsStyles.dbgRow}>
                jawDeg : {debug.raw.jawDeg.toFixed(1)}
              </AppText>
              <AppText style={gsStyles.dbgRow}>
                picked : {shape} ({debug.samples} frames)
              </AppText>
            </View>
          )}

          {/* CTAs */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onClose}
            activeOpacity={0.82}
          >
            <Ionicons name="refresh-outline" size={19} color={Colors.white} />
            <AppText style={styles.primaryBtnText}>Scan Again</AppText>
          </TouchableOpacity>

          <View style={gsStyles.footerNote}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={Colors.gray400}
            />
            <AppText style={gsStyles.footerNoteText}>
              Frame recommendations are based on your face shape analysis and
              are indicative only. Visit an M Optic store to try on frames in
              person.
            </AppText>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// ─── Refraction — Intro ───────────────────────────────────────────────────────

const RefractionIntro: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <ScrollView
    contentContainerStyle={styles.contentPad}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.heroCard}>
      <View style={styles.heroIconRing}>
        <Ionicons name="eye-outline" size={56} color={Colors.primary} />
      </View>
      <AppText style={styles.heroTitle}>Eye Refraction Test</AppText>
      <AppText style={styles.heroSub}>
        A quick 3-part screening to help identify potential refractive errors
        and colour vision.
      </AppText>
      <View style={rfStyles.oneHandBanner}>
        <Ionicons
          name="hand-left-outline"
          size={20}
          color={Colors.primaryDark}
        />
        <AppText style={rfStyles.oneHandBannerText}>
          Cover one eye with your free hand — you'll only need your other thumb
          to tap through each step.
        </AppText>
      </View>
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { marginTop: Spacing.md, alignSelf: 'stretch' },
        ]}
        onPress={onStart}
        activeOpacity={0.82}
      >
        <Ionicons name="play-outline" size={20} color={Colors.white} />
        <AppText style={styles.primaryBtnText}>Begin Test</AppText>
      </TouchableOpacity>
    </View>

    <AppText style={styles.sectionLabel}>What we'll test</AppText>
    {[
      {
        icon: 'compass-outline',
        title: 'Visual Acuity',
        desc: 'Cover one eye at a time and pick which direction the gap in each ring is facing.',
      },
      {
        icon: 'color-palette-outline',
        title: 'Colour Vision',
        desc: 'Identify numbers hidden in coloured dot plates (Ishihara-style).',
      },
      {
        icon: 'radio-button-off-outline',
        title: 'Astigmatism Check',
        desc: 'View a radial pattern to detect uneven focus in the eye.',
      },
    ].map(item => (
      <View key={item.title} style={styles.featureRow}>
        <View style={styles.featureIconBox}>
          <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.featureTitle}>{item.title}</AppText>
          <AppText style={styles.featureDesc}>{item.desc}</AppText>
        </View>
      </View>
    ))}

    <View style={styles.disclaimerCard}>
      <Ionicons
        name="information-circle-outline"
        size={16}
        color={Colors.gray400}
      />
      <AppText style={styles.disclaimerText}>
        This is a preliminary screening only and does not replace a professional
        eye examination by a qualified optometrist.
      </AppText>
    </View>
  </ScrollView>
);

// ─── Refraction — Eye Switch Instruction ─────────────────────────────────────
// Shown between per-eye tests so each eye is a clearly separated session:
// cover the other eye and confirm before the next set of questions starts.

const EyeCoverStep: React.FC<{
  eye: 'left' | 'right';
  stepNum: string;
  testName: string;
  onContinue: () => void;
}> = ({ eye, stepNum, testName, onContinue }) => {
  const coverEye = eye === 'left' ? 'right' : 'left';
  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <AppText style={styles.stepCounter}>
          Step {stepNum} of 3 — {testName} ({eye === 'left' ? 'Left' : 'Right'}{' '}
          Eye)
        </AppText>
      </View>
      <View style={styles.heroCard}>
        <View style={styles.heroIconRing}>
          <Ionicons name="eye-outline" size={56} color={Colors.primary} />
        </View>
        <AppText style={styles.heroTitle}>
          {eye === 'left' ? 'Left' : 'Right'} Eye's Turn
        </AppText>
        <AppText style={styles.heroSub}>
          Cover your {coverEye} eye with your free hand. When you're ready,
          we'll test your {eye} eye only.
        </AppText>
        <View style={rfStyles.oneHandBanner}>
          <Ionicons
            name="hand-left-outline"
            size={20}
            color={Colors.primaryDark}
          />
          <AppText style={rfStyles.oneHandBannerText}>
            Keep the phone at arm's length and tap Continue once your {coverEye}{' '}
            eye is covered.
          </AppText>
        </View>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { marginTop: Spacing.md, alignSelf: 'stretch' },
          ]}
          onPress={onContinue}
          activeOpacity={0.82}
        >
          <Ionicons name="play-outline" size={20} color={Colors.white} />
          <AppText style={styles.primaryBtnText}>
            Continue — {eye === 'left' ? 'Left' : 'Right'} Eye
          </AppText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ─── Refraction — Step 1: Visual Acuity (Landolt C) ──────────────────────────

// Renders a ring with a gap on one edge, rotated so the gap points at `angle`
// degrees clockwise from up (0 = up, 90 = right, 180 = down, 270 = left).
const LandoltC: React.FC<{ size: number; angle: number }> = ({
  size,
  angle,
}) => {
  const stroke = size * 0.22;
  const gapWidth = stroke * 1.2;
  return (
    <View
      style={{
        width: size,
        height: size,
        transform: [{ rotate: `${angle}deg` }],
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: Colors.black,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: -1,
          left: (size - gapWidth) / 2,
          width: gapWidth,
          height: stroke + 2,
          backgroundColor: Colors.white,
        }}
      />
    </View>
  );
};

// A compass of 8 direction buttons arranged in a circle around the ring
// preview, so the user can pick the angle the gap is facing.
const DirectionPicker: React.FC<{
  selected: number | null;
  correctAngle: number;
  onSelect: (angle: number) => void;
}> = ({ selected, correctAngle, onSelect }) => (
  <View style={rfStyles.compassContainer}>
    {LANDOLT_DIRECTIONS.map(dir => {
      const rad = (dir.angle * Math.PI) / 180;
      const half = rfStyles.compassBtn.width! / 2;
      const radius = rfStyles.compassContainer.width! / 2 - half - 4;
      const x =
        rfStyles.compassContainer.width! / 2 - half + radius * Math.sin(rad);
      const y =
        rfStyles.compassContainer.height! / 2 - half - radius * Math.cos(rad);
      const isSelected = selected === dir.angle;
      const revealCorrect = selected !== null && dir.angle === correctAngle;
      const showWrong = isSelected && dir.angle !== correctAngle;
      const highlighted = revealCorrect || showWrong;
      return (
        <TouchableOpacity
          key={dir.angle}
          accessibilityLabel={dir.label}
          disabled={selected !== null}
          style={[
            rfStyles.compassBtn,
            { left: x, top: y },
            revealCorrect && rfStyles.compassBtnCorrect,
            showWrong && rfStyles.compassBtnWrong,
          ]}
          onPress={() => onSelect(dir.angle)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="arrow-up"
            size={15}
            color={highlighted ? Colors.white : Colors.gray600}
            style={{ transform: [{ rotate: `${dir.angle}deg` }] }}
          />
        </TouchableOpacity>
      );
    })}
  </View>
);

// Shared countdown bar — used by every timed step to keep the pressure on.
const CountdownBar: React.FC<{ timeLeft: number; timeLimit: number }> = ({
  timeLeft,
  timeLimit,
}) => {
  const danger = timeLeft <= Math.min(1, timeLimit);
  return (
    <View style={rfStyles.timerRow}>
      <Ionicons
        name="timer-outline"
        size={16}
        color={danger ? Colors.error : Colors.gray500}
      />
      <View style={rfStyles.timerTrack}>
        <View
          style={[
            rfStyles.timerFill,
            { width: `${Math.max(0, (timeLeft / timeLimit) * 100)}%` },
            danger && rfStyles.timerFillDanger,
          ]}
        />
      </View>
      <AppText style={[rfStyles.timerText, danger && rfStyles.timerTextDanger]}>
        {Math.max(0, timeLeft)}s
      </AppText>
    </View>
  );
};

const AcuityStep: React.FC<{
  eye: 'left' | 'right';
  rows: AcuityRow[];
  onComplete: (passCount: number) => void;
}> = ({ eye, rows, onComplete }) => {
  const [rowIndex, setRowIndex] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [selectedAngle, setSelectedAngle] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ACUITY_TIME_LIMIT);

  const row = rows[rowIndex];

  // Staircase: the ring gets smaller after every correct answer. The test
  // ends as soon as one is missed (or the smallest ring is read correctly).
  const handleSelect = (angle: number) => {
    setSelectedAngle(angle);
    const isCorrect = angle === row.angle;
    const newCount = isCorrect ? passCount + 1 : passCount;
    setTimeout(() => {
      if (!isCorrect || rowIndex + 1 >= rows.length) {
        onComplete(newCount);
      } else {
        setPassCount(newCount);
        setSelectedAngle(null);
        setRowIndex(prev => prev + 1);
      }
    }, 500);
  };

  // Reset the clock every time a new ring appears.
  useEffect(() => {
    setTimeLeft(ACUITY_TIME_LIMIT);
  }, [rowIndex]);

  // Tick the clock; running out counts as a wrong (auto-fail) answer.
  useEffect(() => {
    if (selectedAngle !== null) return;
    if (timeLeft <= 0) {
      handleSelect(-1);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, selectedAngle, rowIndex]);

  const progress = (rowIndex / rows.length) * 100;
  const coverEye = eye === 'left' ? 'right' : 'left';
  const stepNum = eye === 'left' ? '1a' : '1b';

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress */}
      <View style={styles.stepHeader}>
        <AppText style={styles.stepCounter}>
          Step {stepNum} of 3 — Visual Acuity (
          {eye === 'left' ? 'Left' : 'Right'} Eye)
        </AppText>
        <AppText style={styles.stepCounterRight}>
          Row {rowIndex + 1}/{rows.length}
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={rfStyles.coverEyeBanner}>
        <Ionicons
          name="hand-left-outline"
          size={22}
          color={Colors.primaryDark}
        />
        <AppText style={rfStyles.coverEyeBannerText}>
          Cover your <AppText style={rfStyles.coverEyeBold}>{coverEye}</AppText>{' '}
          eye with your free hand, then read with your {eye} eye only.
        </AppText>
      </View>

      <View style={styles.acuityCard}>
        <AppText style={styles.acuityInstruction}>
          Hold the phone at arm's length. Find the gap in the ring below.
        </AppText>
        <View style={styles.acuityLetterBox}>
          <LandoltC size={row.size} angle={row.angle} />
          <AppText style={styles.acuityLabel}>{row.label} line</AppText>
        </View>
        <AppText style={styles.acuityQuestion}>
          Which direction is the gap facing?
        </AppText>
      </View>

      <CountdownBar timeLeft={timeLeft} timeLimit={ACUITY_TIME_LIMIT} />

      <DirectionPicker
        selected={selectedAngle}
        correctAngle={row.angle}
        onSelect={handleSelect}
      />
    </ScrollView>
  );
};

// ─── Refraction — Step 2: Astigmatism ────────────────────────────────────────

// Seconds allowed to answer before it's auto-marked as unequal (fail-safe:
// running out of time reads as "couldn't tell", the stricter outcome).
const ASTIGMATISM_TIME_LIMIT = 5;
// 36 spokes at 5° spacing — finer than the eye can lazily eyeball at a glance.
const ASTIGMATISM_SPOKES = 36;

const AstigmatismStep: React.FC<{
  eye: 'left' | 'right';
  onComplete: (result: 'equal' | 'unequal') => void;
}> = ({ eye, onComplete }) => {
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ASTIGMATISM_TIME_LIMIT);
  const coverEye = eye === 'left' ? 'right' : 'left';
  const stepNum = eye === 'left' ? '3a' : '3b';

  const handleAnswer = (result: 'equal' | 'unequal') => {
    if (answered) return;
    setAnswered(true);
    onComplete(result);
  };

  useEffect(() => {
    if (answered) return;
    if (timeLeft <= 0) {
      handleAnswer('unequal');
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, answered]);

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <AppText style={styles.stepCounter}>
          Step {stepNum} of 3 — Astigmatism Check (
          {eye === 'left' ? 'Left' : 'Right'} Eye)
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: eye === 'left' ? '85%' : '100%' },
          ]}
        />
      </View>

      <View style={rfStyles.coverEyeBanner}>
        <Ionicons
          name="hand-left-outline"
          size={22}
          color={Colors.primaryDark}
        />
        <AppText style={rfStyles.coverEyeBannerText}>
          Cover your <AppText style={rfStyles.coverEyeBold}>{coverEye}</AppText>{' '}
          eye with your free hand, hold the phone at arm's length.
        </AppText>
      </View>

      <CountdownBar timeLeft={timeLeft} timeLimit={ASTIGMATISM_TIME_LIMIT} />

      <View style={styles.acuityCard}>
        <AppText style={styles.acuityInstruction}>
          Look at the center dot of the pattern below. Keep your eyes relaxed.
        </AppText>

        {/* Radial fan rendered with rotated views */}
        <View style={rfStyles.wheelContainer}>
          {Array.from({ length: ASTIGMATISM_SPOKES }, (_, i) => (
            <View
              key={i}
              style={[
                rfStyles.wheelSpoke,
                {
                  transform: [
                    { rotate: `${i * (360 / ASTIGMATISM_SPOKES)}deg` },
                  ],
                },
              ]}
            />
          ))}
          <View style={rfStyles.wheelDot} />
        </View>

        <AppText style={styles.acuityQuestion}>
          Do all the lines appear equally dark and the same thickness?
        </AppText>
      </View>

      <TouchableOpacity
        style={rfStyles.answerYesBtn}
        disabled={answered}
        onPress={() => handleAnswer('equal')}
        activeOpacity={0.82}
      >
        <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
        <AppText style={rfStyles.answerYesBtnText}>
          Yes, all lines look equal
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        style={rfStyles.answerNoBtn}
        disabled={answered}
        onPress={() => handleAnswer('unequal')}
        activeOpacity={0.8}
      >
        <Ionicons name="close-circle" size={22} color={Colors.error} />
        <AppText style={rfStyles.answerNoBtnText}>
          Some lines look darker / thicker
        </AppText>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Refraction — Step 2: Colour Vision ──────────────────────────────────────

// Seconds allowed per plate before it's auto-marked wrong.
const COLOR_TIME_LIMIT = 5;

const ColorVisionStep: React.FC<{
  plates: CvPlate[];
  onComplete: (result: ColorResult) => void;
}> = ({ plates, onComplete }) => {
  const [plateIndex, setPlateIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(COLOR_TIME_LIMIT);

  const plate = plates[plateIndex];

  // Getting more than one plate wrong (out of the full set) now reads as
  // a full deficiency rather than "mild" — a stricter bar to pass clean.
  const handleAnswer = (answer: string) => {
    setAnswered(true);
    const isCorrect = answer === plate.correct;
    const newCorrect = isCorrect ? correctCount + 1 : correctCount;

    setTimeout(() => {
      if (plateIndex + 1 >= plates.length) {
        if (newCorrect === plates.length) onComplete('normal');
        else if (newCorrect >= plates.length - 1) onComplete('mild');
        else onComplete('deficient');
      } else {
        setCorrectCount(newCorrect);
        setAnswered(false);
        setPlateIndex(prev => prev + 1);
      }
    }, 300);
  };

  useEffect(() => {
    setTimeLeft(COLOR_TIME_LIMIT);
  }, [plateIndex]);

  useEffect(() => {
    if (answered) return;
    if (timeLeft <= 0) {
      handleAnswer('');
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, answered, plateIndex]);

  const progress = (plateIndex / plates.length) * 100;

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <AppText style={styles.stepCounter}>
          Step 2 of 3 — Colour Vision
        </AppText>
        <AppText style={styles.stepCounterRight}>
          Plate {plateIndex + 1}/{plates.length}
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <CountdownBar timeLeft={timeLeft} timeLimit={COLOR_TIME_LIMIT} />

      <View style={[styles.acuityCard, { paddingBottom: Spacing.md }]}>
        <AppText style={styles.acuityInstruction}>{plate.hint}</AppText>

        <View style={rfStyles.plateContainer}>
          <WebView
            source={{ html: makeIshiharaHtml(plate.number) }}
            style={rfStyles.plateWebView}
            scrollEnabled={false}
            javaScriptEnabled
            originWhitelist={['*']}
          />
        </View>

        <AppText style={styles.acuityQuestion}>{plate.question}</AppText>
      </View>

      {plate.options.map(opt => {
        const isNone = opt === CANT_SEE;
        return (
          <TouchableOpacity
            key={opt}
            disabled={answered}
            style={[
              styles.outlineBtn,
              { marginTop: Spacing.sm },
              isNone && {
                borderColor: Colors.gray300,
                backgroundColor: 'transparent',
              },
            ]}
            onPress={() => handleAnswer(opt)}
            activeOpacity={0.8}
          >
            <AppText
              style={[
                styles.outlineBtnText,
                isNone && { color: Colors.gray500 },
              ]}
            >
              {opt}
            </AppText>
          </TouchableOpacity>
        );
      })}

      <View style={rfStyles.footerNote}>
        <Ionicons
          name="information-circle-outline"
          size={13}
          color={Colors.gray400}
        />
        <AppText style={rfStyles.footerNoteText}>
          This is a self-reported screening. Results may vary with screen
          brightness and ambient lighting.
        </AppText>
      </View>
    </ScrollView>
  );
};

// ─── Booking Modal ────────────────────────────────────────────────────────────

const BookingModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const canConfirm = branchId && date && timeSlot;
  const branch = BRANCHES.find(b => b.id === branchId);

  const handleClose = () => {
    setBranchId(null);
    setDate(null);
    setTimeSlot(null);
    setConfirmed(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={bkStyles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      <View style={bkStyles.sheet}>
        {/* Handle */}
        <View style={bkStyles.handle} />

        {/* Header */}
        <View style={bkStyles.header}>
          <AppText style={bkStyles.headerTitle}>
            {confirmed ? 'Booking Summary' : 'Book Appointment'}
          </AppText>
          <TouchableOpacity
            onPress={handleClose}
            style={bkStyles.closeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={Colors.gray600} />
          </TouchableOpacity>
        </View>

        {confirmed && branch && date && timeSlot ? (
          /* ── Confirmed state ── */
          <ScrollView
            contentContainerStyle={bkStyles.sheetScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={bkStyles.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#2DBD7E" />
            </View>
            <AppText style={bkStyles.successTitle}>
              Appointment Requested
            </AppText>
            <AppText style={bkStyles.successSub}>
              Call the store to confirm your slot. Our team will be happy to
              assist you.
            </AppText>

            <View style={bkStyles.summaryCard}>
              {[
                { icon: 'location-outline', text: branch.name },
                { icon: 'map-outline', text: branch.address },
                {
                  icon: 'calendar-outline',
                  text: `${DAY_SHORT[date.getDay()]}, ${date.getDate()} ${
                    MONTH_SHORT[date.getMonth()]
                  }`,
                },
                { icon: 'time-outline', text: timeSlot },
              ].map(row => (
                <View key={row.icon} style={bkStyles.summaryRow}>
                  <Ionicons
                    name={row.icon as any}
                    size={16}
                    color={Colors.primary}
                  />
                  <AppText style={bkStyles.summaryText}>{row.text}</AppText>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => Linking.openURL('tel:+212')}
              activeOpacity={0.82}
            >
              <Ionicons name="call-outline" size={18} color={Colors.white} />
              <AppText style={styles.primaryBtnText}>Call to Confirm</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <AppText style={styles.outlineBtnText}>Done</AppText>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* ── Selection form ── */
          <>
            <ScrollView
              contentContainerStyle={bkStyles.sheetScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Branch */}
              <AppText style={bkStyles.sectionTitle}>Select Branch</AppText>
              {BRANCHES.map(b => {
                const selected = branchId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      bkStyles.branchCard,
                      selected && bkStyles.branchCardActive,
                    ]}
                    onPress={() => setBranchId(b.id)}
                    activeOpacity={0.8}
                  >
                    <View style={bkStyles.branchIcon}>
                      <Ionicons
                        name="storefront-outline"
                        size={18}
                        color={selected ? Colors.primary : Colors.gray400}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText
                        style={[
                          bkStyles.branchName,
                          selected && { color: Colors.primary },
                        ]}
                      >
                        {b.name}
                      </AppText>
                      <AppText style={bkStyles.branchAddress}>
                        {b.address}
                      </AppText>
                    </View>
                    <View
                      style={[bkStyles.radio, selected && bkStyles.radioActive]}
                    >
                      {selected && <View style={bkStyles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Date */}
              <AppText
                style={[bkStyles.sectionTitle, { marginTop: Spacing.lg }]}
              >
                Select Date
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.sm, paddingBottom: 4 }}
              >
                {AVAILABLE_DAYS.map(d => {
                  const selected = date?.toDateString() === d.toDateString();
                  return (
                    <TouchableOpacity
                      key={d.toISOString()}
                      style={[
                        bkStyles.dateChip,
                        selected && bkStyles.dateChipActive,
                      ]}
                      onPress={() => setDate(d)}
                      activeOpacity={0.8}
                    >
                      <AppText
                        style={[
                          bkStyles.dateDay,
                          selected && bkStyles.dateTextActive,
                        ]}
                      >
                        {DAY_SHORT[d.getDay()]}
                      </AppText>
                      <AppText
                        style={[
                          bkStyles.dateNum,
                          selected && bkStyles.dateTextActive,
                        ]}
                      >
                        {d.getDate()}
                      </AppText>
                      <AppText
                        style={[
                          bkStyles.dateMon,
                          selected && bkStyles.dateTextActive,
                        ]}
                      >
                        {MONTH_SHORT[d.getMonth()]}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Time */}
              <AppText
                style={[bkStyles.sectionTitle, { marginTop: Spacing.lg }]}
              >
                Select Time
              </AppText>
              <View style={bkStyles.timeGrid}>
                {TIME_SLOTS.map(slot => {
                  const selected = timeSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        bkStyles.timeChip,
                        selected && bkStyles.timeChipActive,
                      ]}
                      onPress={() => setTimeSlot(slot)}
                      activeOpacity={0.8}
                    >
                      <AppText
                        style={[
                          bkStyles.timeText,
                          selected && bkStyles.timeTextActive,
                        ]}
                      >
                        {slot}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Sticky confirm */}
            <View style={bkStyles.footer}>
              <TouchableOpacity
                style={[styles.primaryBtn, !canConfirm && bkStyles.btnDisabled]}
                onPress={() => canConfirm && setConfirmed(true)}
                activeOpacity={canConfirm ? 0.82 : 1}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={Colors.white}
                />
                <AppText style={styles.primaryBtnText}>
                  Confirm Appointment
                </AppText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

// ─── Refraction — Result ──────────────────────────────────────────────────────

const RefractionResult: React.FC<{
  risk: RiskLevel;
  acuityLeftPass: number;
  acuityRightPass: number;
  astigmatism: 'equal' | 'unequal';
  colorVision: ColorResult;
  onRetry: () => void;
}> = ({
  risk,
  acuityLeftPass,
  acuityRightPass,
  astigmatism,
  colorVision,
  onRetry,
}) => {
  const cfg = RISK_CONFIG[risk];
  const [showBooking, setShowBooking] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const acuityOk = acuityLeftPass >= 4 && acuityRightPass >= 4;
  const colorOk = colorVision === 'normal';
  const astigmatismOk = astigmatism === 'equal';

  const results: { key: string; label: string; ok: boolean; detail: string }[] =
    [
      {
        key: 'acuity',
        label: 'Visual Acuity',
        ok: acuityOk,
        detail: `Left eye: ${
          acuityLeftPass >= 4 ? 'Good' : 'Needs attention'
        }. Right eye: ${acuityRightPass >= 4 ? 'Good' : 'Needs attention'}. ${
          acuityOk
            ? 'Both eyes read the chart clearly.'
            : 'One or both eyes had difficulty reading the smaller lines.'
        }`,
      },
      {
        key: 'color',
        label: 'Colour Vision',
        ok: colorOk,
        detail:
          colorVision === 'normal'
            ? 'Normal colour discrimination.'
            : colorVision === 'mild'
            ? 'Possible mild colour vision deficiency.'
            : 'Signs of colour vision deficiency detected.',
      },
      {
        key: 'astigmatism',
        label: 'Astigmatism',
        ok: astigmatismOk,
        detail: astigmatismOk
          ? 'All lines appeared equally dark and clear — no irregularity detected.'
          : 'Some lines appeared darker or thicker than others.',
      },
    ];

  return (
    <ScrollView
      contentContainerStyle={[styles.contentPad, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Risk badge */}
      <View
        style={[
          rfStyles.riskCard,
          { backgroundColor: cfg.bg, borderColor: cfg.color + '40' },
        ]}
      >
        <Ionicons name={cfg.icon as any} size={48} color={cfg.color} />
        <AppText style={[rfStyles.riskLabel, { color: cfg.color }]}>
          {cfg.label}
        </AppText>
        <AppText style={rfStyles.riskSummary}>{cfg.summary}</AppText>
      </View>

      {/* Recommendation */}
      <View style={[rfStyles.adviceCard, { borderLeftColor: cfg.color }]}>
        <AppText style={rfStyles.adviceTitle}>Our Recommendation</AppText>
        <AppText style={rfStyles.adviceText}>{cfg.advice}</AppText>
      </View>

      {/* Specialist referral card */}
      <View style={rfStyles.specialistCard}>
        <AppText style={rfStyles.specialistText}>
          If you have an eye condition and need to see a specialist, please
          submit a request below. A referral is necessary for a specialist
          appointment, which you can obtain from your General Practitioner or
          Optometrist.
        </AppText>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setShowBooking(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.white} />
          <AppText style={styles.primaryBtnText}>
            Request for specialist appointment
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Per-test accordion */}
      <View style={rfStyles.accordionCard}>
        {results.map((r, idx) => {
          const isOpen = expanded === r.key;
          return (
            <View
              key={r.key}
              style={[
                rfStyles.accordionRow,
                idx > 0 && rfStyles.accordionRowBorder,
              ]}
            >
              <TouchableOpacity
                style={rfStyles.accordionHeader}
                onPress={() => setExpanded(isOpen ? null : r.key)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    rfStyles.faceCircle,
                    {
                      backgroundColor: r.ok
                        ? 'rgba(45,189,126,0.14)'
                        : 'rgba(244,168,48,0.16)',
                    },
                  ]}
                >
                  <Ionicons
                    name={r.ok ? 'happy' : 'sad'}
                    size={24}
                    color={r.ok ? '#2DBD7E' : '#F4A830'}
                  />
                </View>
                <AppText style={rfStyles.accordionLabel}>{r.label}</AppText>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={Colors.gray600}
                />
              </TouchableOpacity>
              {isOpen && (
                <AppText style={rfStyles.accordionDetail}>{r.detail}</AppText>
              )}
            </View>
          );
        })}
      </View>

      <BookingModal
        visible={showBooking}
        onClose={() => setShowBooking(false)}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: Spacing.lg }]}
        onPress={onRetry}
        activeOpacity={0.82}
      >
        <Ionicons name="refresh-outline" size={18} color={Colors.white} />
        <AppText style={styles.primaryBtnText}>Re-do Test</AppText>
      </TouchableOpacity>

      <View style={rfStyles.footerNote}>
        <Ionicons
          name="information-circle-outline"
          size={13}
          color={Colors.gray400}
        />
        <AppText style={rfStyles.footerNoteText}>
          Results are indicative only. A full clinical eye examination by a
          licensed optometrist is required for a prescription.
        </AppText>
      </View>
    </ScrollView>
  );
};

// ─── Refraction Flow ──────────────────────────────────────────────────────────

const RefractionFlow: React.FC = () => {
  const [stage, setStage] = useState<RefractionStage>('intro');
  const [acuityLeftPass, setAcuityLeftPass] = useState(0);
  const [acuityRightPass, setAcuityRightPass] = useState(0);
  const [astigmatismLeft, setAstigmatismLeft] = useState<'equal' | 'unequal'>(
    'equal',
  );
  const [astigmatismRight, setAstigmatismRight] = useState<'equal' | 'unequal'>(
    'equal',
  );
  const [colorVision, setColorVision] = useState<ColorResult>('normal');

  // Worst-eye result carries the risk score, same approach as acuity.
  const astigmatism: 'equal' | 'unequal' =
    astigmatismLeft === 'unequal' || astigmatismRight === 'unequal'
      ? 'unequal'
      : 'equal';

  // Fresh randomised content per run; `runId` bumps on retry to regenerate it.
  const [runId, setRunId] = useState(0);
  const testSet = useMemo(
    () => ({
      acuityRowsLeft: genAcuityRows(),
      acuityRowsRight: genAcuityRows(),
      cvPlates: genCvPlates(5),
    }),
    [runId],
  );

  const handleAcuityLeftDone = (passCount: number) => {
    setAcuityLeftPass(passCount);
    setStage('acuityRightReady');
  };

  const handleAcuityRightDone = (passCount: number) => {
    setAcuityRightPass(passCount);
    setStage('colorVision');
  };

  const handleColorVisionDone = (result: ColorResult) => {
    setColorVision(result);
    setStage('astigmatismLeftReady');
  };

  const handleAstigmatismLeftDone = (result: 'equal' | 'unequal') => {
    setAstigmatismLeft(result);
    setStage('astigmatismRightReady');
  };

  const handleAstigmatismRightDone = (result: 'equal' | 'unequal') => {
    setAstigmatismRight(result);
    setStage('result');
  };

  const handleRetry = () => {
    setAcuityLeftPass(0);
    setAcuityRightPass(0);
    setAstigmatismLeft('equal');
    setAstigmatismRight('equal');
    setColorVision('normal');
    setRunId(prev => prev + 1); // regenerate randomised test content
    setStage('intro');
  };

  if (stage === 'intro')
    return <RefractionIntro onStart={() => setStage('acuityLeftReady')} />;
  if (stage === 'acuityLeftReady')
    return (
      <EyeCoverStep
        eye="left"
        stepNum="1a"
        testName="Visual Acuity"
        onContinue={() => setStage('acuityLeft')}
      />
    );
  if (stage === 'acuityLeft')
    return (
      <AcuityStep
        eye="left"
        rows={testSet.acuityRowsLeft}
        onComplete={handleAcuityLeftDone}
      />
    );
  if (stage === 'acuityRightReady')
    return (
      <EyeCoverStep
        eye="right"
        stepNum="1b"
        testName="Visual Acuity"
        onContinue={() => setStage('acuityRight')}
      />
    );
  if (stage === 'acuityRight')
    return (
      <AcuityStep
        eye="right"
        rows={testSet.acuityRowsRight}
        onComplete={handleAcuityRightDone}
      />
    );
  if (stage === 'colorVision')
    return (
      <ColorVisionStep
        plates={testSet.cvPlates}
        onComplete={handleColorVisionDone}
      />
    );
  if (stage === 'astigmatismLeftReady')
    return (
      <EyeCoverStep
        eye="left"
        stepNum="3a"
        testName="Astigmatism Check"
        onContinue={() => setStage('astigmatismLeft')}
      />
    );
  if (stage === 'astigmatismLeft')
    return (
      <AstigmatismStep eye="left" onComplete={handleAstigmatismLeftDone} />
    );
  if (stage === 'astigmatismRightReady')
    return (
      <EyeCoverStep
        eye="right"
        stepNum="3b"
        testName="Astigmatism Check"
        onContinue={() => setStage('astigmatismRight')}
      />
    );
  if (stage === 'astigmatismRight')
    return (
      <AstigmatismStep eye="right" onComplete={handleAstigmatismRightDone} />
    );

  return (
    <RefractionResult
      risk={computeRisk(
        Math.min(acuityLeftPass, acuityRightPass),
        astigmatism,
        colorVision,
      )}
      acuityLeftPass={acuityLeftPass}
      acuityRightPass={acuityRightPass}
      astigmatism={astigmatism}
      colorVision={colorVision}
      onRetry={handleRetry}
    />
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const ScanScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('face');
  const [faceScanStage, setFaceScanStage] = useState<FaceScanStage>('idle');
  const [faceShape, setFaceShape] = useState<FaceShape | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<FaceMetrics | null>(null);
  const [debug, setDebug] = useState<FaceDebug | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const isScanning =
    tab === 'face' &&
    (faceScanStage === 'scanning' || faceScanStage === 'countdown');

  // Hide the bottom tab bar while the countdown/camera is full-screen.
  useEffect(() => {
    navigation.setParams({ hideTabBar: isScanning });
  }, [isScanning, navigation]);

  // Ask for camera permission once. Android: the OS remembers the grant, so
  // repeat scans skip the prompt. iOS: WKWebView reuses the app-level grant
  // (NSCameraUsageDescription) via mediaCapturePermissionGrantType="grant".
  const startFaceScan = useCallback(async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        // Denied — fall back to manual face-shape selection.
        setFaceScanStage('selecting');
        return;
      }
    }
    setFaceScanStage('countdown');
  }, []);

  const handleShapeDetected = (
    shape: FaceShape,
    conf: number,
    m: FaceMetrics | null,
    dbg: FaceDebug | null,
  ) => {
    setFaceShape(shape);
    setConfidence(conf);
    setMetrics(m);
    setDebug(dbg);
    // Brief pause so the user sees "Scan complete!" in the camera view,
    // then transition: close camera, open bottom sheet.
    setTimeout(() => {
      setFaceScanStage('idle');
      setSheetVisible(true);
    }, 600);
  };

  const handleSheetClose = () => {
    setSheetVisible(false);
    setFaceShape(null);
    setConfidence(null);
    setMetrics(null);
    setFaceScanStage('idle');
  };

  return (
    <View style={[styles.root, { paddingTop: isScanning ? 0 : insets.top }]}>
      {!isScanning && (
        <TabBar
          active={tab}
          onChange={t => {
            setTab(t);
          }}
        />
      )}

      {tab === 'face' ? (
        <>
          {/* Idle — always shown unless camera is active or manual selector is open */}
          {faceScanStage === 'idle' && <FaceScanIdle onStart={startFaceScan} />}

          {/* Camera mounts during the countdown so it's already warmed up;
              the countdown overlay then fades away to reveal the live feed. */}
          {(faceScanStage === 'countdown' || faceScanStage === 'scanning') && (
            <View style={StyleSheet.absoluteFillObject}>
              <FaceScanCamera
                armed={faceScanStage === 'scanning'}
                onShapeDetected={handleShapeDetected}
                onCameraError={() => setFaceScanStage('selecting')}
                onCancel={() => setFaceScanStage('idle')}
              />
              {faceScanStage === 'countdown' && (
                <ScanCountdown
                  onComplete={() => setFaceScanStage('scanning')}
                />
              )}
            </View>
          )}

          {/* Manual fallback when camera is unavailable */}
          {faceScanStage === 'selecting' && (
            <FaceShapeSelector
              onSelect={shape => {
                setFaceShape(shape);
                setConfidence(null);
                setMetrics(null);
                setFaceScanStage('idle');
                setSheetVisible(true);
              }}
              onCancel={() => setFaceScanStage('idle')}
            />
          )}

          {/* Glasses recommendation bottom sheet */}
          {faceShape && (
            <GlassesBottomSheet
              visible={sheetVisible}
              shape={faceShape}
              confidence={confidence}
              metrics={metrics}
              debug={debug}
              onClose={handleSheetClose}
            />
          )}
        </>
      ) : (
        <RefractionFlow />
      )}
    </View>
  );
};

// ─── Product Recommendation Styles ────────────────────────────────────────────

const prStyles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.sm,
    ...Shadow.sm,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.black,
  },
  brand: {
    fontSize: 11,
    color: Colors.gray400,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  reason: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.gray600,
  },
  price: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
  },
});

// ─── Glasses Bottom Sheet Styles ──────────────────────────────────────────────

const gsStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.88,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xxl,
  },

  // ── Hero: face shape + confidence ──
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    padding: Spacing.md,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroShape: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.6,
    marginTop: 1,
  },
  heroConf: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 62,
  },
  heroConfPct: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.success,
    letterSpacing: -0.4,
  },
  heroConfLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 20,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingHorizontal: 2,
  },

  // ── Section heading ──
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionH: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.4,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: Spacing.md,
  },

  // ── Recommendation cards (the focal point) ──
  recList: { gap: Spacing.sm + 2, marginBottom: Spacing.md },
  recCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  recCardBest: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: Colors.primaryLight,
  },
  bestTag: {
    position: 'absolute',
    top: -9,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  bestTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.6,
  },
  recCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  recIcon: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recIconBest: {
    backgroundColor: Colors.primary,
  },
  recName: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  recReason: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
    lineHeight: 16,
  },
  recCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  recCtaText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },

  // ── Styling tip ──
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.gray700,
    lineHeight: 17,
    fontWeight: '600',
  },

  // ── Measurements toggle (secondary) ──
  measureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: Spacing.md,
  },
  measureToggleText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray700,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: Spacing.lg,
  },
  footerNoteText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.gray600,
    lineHeight: 17,
  },

  // ── Face Shape Analysis card ──
  analysisCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  confPill: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  confPillText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  confPct: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  analysisLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.xs,
  },
  barRow: { gap: 5 },
  barTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: { fontSize: FontSize.sm, color: Colors.gray700, fontWeight: '600' },
  barPct: { fontSize: FontSize.sm, fontWeight: '800' },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray200,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.sm + 2,
  },
  tileLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
    marginBottom: 4,
  },
  tileValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  detCard: {
    backgroundColor: 'rgba(45,189,126,0.10)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(45,189,126,0.25)',
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  detLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 2,
  },
  detValue: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.success,
    letterSpacing: -1,
  },
  detHint: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    lineHeight: 16,
    marginTop: 2,
  },
  // TEMPORARY — calibration panel. Remove with the FaceDebug plumbing.
  dbgCard: {
    backgroundColor: 'rgba(244,168,48,0.10)',
    borderColor: 'rgba(244,168,48,0.45)',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  dbgTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#B87A10',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  dbgRow: {
    fontSize: FontSize.xs,
    color: Colors.gray700,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
});

// ─── Shape Selector Styles ────────────────────────────────────────────────────

const scanStyles = StyleSheet.create({
  shapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  shapeIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shapeName: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 3,
  },
  shapeDesc: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    lineHeight: 16,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  tabBtnActive: {
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  tabLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray400,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Shared layout
  contentPad: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Hero card
  heroCard: {
    alignItems: 'center',
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  heroIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: FontSize.md,
    color: Colors.gray700,
    textAlign: 'center',
    lineHeight: 23,
  },
  overlineLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  shapeName: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1,
    marginBottom: 8,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNum: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  stepText: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    flex: 1,
    lineHeight: 20,
    paddingTop: 4,
  },

  // Feature rows (refraction intro)
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  featureIconBox: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray700,
    lineHeight: 19,
  },

  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 19,
  },

  // Acuity / step shared
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepCounter: {
    fontSize: FontSize.sm,
    color: Colors.gray700,
    fontWeight: '700',
  },
  stepCounterRight: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    backgroundColor: Colors.glassBorder,
    borderRadius: 5,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  acuityCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.glassBorderStrong,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  acuityInstruction: {
    fontSize: FontSize.md,
    color: Colors.gray700,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  acuityLetterBox: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  acuityLabel: {
    marginTop: 8,
    fontSize: FontSize.xs,
    color: Colors.gray600,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  acuityQuestion: {
    fontSize: FontSize.lg,
    color: Colors.black,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 24,
  },

  // Frames grid
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.gray600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  framesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  frameCard: {
    width: '47%',
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 8,
    ...Shadow.sm,
  },
  frameIconBox: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.black },

  // Begin test card
  beginCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.md,
  },
  beginCardTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.2,
  },
  beginCardSub: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },

  // Buttons — sized for easy one-thumb tapping (min ~58px tall)
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 58,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    ...Shadow.md,
  },
  primaryBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primaryGlow,
    backgroundColor: Colors.primaryLight,
  },
  outlineBtnText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
  },

  // Face scan — scanning
  cancelArea: { position: 'absolute', top: 0, left: 0, right: 0 },
  cancelBtn: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(12,16,20,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Refraction-specific Styles ───────────────────────────────────────────────

const rfStyles = StyleSheet.create({
  // Astigmatism wheel
  wheelContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  wheelSpoke: {
    position: 'absolute',
    width: 1.5,
    height: 220,
    backgroundColor: Colors.black,
  },
  wheelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    position: 'absolute',
  },

  // Direction compass (Landolt C acuity test) — sized for 16 buttons
  compassContainer: {
    width: 284,
    height: 284,
    alignSelf: 'center',
    marginVertical: Spacing.lg,
  },
  compassBtn: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.glassBorderStrong,
    ...Shadow.sm,
  },
  compassBtnCorrect: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  compassBtnWrong: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },

  // Countdown bar — shared by timed steps
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  timerTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.glassBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  timerFillDanger: {
    backgroundColor: Colors.error,
  },
  timerText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.gray500,
    minWidth: 24,
    textAlign: 'right',
  },
  timerTextDanger: {
    color: Colors.error,
  },

  // One-hand usage banner (intro)
  oneHandBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primaryGlow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    alignSelf: 'stretch',
  },
  oneHandBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: '700',
    lineHeight: 19,
  },

  // Cover-eye reminder banner (per test step)
  coverEyeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primaryGlow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  coverEyeBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray700,
    fontWeight: '600',
    lineHeight: 20,
  },
  coverEyeBold: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.primaryDark,
    textTransform: 'capitalize',
  },

  // Answer buttons — colour-coded so a Yes/No choice reads at a glance
  answerYesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
    ...Shadow.md,
  },
  answerYesBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  answerNoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
    marginTop: Spacing.sm,
  },
  answerNoBtnText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.error,
    textAlign: 'center',
  },

  // Result — specialist referral card
  specialistCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.glassBorderStrong,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  specialistText: {
    fontSize: FontSize.md,
    color: Colors.gray700,
    lineHeight: 22,
  },

  // Result — accordion list
  accordionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  accordionRow: {
    paddingHorizontal: Spacing.md,
  },
  accordionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md + 2,
    minHeight: 64,
  },
  faceCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accordionLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  accordionDetail: {
    fontSize: FontSize.sm,
    color: Colors.gray700,
    lineHeight: 20,
    paddingBottom: Spacing.md,
    paddingLeft: 44 + Spacing.md,
  },

  // Risk card (result)
  riskCard: {
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  riskLabel: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: Spacing.xs,
  },
  riskSummary: {
    fontSize: FontSize.md,
    color: Colors.gray700,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Advice card
  adviceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    borderLeftWidth: 5,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  adviceTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 6,
  },
  adviceText: {
    fontSize: FontSize.md,
    color: Colors.gray700,
    lineHeight: 22,
  },

  // Ishihara plate
  plateContainer: {
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: 'hidden',
    alignSelf: 'center',
    marginVertical: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
  },
  plateWebView: {
    width: 260,
    height: 260,
    backgroundColor: 'transparent',
  },

  // Footer note
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: Spacing.lg,
  },
  footerNoteText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.gray600,
    lineHeight: 17,
  },
});

// ─── Booking Modal Styles ─────────────────────────────────────────────────────

const bkStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '88%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  // Section label
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },

  // Branch cards
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  branchCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  branchIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  branchName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 2,
  },
  branchAddress: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  // Date chips
  dateChip: {
    width: 56,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassSurface,
    gap: 2,
  },
  dateChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  dateDay: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.gray400,
    textTransform: 'uppercase',
  },
  dateNum: { fontSize: 18, fontWeight: '800', color: Colors.black },
  dateMon: { fontSize: 10, fontWeight: '500', color: Colors.gray500 },
  dateTextActive: { color: Colors.white },

  // Time chips
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassSurface,
  },
  timeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  timeText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
  timeTextActive: { color: Colors.white, fontWeight: '700' },

  // Disabled button
  btnDisabled: { opacity: 0.4 },

  // Sticky footer
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.white,
  },

  // Confirmed state
  successIcon: {
    alignSelf: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.black,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: Spacing.xs,
  },
  successSub: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.black,
    fontWeight: '500',
  },
});

export default ScanScreen;
