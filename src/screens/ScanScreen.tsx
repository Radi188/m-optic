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
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import EyeTestDisclaimerModal from '../components/ui/Modal/EyeTestDisclaimerModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import Svg, { Path, Circle, G } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import { useProductList } from '../hook/useProductList';
import FrameShapeIcon from '../components/ui/Frame/FrameShapeIcon';
import { fetchBranches } from '../services/branchService';
import type { StoreLocation } from '../services/branchService';
import type { Product } from '../types/glasses';
import AppText from '../components/AppText';
import AppImage from '../components/AppImage';
import { useAllowScreenCapture } from '../hook/useAllowScreenCapture';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'face' | 'refraction';
type FaceScanStage = 'idle' | 'countdown' | 'scanning' | 'selecting';
type RefractionStage =
  | 'intro'
  | 'acuityIntro'
  | 'acuityLeftReady'
  | 'acuityLeft'
  | 'acuityRightReady'
  | 'acuityRight'
  | 'colorIntro'
  | 'colorVision'
  | 'astigmatismIntro'
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
  raw: {
    aspect: number;
    fVc: number;
    jVc: number;
    chinTaper: number;
    jawDeg: number;
  } | null;
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
    frames: ['Soft-Square', 'Narrow-Rectangle', 'Aviator', 'Browline'],
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
    frames: ['Narrow-Rectangle', 'Soft-Square', 'Aviator', 'Rimless'],
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
// 8 directions around the clock, spaced 45° apart, 0 = gap pointing up. The
// coarser step keeps the choice unambiguous on a phone-sized target.
const LANDOLT_ANGLES = Array.from({ length: 8 }, (_, i) => i * 45);
const LANDOLT_LABELS = [
  'Up',
  'Up-right',
  'Right',
  'Down-right',
  'Down',
  'Down-left',
  'Left',
  'Up-left',
];
const LANDOLT_DIRECTIONS: { angle: number; label: string }[] =
  LANDOLT_ANGLES.map((angle, i) => ({ angle, label: LANDOLT_LABELS[i] }));

// The size ladder, biggest first. A correct read steps one rung down (smaller),
// a miss steps one rung back up (bigger), clamped at both ends — so a wrong
// answer never ends the test, it just makes the next ring easier to read.
//
// Every rung is smaller than it used to be, and two intermediate Snellen lines
// (20/125, 20/25) were added so the staircase has somewhere to go across the
// longer run. Labels keep their old meaning — only the pixel sizes moved.
//
// Sizes bottom out at 7dp: the gap is a fifth of the ring, so 7dp puts it at
// 1.5dp — three physical pixels on a 2x screen. Below that the gap is thinner
// than the ring's own anti-aliasing and the answer becomes a coin flip rather
// than a vision test.
const ACUITY_LADDER = [
  { size: 38, label: '20/200' },
  { size: 31, label: '20/125' },
  { size: 26, label: '20/100' },
  { size: 22, label: '20/70' },
  { size: 18, label: '20/50' },
  { size: 15, label: '20/40' },
  { size: 13, label: '20/30' },
  { size: 11, label: '20/25' },
  { size: 10, label: '20/20' },
  { size: 9, label: '20/15' },
  { size: 8, label: '20/13' },
  { size: 7, label: '20/10' },
];
// Starts on the same 20/30 line as before, now 13dp rather than 16dp. Six
// rungs above it absorb early misses. Five sit below, so a flawless run reaches
// the smallest ring with trials to spare and simply holds there — which is
// exactly what "reads the 20/10 line" means.
const ACUITY_START_LEVEL = 6; // 20/30 — 13dp
// Every eye gets exactly this many rings, right or wrong.
const ACUITY_TRIALS = 8;
// Correct reads needed for an eye to count as passing, and the level at or
// below which an eye counts as struggling. Derived from ACUITY_TRIALS so the
// bar moves with the trial count instead of drifting out of date.
const ACUITY_PASS_MARK = Math.ceil(ACUITY_TRIALS * 0.75); // 6 of 8
const ACUITY_POOR_MARK = Math.floor(ACUITY_TRIALS * 0.4); // 3 of 8

// Only the gap direction is pre-rolled; the size comes from wherever the
// staircase has walked to by that trial.
//
// A direction never repeats back to back. Over a run this long a repeat is more
// likely than not, and "same as last time" is a guess that pays off without
// seeing anything — which is the one thing the test must not reward.
const genAcuityAngles = (): number[] => {
  const out: number[] = [];
  for (let i = 0; i < ACUITY_TRIALS; i++) {
    let angle = LANDOLT_ANGLES[randInt(LANDOLT_ANGLES.length)];
    while (i > 0 && angle === out[i - 1]) {
      angle = LANDOLT_ANGLES[randInt(LANDOLT_ANGLES.length)];
    }
    out.push(angle);
  }
  return out;
};

function computeRisk(
  acuityPassCount: number,
  astigmatism: 'equal' | 'unequal',
  colorVision: ColorResult,
): RiskLevel {
  // Correct reads out of ACUITY_TRIALS — every eye always attempts all of
  // them, so this is a straight hit count on a self-adjusting size ladder.
  let score = 0;
  if (acuityPassCount === 0) score += 4;
  else if (acuityPassCount <= ACUITY_POOR_MARK) score += 2;
  else if (acuityPassCount < ACUITY_TRIALS) score += 1;
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

// Branches come from GET /api/v1/branches (see services/branchService), the
// same source the store map uses — the shop edits them there. They used to be
// three hardcoded Casablanca addresses, which are not our stores.

// Appointment slots are generated from the selected branch's own opening hours.
const SLOT_MINUTES = 30;
// Only used when a branch has no hours set in the API, so the picker still has
// something to offer instead of going blank.
const FALLBACK_OPEN = '09:00';
const FALLBACK_CLOSE = '17:00';

const toMinutes = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
};

const fmtMinutes = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(
    mins % 60,
  ).padStart(2, '0')}`;

/**
 * Half-hour slots inside the branch's opening window. The last slot starts one
 * slot before closing, so a booking never lands after the shop shuts. When the
 * chosen day is today, slots that have already passed are dropped.
 */
const slotsFor = (
  branch: StoreLocation | undefined,
  day: Date | null,
): string[] => {
  const open = toMinutes(branch?.openTime || FALLBACK_OPEN);
  const close = toMinutes(branch?.closeTime || FALLBACK_CLOSE);
  if (open === null || close === null || close <= open) return [];

  const now = new Date();
  const isToday = !!day && day.toDateString() === now.toDateString();
  const cutoff = now.getHours() * 60 + now.getMinutes();

  const out: string[] = [];
  for (let t = open; t + SLOT_MINUTES <= close; t += SLOT_MINUTES) {
    if (isToday && t <= cutoff) continue;
    out.push(fmtMinutes(t));
  }
  return out;
};

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
#video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
/* Only the front camera is mirrored — the back camera shows the scene as-is. */
#video.mirrored{transform:scaleX(-1)}

/* Skin-smoothing (soft focus). A blurred copy of the preview is laid back over
   the sharp one at partial opacity — the classic soft-focus portrait trick, so
   skin texture and blemishes soften while the eyes stay readable.
   backdrop-filter gets the blurred copy for free on the GPU, with no second
   <video> to decode; where it is unsupported the layer is simply invisible and
   the preview stays sharp.
   The layer covers only the tracked face: it keeps this fixed size and is moved
   and scaled onto the face box every frame with a transform (compositor-only,
   so it stays cheap), and a feathered elliptical mask keeps the effect from
   ending on a visible edge. Everything else in shot — the room, hands, anyone
   standing behind — is left exactly as the camera saw it.
   Detection is untouched: MediaPipe reads frames straight off the <video>
   element, which no CSS filter can reach, so the measurements come from the
   raw image either way. */
#softLayer{
  position:absolute;left:0;top:0;width:200px;height:260px;transform-origin:0 0;
  z-index:1;pointer-events:none;opacity:0;transition:opacity .25s ease;
  -webkit-backdrop-filter:blur(6px) brightness(1.04) saturate(1.06);
  backdrop-filter:blur(6px) brightness(1.04) saturate(1.06);
  -webkit-mask-image:radial-gradient(ellipse closest-side at 50% 50%,#000 55%,rgba(0,0,0,0.55) 78%,transparent 100%);
  mask-image:radial-gradient(ellipse closest-side at 50% 50%,#000 55%,rgba(0,0,0,0.55) 78%,transparent 100%);
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat
}
body.smooth #softLayer.on{opacity:.5}
#snapCanvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;z-index:2}
#overlay{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}

/* Top HUD chip — sits below the notch / status bar */
.topbar{position:absolute;top:max(30px,calc(env(safe-area-inset-top) + 16px));left:0;right:0;display:flex;justify-content:center;z-index:8}
.topchip{display:flex;align-items:center;gap:9px;padding:9px 18px;border-radius:100px;background:rgba(12,16,20,0.5);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);border:1px solid rgba(95,233,255,0.22);box-shadow:0 6px 22px rgba(0,0,0,0.28)}
.topchip .pulse{width:7px;height:7px;border-radius:50%;background:#5FE9FF;box-shadow:0 0 10px #5FE9FF;animation:blink 1.4s ease-in-out infinite}
.topchip span{color:rgba(255,255,255,0.96);font-size:11px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

/* Camera flip — lets one person hold the phone and scan someone else's face
   with the (usually higher quality) back camera. */
#flipBtn{
  position:absolute;top:max(30px,calc(env(safe-area-inset-top) + 16px));right:18px;z-index:9;
  pointer-events:auto;width:42px;height:42px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:rgba(12,16,20,0.5);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);
  border:1px solid rgba(95,233,255,0.22);box-shadow:0 6px 22px rgba(0,0,0,0.28);
  transition:transform .3s ease,opacity .25s ease
}
#flipBtn svg{width:20px;height:20px;fill:none;stroke:rgba(255,255,255,0.92);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#flipBtn.busy{opacity:.5}
#flipBtn.spin{transform:rotate(180deg)}
#overlay.analyzing #flipBtn,#overlay.analyzing #smoothBtn{opacity:0;pointer-events:none}

/* Smoothing toggle — same chip as the flip button, sitting to its left. */
#smoothBtn{
  position:absolute;top:max(30px,calc(env(safe-area-inset-top) + 16px));right:70px;z-index:9;
  pointer-events:auto;width:42px;height:42px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:rgba(12,16,20,0.5);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);
  border:1px solid rgba(95,233,255,0.22);box-shadow:0 6px 22px rgba(0,0,0,0.28);
  transition:opacity .25s ease,border-color .25s ease
}
#smoothBtn svg{width:19px;height:19px;fill:rgba(255,255,255,0.94);stroke:none}
#smoothBtn.off{border-color:rgba(255,255,255,0.14)}
#smoothBtn.off svg{fill:rgba(255,255,255,0.42)}

/* Corner HUD readouts — clearly below the chip */
.hud{position:absolute;z-index:7;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:9.5px;letter-spacing:1.4px;color:rgba(95,233,255,0.72);text-transform:uppercase;text-shadow:0 0 8px rgba(95,233,255,0.35)}
.hud.searching{color:rgba(244,168,48,0.85);text-shadow:0 0 8px rgba(244,168,48,0.35)}
.hud-tl{top:max(90px,calc(env(safe-area-inset-top) + 74px));left:22px}
.hud-tr{top:max(90px,calc(env(safe-area-inset-top) + 74px));right:22px;text-align:right}
.hud-bl{bottom:max(150px,calc(env(safe-area-inset-bottom) + 150px));left:22px}
.hud-br{bottom:max(150px,calc(env(safe-area-inset-bottom) + 150px));right:22px;text-align:right}

/* Larger rounded-square frame — easier to fill while holding the phone */
.oval-wrap{position:relative;width:min(94vw,420px,54vh);height:min(94vw,420px,54vh)}

/* Mesh + scan-beam layer, clipped to the frame */
.oval-clip{position:absolute;inset:0;border-radius:40px;overflow:hidden;z-index:1}
.mesh{position:absolute;inset:0;background-image:linear-gradient(rgba(95,233,255,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(95,233,255,0.10) 1px,transparent 1px);background-size:22px 22px;-webkit-mask-image:radial-gradient(closest-side,#000 78%,transparent 100%);mask-image:radial-gradient(closest-side,#000 78%,transparent 100%);animation:meshpulse 3s ease-in-out infinite}
@keyframes meshpulse{0%,100%{opacity:.35}50%{opacity:.72}}
.scanbeam{position:absolute;left:-3%;right:-3%;height:2px;top:8%;border-radius:2px;background:linear-gradient(90deg,transparent,#5FE9FF 20%,#EAFBFF 50%,#5FE9FF 80%,transparent);box-shadow:0 0 16px 4px rgba(95,233,255,0.55);animation:scanmove 2.8s cubic-bezier(.55,0,.45,1) infinite}
.scanbeam::before{content:'';position:absolute;left:0;right:0;top:-64px;height:64px;background:linear-gradient(to top,rgba(95,233,255,0.20),transparent)}
@keyframes scanmove{0%{top:8%;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:90%;opacity:0}}

/* Guide frame — dims everything outside */
.guide-oval{border-radius:40px;position:absolute;inset:0;z-index:2;border:1.5px solid rgba(255,255,255,0.5);box-shadow:0 0 0 2000px rgba(6,10,14,0.66),inset 0 0 22px rgba(95,233,255,0.10);transition:border-color .35s ease,box-shadow .35s ease}
.guide-oval.locked{border-color:rgba(111,227,174,0.9);box-shadow:0 0 0 2000px rgba(6,10,14,0.66),inset 0 0 40px rgba(45,189,126,0.28),0 0 40px rgba(45,189,126,0.5)}
/* Expanding pulse frame on lock */
.guide-oval::after{content:'';position:absolute;inset:-1.5px;border-radius:41px;border:1.5px solid rgba(111,227,174,0.8);opacity:0;pointer-events:none}
.guide-oval.locked::after{animation:pulsering 1.7s ease-out infinite}
@keyframes pulsering{0%{transform:scale(1);opacity:.8}70%{transform:scale(1.13);opacity:0}100%{opacity:0}}

/* HUD corner brackets — reticle framing the square */
.bracket{position:absolute;width:48px;height:48px;z-index:4;border:2.5px solid rgba(95,233,255,0.85);filter:drop-shadow(0 0 6px rgba(95,233,255,0.5));transition:border-color .35s,filter .35s;animation:brfloat 2.4s ease-in-out infinite}
.b-tl{top:-14px;left:-14px;border-right:0;border-bottom:0;border-top-left-radius:24px}
.b-tr{top:-14px;right:-14px;border-left:0;border-bottom:0;border-top-right-radius:24px}
.b-bl{bottom:-14px;left:-14px;border-right:0;border-top:0;border-bottom-left-radius:24px}
.b-br{bottom:-14px;right:-14px;border-left:0;border-top:0;border-bottom-right-radius:24px}
@keyframes brfloat{0%,100%{opacity:.85}50%{opacity:.42}}
#oval.locked ~ .bracket{border-color:rgba(111,227,174,0.95);filter:drop-shadow(0 0 8px rgba(45,189,126,0.6));animation:none;opacity:1}
#oval.locked ~ .oval-clip .scanbeam{background:linear-gradient(90deg,transparent,#6FE3AE 20%,#EAFFF3 50%,#6FE3AE 80%,transparent);box-shadow:0 0 16px 4px rgba(45,189,126,0.55)}

#hint{
  position:relative;z-index:8;
  margin-top:28px;display:inline-flex;align-items:center;
  background:rgba(12,16,20,0.52);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);
  color:#fff;font-size:14px;font-weight:600;
  padding:12px 24px;border-radius:100px;border:1px solid rgba(255,255,255,0.14);
  letter-spacing:0.2px;transition:background .3s,border-color .3s;box-shadow:0 8px 26px rgba(0,0,0,0.30)
}
#hint.success{background:rgba(45,189,126,0.9);border-color:rgba(255,255,255,0.28)}
#hint.warn{background:rgba(244,168,48,0.92);border-color:rgba(255,255,255,0.28)}

/* Capture button */
#captureBtn{
  position:relative;z-index:8;margin-top:20px;pointer-events:auto;
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
#retakeBtn,#rescanBtn{background:rgba(12,16,20,0.55);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);color:#fff}
#analyzeBtn,#continueBtn{background:#6FE3AE;color:#06120c;border-color:transparent;box-shadow:0 8px 22px rgba(111,227,174,0.45)}

/* Result hold — the traced photo and its shape badge stay on screen after the
   reveal finishes, so the user reads the result before the recommendations
   modal takes over. Nothing is posted to RN until Continue is tapped. */
#resultRow{position:relative;z-index:8;margin-top:26px;display:none;flex-direction:column;align-items:center;gap:14px;pointer-events:auto;opacity:0;transition:opacity .35s ease}
#resultRow.show{display:flex}
#resultRow.visible{opacity:1}
#resultBtns{display:flex;gap:14px}

/* Analyzing state — strips the live-scan chrome (HUD readouts, brackets,
   animated mesh/beam, glowing guide frame) so the captured photo is clean and
   only the reveal outline and the result badge remain. */
#overlay.analyzing .hud,
#overlay.analyzing .bracket,
#overlay.analyzing .oval-clip,
#overlay.analyzing .topbar,
#overlay.analyzing #captureHint{opacity:0;transition:opacity .3s ease;pointer-events:none}
#overlay.analyzing .guide-oval{border-color:rgba(255,255,255,0.14);box-shadow:0 0 0 2000px rgba(6,10,14,0.5)}
#overlay.analyzing .guide-oval::after{animation:none;opacity:0}

/* Analysis progress — a thin determinate bar under the hint while the reveal
   animation runs, so the wait reads as measured work rather than a stall. */
#analyzeBar{position:relative;z-index:8;margin-top:20px;width:min(58vw,210px);height:3px;border-radius:3px;background:rgba(255,255,255,0.14);overflow:hidden;display:none;opacity:0;transition:opacity .3s ease}
#overlay.analyzing #analyzeBar{display:block}
#analyzeBar.show{opacity:1}
#analyzeBarFill{height:100%;width:0%;border-radius:3px;background:linear-gradient(90deg,#5FE9FF,#6FE3AE);box-shadow:0 0 12px rgba(111,227,174,0.75);transition:width .12s linear}

/* Shape-detected reveal badge — pops in once the reveal outline lands */
#shapeBadge{
  position:absolute;left:50%;top:11%;z-index:9;pointer-events:none;
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
  position:absolute;z-index:10;top:50%;left:50%;transform:translate(-50%,-50%);
  color:rgba(255,255,255,.78);font-size:14px;text-align:center;line-height:2
}
.spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,.15);border-top-color:#5FE9FF;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 10px}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<video id="video" autoplay playsinline muted></video>
<div id="softLayer"></div>
<canvas id="snapCanvas"></canvas>
<div id="overlay">
  <div class="topbar"><div class="topchip"><span class="pulse"></span><span id="topchipText">Biometric Face Scan</span></div></div>
  <button id="smoothBtn" aria-label="Toggle skin smoothing">
    <svg viewBox="0 0 24 24"><path d="M11 2.5l1.7 4.6 4.6 1.7-4.6 1.7L11 15.1 9.3 10.5 4.7 8.8l4.6-1.7z"/><path d="M18 14l.85 2.35L21.2 17.2l-2.35.85L18 20.4l-.85-2.35-2.35-.85 2.35-.85z"/></svg>
  </button>
  <button id="flipBtn" aria-label="Switch camera">
    <svg viewBox="0 0 24 24"><path d="M3 8.5V7a3 3 0 0 1 3-3h9"/><path d="m12.5 1.5 3 2.5-3 2.5"/><path d="M21 15.5V17a3 3 0 0 1-3 3H9"/><path d="m11.5 22.5-3-2.5 3-2.5"/><circle cx="12" cy="12" r="3.2"/></svg>
  </button>

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
  <div id="analyzeBar"><div id="analyzeBarFill"></div></div>
  <button id="captureBtn" disabled></button>
  <div id="captureHint">Tap to capture</div>
  <div id="reviewRow">
    <button id="retakeBtn" class="reviewBtn">Retake</button>
    <button id="analyzeBtn" class="reviewBtn">Analyze</button>
  </div>
  <div id="resultRow">
    <div id="resultBtns">
      <button id="rescanBtn" class="reviewBtn">Rescan</button>
      <button id="continueBtn" class="reviewBtn">Continue</button>
    </div>
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

var overlay=document.getElementById('overlay');
var oval=document.getElementById('oval'),hint=document.getElementById('hint');
var hudStatus=document.getElementById('hudStatus'),hudCoord=document.getElementById('hudCoord');
var captureBtn=document.getElementById('captureBtn'),captureHint=document.getElementById('captureHint');
var reviewRow=document.getElementById('reviewRow'),retakeBtn=document.getElementById('retakeBtn'),analyzeBtn=document.getElementById('analyzeBtn');
var resultRow=document.getElementById('resultRow'),rescanBtn=document.getElementById('rescanBtn'),continueBtn=document.getElementById('continueBtn');
var snapCanvas=document.getElementById('snapCanvas');
var flipBtn=document.getElementById('flipBtn'),topchipText=document.getElementById('topchipText');
var smoothBtn=document.getElementById('smoothBtn'),softLayer=document.getElementById('softLayer');
var shapeBadge=document.getElementById('shapeBadge'),shapeBadgeText=document.getElementById('shapeBadgeText');
var analyzeBar=document.getElementById('analyzeBar'),analyzeBarFill=document.getElementById('analyzeBarFill');

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
// Which physical camera is live. 'user' = selfie (mirrored preview),
// 'environment' = rear camera, used when someone else scans your face — or you
// scan a friend's — which is both easier to aim and usually a better sensor.
var facing='user';
var MIRROR=true;           // front-camera preview is mirrored; rear is not
var FRONT_MAX=0.10;        // max yaw to count as "looking straight"

// The rear camera is almost always pointed at somebody else, so the coaching
// copy switches from first to second person along with it.
function faceWord(){return facing==='user'?'your face':'the face';}
function idleHint(){return 'Position '+faceWord()+' in the frame';}

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
function angleP(c,a,b){
  var ax=a.x-c.x,ay=a.y-c.y,bx=b.x-c.x,by=b.y-c.y;
  var dot=ax*bx+ay*by,mg=Math.sqrt(ax*ax+ay*ay)*Math.sqrt(bx*bx+by*by)||1;
  return Math.acos(Math.max(-1,Math.min(1,dot/mg)))*180/Math.PI;
}

// ── Measurement method (v4) ─────────────────────────────────────────────────
// The reference used here is the standard four-measurement face-shape method
// from facial anthropometry, the same one optical dispensing guides use:
//
//   1. Face length   — hairline/forehead top → chin (trichion → gnathion)
//   2. Forehead width — across the widest part of the forehead
//   3. Cheekbone width — bizygomatic, the widest point across the cheekbones
//   4. Jawline width  — across the jaw angles (bigonial)
//   + the gonial angle, i.e. how sharp vs rounded the jaw corner is
//
// Everything is then expressed relative to the cheekbone width (the facial
// index and the two width ratios), which is what makes the result independent
// of camera distance and head size.
//
// The earlier versions took each of those from ONE hardcoded landmark pair
// (e.g. forehead = 54↔284, jaw = 172↔397). That is where the accuracy went:
// those points sit at fixed positions in the mesh topology, not at the place
// on a given face where that measurement is actually widest, and 234/454 sit
// out at the ears so they beat every real cheekbone — which is why the width
// ratios all bunched up and nearly everything fell through to Oval.
//
// v4 measures off the face-oval contour instead. The contour is roll-corrected
// (rotated so the eye line is horizontal), then the face's width is sampled at
// many heights, and each of the four measurements is taken from the band where
// it anatomically belongs, anchored to real features (brow, eye line, mouth
// line, chin) rather than to fixed fractions of the frame. The cheekbone
// measurement is the widest width found in the zygomatic band, so it is a real
// maximum for that face — the ratios then genuinely mean "how far inside the
// cheekbones does the forehead/jaw sit".

// Rotate the face-oval contour into a roll-corrected pixel space where +y runs
// down the face's own vertical axis, so widths are measured across the face
// even when the head is tilted.
function ovalFrame(lm,W,H){
  var order=faceOvalOrder();
  if(!order||order.length<8)return null;
  var eL=lm[33],eR=lm[263];
  var th=Math.atan2((eR.y-eL.y)*H,(eR.x-eL.x)*W);
  var ca=Math.cos(-th),sa=Math.sin(-th);
  function rot(p){var x=p.x*W,y=p.y*H;return {x:x*ca-y*sa,y:x*sa+y*ca};}
  function unrot(p){return {x:p.x*ca+p.y*sa,y:-p.x*sa+p.y*ca};}
  var pts=[],i;
  for(i=0;i<order.length;i++)pts.push(rot(lm[order[i]]));

  // ── Hairline extrapolation ────────────────────────────────────────────────
  // MediaPipe's face oval stops at landmark 10, which sits partway UP the
  // forehead, not at the hairline — the mesh has no hairline points at all.
  // Left as-is the traced outline visibly cuts the forehead in half, and worse,
  // every face-length and forehead-width reading is taken on a face that is
  // missing its top third.
  //
  // The classical facial-thirds rule gives us the missing point: the face
  // divides into three near-equal parts — trichion (hairline) → glabella
  // (between the brows) → subnasale (base of the nose) → gnathion (chin). So
  // the hairline sits one glabella→subnasale step above the glabella. We
  // extend the arc above the brow line up to that estimated trichion, with a
  // slight inward taper since the hairline is a touch narrower than the
  // mid-forehead. The stretch factor is clamped in case a bad frame puts the
  // nose or brow landmarks somewhere implausible.
  var glab=rot(lm[9]),sub=rot(lm[2]);
  var third=sub.y-glab.y;
  var yTop=pts[0].y;
  for(i=1;i<pts.length;i++)if(pts[i].y<yTop)yTop=pts[i].y;
  var span=glab.y-yTop;
  if(third>1&&span>1){
    var f=(third)/span;
    if(f<1)f=1;
    if(f>2.2)f=2.2;
    var cx=(rot(lm[234]).x+rot(lm[454]).x)/2;
    var newTop=glab.y-span*f;
    var denom=(glab.y-newTop)||1;
    for(i=0;i<pts.length;i++){
      if(pts[i].y>=glab.y)continue;
      var ny=glab.y-(glab.y-pts[i].y)*f;
      var t=(glab.y-ny)/denom;
      pts[i]={x:cx+(pts[i].x-cx)*(1-0.06*t*t),y:ny};
    }
  }

  // Same contour mapped back to image space, for drawing over the photo.
  var img=[];
  for(i=0;i<pts.length;i++)img.push(unrot(pts[i]));
  return {pts:pts,img:img,rot:rot};
}

// Horizontal slice through the contour polygon at height y → its left and
// right edge and the width between them.
function sliceAt(pts,y){
  var xs=[],i,a,b,t;
  for(i=0;i<pts.length;i++){
    a=pts[i];b=pts[(i+1)%pts.length];
    if((a.y<=y&&b.y>=y)||(b.y<=y&&a.y>=y)){
      if(Math.abs(b.y-a.y)<1e-6)continue;
      t=(y-a.y)/(b.y-a.y);
      xs.push(a.x+t*(b.x-a.x));
    }
  }
  if(xs.length<2)return null;
  var mn=xs[0],mx=xs[0];
  for(i=1;i<xs.length;i++){if(xs[i]<mn)mn=xs[i];if(xs[i]>mx)mx=xs[i];}
  if(mx-mn<=0)return null;
  return {l:mn,r:mx,w:mx-mn,y:y};
}

// Widest slice within a vertical band — used for the measurements that are
// defined as "the widest point across X" rather than a fixed height.
function widestIn(pts,y0,y1,steps){
  var best=null,i,s;
  for(i=0;i<=steps;i++){
    s=sliceAt(pts,y0+(y1-y0)*i/steps);
    if(s&&(!best||s.w>best.w))best=s;
  }
  return best;
}

function computeMetrics(lm){
  var W=(video&&video.videoWidth)||640, H=(video&&video.videoHeight)||480;
  var fr=ovalFrame(lm,W,H);
  if(!fr)return null;
  var pts=fr.pts;

  // Feature anchors, in the same roll-corrected space as the contour.
  var chin=fr.rot(lm[152]);            // gnathion
  var brow=fr.rot(lm[9]);              // glabella, between the brows
  var eyeY=(fr.rot(lm[33]).y+fr.rot(lm[263]).y)/2;
  var mouthY=(fr.rot(lm[61]).y+fr.rot(lm[291]).y)/2;

  var yTop=pts[0].y,i;
  for(i=1;i<pts.length;i++)if(pts[i].y<yTop)yTop=pts[i].y;
  var faceL=chin.y-yTop;               // face length
  if(faceL<8)return null;

  // Forehead: measured mid-way between the top of the face and the brow line,
  // which is where the forehead is at its widest on essentially every face.
  var fhS=widestIn(pts,yTop+0.35*(brow.y-yTop),yTop+0.75*(brow.y-yTop),6);
  // Cheekbone: widest point in the zygomatic band around the eye line.
  var ckS=widestIn(pts,eyeY-0.06*faceL,eyeY+0.20*faceL,14);
  // Jaw: widest point between the mouth line and the chin — the jaw angles.
  var jwS=widestIn(pts,mouthY,mouthY+0.62*(chin.y-mouthY),12);
  // Chin: width just above the chin point, i.e. how pointed the chin is.
  var cnS=sliceAt(pts,chin.y-0.13*faceL);
  if(!fhS||!ckS||!jwS||!cnS||ckS.w<8)return null;

  // Gonial angle — measured on the contour at the jaw's widest point, between
  // the cheekbone above it and the chin below. Averaged across both sides.
  var gonL=angleP({x:jwS.l,y:jwS.y},{x:ckS.l,y:ckS.y},chin);
  var gonR=angleP({x:jwS.r,y:jwS.y},{x:ckS.r,y:ckS.y},chin);
  var jawDeg=(gonL+gonR)/2;

  var FI=faceL/ckS.w;                  // facial index (length ÷ cheekbone)
  var FHc=fhS.w/ckS.w;                 // forehead ÷ cheekbone
  var JWc=jwS.w/ckS.w;                 // jaw ÷ cheekbone
  var CHj=cnS.w/jwS.w;                 // chin ÷ jaw — low = pointed chin

  return {
    faceL:faceL,cheekW:ckS.w,jawW:jwS.w,fhW:fhS.w,chinW:cnS.w,jawDeg:jawDeg,
    aspect:FI, fVc:FHc, jVc:JWc, chinTaper:CHj,
    pFaceWidth:mapPct(1/FI,0.62,0.92),
    pFaceLength:mapPct(FI,1.08,1.58),
    pJawAngle:mapPct(jawDeg,104,152),
    pForehead:mapPct(FHc,0.68,1.04),
    pCheekbone:mapPct(1/FI,0.62,0.92),
    pJawline:mapPct(JWc,0.70,1.06)
  };
}
// ── 7-way classification ─────────────────────────────────────────────────────
// The definitions below are the standard ones (as used in optical dispensing
// guidance), expressed against the four measurements above:
//
//   Oval     length clearly greater than width, forehead a touch wider than the
//            jaw, everything tapering smoothly — no single dominant feature
//   Round    length ≈ width, soft rounded jaw, full lower face
//   Square   length ≈ width, forehead / cheek / jaw all near-equal, sharp jaw
//   Oblong   length markedly greater than width, the three widths near-equal
//   Heart    forehead the widest, jaw distinctly narrow, chin pointed
//   Diamond  cheekbones the widest by a clear margin, narrow forehead AND jaw
//   Triangle jaw the widest, forehead the narrowest
//
// Scoring rather than a decision tree. Every shape gets a 0..1 score from soft
// membership ramps, and the highest wins. Two earlier attempts failed here for
// opposite reasons: v1 scored distance to seven "ideal" profiles, which always
// favoured whichever profile sat closest to the population average; v2/v3 used
// hard AND-ed cutoffs, so a face that missed one threshold by a hair fell all
// the way through to the default. Soft ramps degrade gracefully instead, and
// the shape-defining trait is a multiplicative gate, so nothing can win on
// supporting evidence alone.
//
// The two width ratios are self-normalising (they compare parts of the same
// face), so they need no calibration. Face length and jaw angle do not have
// that property, so they are anchored to these two reference constants —
// the population-average value of that measurement for this landmark set.
// They are the ONLY numbers to touch if results skew: the sheet's calibration
// panel prints the measured aspect / jawDeg for exactly this purpose.
// FI_REF is derived from published anthropometry: physiognomic face height
// (trichion→gnathion, which is what we now measure thanks to the hairline
// extrapolation) averages ~186mm, against a face-contour width at ear level of
// ~148mm — call it 1.30, nudged up slightly for the contour's inward taper.
// VERIFY THIS ON REAL FACES: scan a few people, read "aspect" off the sheet's
// calibration panel, and set FI_REF to the average you see. It is the one
// number that can systematically skew every result long or short.
var FI_REF=1.32;    // typical face length ÷ cheekbone width
var GON_REF=131;    // typical gonial angle, degrees

function up(v,a,b){return v<=a?0:(v>=b?1:(v-a)/(b-a));}
function down(v,a,b){return 1-up(v,a,b);}
function band(v,a,b,c,d){return Math.min(up(v,a,b),down(v,c,d));}
function wsum(terms){
  var w=0,s=0,i;
  for(i=0;i<terms.length;i++){w+=terms[i][0];s+=terms[i][0]*terms[i][1];}
  return w?s/w:0;
}

// Full score table — kept separate from classify() so confidence can read the
// margin between the winner and the runner-up.
function scoreShapes(m){
  var FI=m.aspect,FHc=m.fVc,JWc=m.jVc,CHj=m.chinTaper,gon=m.jawDeg;

  // Length axis, relative to the reference facial index.
  var lenShort=down(FI,FI_REF*0.96,FI_REF*1.04);
  var lenMid  =band(FI,FI_REF*0.92,FI_REF*1.00,FI_REF*1.10,FI_REF*1.18);
  var lenLong =up(FI,FI_REF*1.10,FI_REF*1.22);

  // Width profile. dFJ compares two parts of the same face, so it is a true
  // relative measure and needs no reference constant.
  var dFJ=FHc-JWc;
  var foreheadWidest=up(dFJ,0.03,0.13);
  var jawWidest=up(-dFJ,0.03,0.11);
  var balanced=band(dFJ,-0.07,-0.02,0.02,0.07);
  var cheeksWidest=down(FHc>JWc?FHc:JWc,0.84,0.95);
  var widthsFull=up(FHc<JWc?FHc:JWc,0.84,0.94);

  // Jaw and chin character.
  var chinPointed=down(CHj,0.50,0.70);
  var chinFull=up(CHj,0.52,0.72);
  var jawSharp=down(gon,GON_REF*0.93,GON_REF*1.04);
  var jawSoft=up(gon,GON_REF*0.96,GON_REF*1.07);

  return {
    // Oval is the "no dominant feature" bucket. Its gate is the absence of a
    // dominant width, so a face with a clearly wider forehead or jaw can't be
    // swallowed by Oval on the strength of its length alone — that shadowing
    // is what made the previous versions answer Oval for nearly everyone.
    Oval:     (1-0.7*(foreheadWidest>jawWidest?foreheadWidest:jawWidest))*
              wsum([[3,lenMid],[2,band(dFJ,-0.04,0.00,0.06,0.11)],[2,down(cheeksWidest,0.3,0.8)]]),
    Oblong:   lenLong*wsum([[2,1],[2,balanced],[1,down(cheeksWidest,0.3,0.8)]]),
    Round:    lenShort*wsum([[2,1],[2,jawSoft],[2,chinFull],[1,widthsFull]]),
    Square:   lenShort*wsum([[2,1],[3,jawSharp],[2,widthsFull],[1,chinFull]]),
    Heart:    foreheadWidest*wsum([[3,1],[2,chinPointed],[1,down(JWc,0.78,0.92)]]),
    Diamond:  cheeksWidest*wsum([[3,1],[2,lenMid>lenLong?lenMid:lenLong],[1,chinPointed]]),
    Triangle: jawWidest*wsum([[3,1],[2,up(JWc,0.90,1.02)],[1,chinFull]])
  };
}

function bestOf(scores){
  var name='Oval',top=-1,second=0,k;
  for(k in scores){if(scores[k]>top){second=top;top=scores[k];name=k;}else if(scores[k]>second)second=scores[k];}
  return {shape:name,top:top,second:second<0?0:second};
}

function classify(m){
  if(!m)return 'Oval';
  return bestOf(scoreShapes(m)).shape;
}
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
  var k=['aspect','fVc','jVc','chinTaper','jawDeg'],o={},i,n=arr.length;
  for(var x=0;x<k.length;x++){var s=0;for(i=0;i<n;i++)s+=arr[i][k[x]];o[k[x]]=+(s/n).toFixed(3);}
  return o;
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

// ── Skin smoothing ───────────────────────────────────────────────────────────
// On by default. The live preview is smoothed in CSS; the captured still has
// to be smoothed in canvas to match, because CSS filters do not apply to
// drawImage — without this the frozen photo would snap back to raw camera
// texture the moment the user taps Capture.
var SMOOTH=true;
document.body.classList.add('smooth');

smoothBtn.addEventListener('click',function(){
  if(done)return;
  SMOOTH=!SMOOTH;
  document.body.classList.toggle('smooth',SMOOTH);
  smoothBtn.classList.toggle('off',!SMOOTH);
  if(!SMOOTH){softLayer.classList.remove('on');softBox=null;}
});

// The face box, padded out to cover the whole head: wider for the cheeks and
// ears, and a lot taller upward, since the mesh stops partway up the forehead
// and the hairline has to be inside the mask too. Shared by the live preview
// and the captured still so both smooth exactly the same region.
var FACE_PAD_X=0.16,FACE_PAD_TOP=0.30,FACE_PAD_W=1.32,FACE_PAD_H=1.46;
function faceBox(lm,w,h,mirrored){
  var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,i,X,Y;
  for(i=0;i<lm.length;i++){
    X=(mirrored?(1-lm[i].x):lm[i].x)*w;
    Y=lm[i].y*h;
    if(X<x0)x0=X;if(X>x1)x1=X;if(Y<y0)y0=Y;if(Y>y1)y1=Y;
  }
  var bw=x1-x0,bh=y1-y0;
  if(!(bw>0&&bh>0))return null;
  return {x:x0-bw*FACE_PAD_X,y:y0-bh*FACE_PAD_TOP,w:bw*FACE_PAD_W,h:bh*FACE_PAD_H};
}

// ── Live preview: park the soft layer on the tracked face ───────────────────
var SOFT_W=200,SOFT_H=260;
var softBox=null;
function updateSoftMask(lm){
  if(!lm||!SMOOTH){softLayer.classList.remove('on');softBox=null;return;}
  // The preview is object-fit:cover, so the video is scaled up and centre
  // cropped; the same mapping has to be applied to the landmarks.
  var vw=video.videoWidth||640,vh=video.videoHeight||480;
  var dw=window.innerWidth,dh=window.innerHeight;
  var sc=Math.max(dw/vw,dh/vh);
  var b=faceBox(lm,vw*sc,vh*sc,MIRROR);
  if(!b){softLayer.classList.remove('on');return;}
  b.x+=(dw-vw*sc)/2;b.y+=(dh-vh*sc)/2;
  // Ease toward the target, or tracker jitter makes the mask edge shimmer.
  if(!softBox)softBox=b;
  else{
    var k=0.35;
    softBox.x+=(b.x-softBox.x)*k;softBox.y+=(b.y-softBox.y)*k;
    softBox.w+=(b.w-softBox.w)*k;softBox.h+=(b.h-softBox.h)*k;
  }
  softLayer.style.transform=
    'translate('+softBox.x.toFixed(1)+'px,'+softBox.y.toFixed(1)+'px) scale('+
    (softBox.w/SOFT_W).toFixed(4)+','+(softBox.h/SOFT_H).toFixed(4)+')';
  softLayer.classList.add('on');
}

// Soft focus in canvas: a heavily downscaled copy drawn back up over the sharp
// frame with 'screen', which is what the preview's blurred backdrop does. The
// downscale is the blur — cheap, and it needs no ctx.filter support. The copy
// is then masked to the same feathered face ellipse as the preview, so the
// background of the captured photo keeps its original detail.
function applySoftFocus(ctx,src,w,h,lm,mirrored){
  try{
    var dw=Math.max(1,Math.round(w/10)),dh=Math.max(1,Math.round(h/10));
    var tmp=document.createElement('canvas');
    tmp.width=dw;tmp.height=dh;
    var tctx=tmp.getContext('2d');
    tctx.imageSmoothingEnabled=true;
    tctx.drawImage(src,0,0,dw,dh);

    var soft=document.createElement('canvas');
    soft.width=w;soft.height=h;
    var sctx=soft.getContext('2d');
    sctx.imageSmoothingEnabled=true;
    sctx.drawImage(tmp,0,0,w,h);

    var b=lm?faceBox(lm,w,h,mirrored):null;
    if(!b)return;
    var cx=b.x+b.w/2,cy=b.y+b.h/2,rx=b.w/2,ry=b.h/2;
    sctx.globalCompositeOperation='destination-in';
    sctx.save();
    sctx.translate(cx,cy);
    sctx.scale(1,ry/rx);
    var g=sctx.createRadialGradient(0,0,0,0,0,rx);
    g.addColorStop(0,'rgba(0,0,0,1)');
    g.addColorStop(0.55,'rgba(0,0,0,1)');
    g.addColorStop(0.78,'rgba(0,0,0,0.55)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    sctx.fillStyle=g;
    sctx.fillRect(-rx,-rx,rx*2,rx*2);
    sctx.restore();

    ctx.save();
    ctx.globalAlpha=0.5;
    ctx.globalCompositeOperation='screen';
    ctx.drawImage(soft,0,0);
    ctx.restore();
  }catch(e){}
}

// ── Captured-face reveal animation ───────────────────────────────────────────
// A staged "biometric analysis" reveal over the frozen photo:
//   1. the 468-point mesh materialises behind a scan beam sweeping down,
//   2. the mesh holds and breathes while the measurements are taken and the
//      shape is matched — the readouts stay in the hint pill, nothing is drawn
//      over the face itself,
//   3. the mesh dissolves, a reticle snaps onto the face, the frame flashes
//      and the shape badge pops in.
// Everything is drawn thin and translucent so the face stays visible; nothing
// opaque is ever painted over the eyes, nose or mouth.
function easeOut(t){return 1-Math.pow(1-t,3);}
function easeOutBack(t){var c=1.70158,c3=c+1;return 1+c3*Math.pow(t-1,3)+c*Math.pow(t-1,2);}
function clamp01(v){return v<0?0:(v>1?1:v);}

var MESH_START=140,BEAM_END=1350,
    MEASURE_AT=1450,
    MATCH_AT=2200,MATCH_END=2900,
    MESH_FADE_START=2680,MESH_FADE_END=3040,
    LOCK_AT=2940,BADGE_AT=3040,
    REVEAL_END=3700;

// FACEMESH_FACE_OVAL is an unordered list of [a,b] index pairs; chain them into
// one ordered loop so the face outline can be walked as a single polygon.
// The same loop, hardcoded — the measurement pass depends on this contour, so
// it must not go dark if the drawing_utils CDN script fails to load.
var FACE_OVAL_FALLBACK=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
var ovalOrder=null;
function faceOvalOrder(){
  if(ovalOrder)return ovalOrder;
  if(typeof FACEMESH_FACE_OVAL==='undefined'){ovalOrder=FACE_OVAL_FALLBACK;return ovalOrder;}
  var next={};
  for(var i=0;i<FACEMESH_FACE_OVAL.length;i++){next[FACEMESH_FACE_OVAL[i][0]]=FACEMESH_FACE_OVAL[i][1];}
  var start=FACEMESH_FACE_OVAL[0][0];
  var order=[start],cur=next[start],guard=0;
  while(cur!==undefined&&cur!==start&&guard++<FACEMESH_FACE_OVAL.length){order.push(cur);cur=next[cur];}
  ovalOrder=order;
  return order;
}

// The full mesh wireframe, when drawing_utils loaded. Without it the reveal
// falls back to landmark dots only — still animated, just no connecting lines.
function tesselation(){
  return (typeof FACEMESH_TESSELATION!=='undefined')?FACEMESH_TESSELATION:null;
}

function runCaptureAnimation(lm,shapeName,photo,mirrored,onDone){
  var w=photo.width,h=photo.height;
  snapCanvas.width=w;snapCanvas.height=h;
  var ctx=snapCanvas.getContext('2d');

  // Landmarks arrive normalised; the mesh needs them in photo pixels, mirrored
  // to match the stored photo when it came from the selfie camera.
  function lx(p){return mirrored?w-p.x*w:p.x*w;}
  function ly(p){return p.y*h;}

  var tess=tesselation();
  var S=w/640;                      // stroke scale for the photo's size

  // Face bounding box — drives the reticle and the mesh reveal ordering.
  var bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9,i;
  for(i=0;i<lm.length;i++){
    var X=lx(lm[i]),Y=ly(lm[i]);
    if(X<bx0)bx0=X;if(X>bx1)bx1=X;if(Y<by0)by0=Y;if(Y>by1)by1=Y;
  }
  var bw=bx1-bx0,bh=by1-by0;
  bx0-=bw*0.10;bx1+=bw*0.10;by0-=bh*0.22;by1+=bh*0.06;
  bw=bx1-bx0;bh=by1-by0;

  // Pre-project the mesh once: every edge keeps its midpoint height so it can
  // light up as the beam passes it, instead of the whole mesh popping in.
  var edges=[];
  if(tess){
    for(i=0;i<tess.length;i++){
      var a=lm[tess[i][0]],b=lm[tess[i][1]];
      if(!a||!b)continue;
      var ax=lx(a),ay=ly(a),bx=lx(b),by=ly(b);
      edges.push({ax:ax,ay:ay,bx:bx,by:by,my:(ay+by)/2});
    }
  }
  var dots=[];
  for(i=0;i<lm.length;i++)dots.push({x:lx(lm[i]),y:ly(lm[i])});

  var hints=[
    {t:0,text:'Mapping facial landmarks…'},
    {t:MEASURE_AT,text:'Measuring facial proportions…'},
    {t:MATCH_AT,text:'Matching your face shape…'},
    {t:BADGE_AT,text:'Analysis complete'}
  ];
  var hintIdx=-1,badgeShown=false,t0=null;
  analyzeBarFill.style.width='0%';
  analyzeBar.classList.add('show');

  function frame(ts){
    if(t0===null)t0=ts;
    var t=ts-t0,k;

    for(var hi=0;hi<hints.length;hi++){
      if(t>=hints[hi].t && hintIdx<hi){
        hintIdx=hi;hint.className='success';hint.textContent=hints[hi].text;
      }
    }
    analyzeBarFill.style.width=Math.round(clamp01(t/LOCK_AT)*100)+'%';

    ctx.clearRect(0,0,w,h);
    ctx.drawImage(photo,0,0,w,h);

    // Slight scrim while the overlays are up, so thin cyan lines read against
    // a bright photo. It lifts again for the final held result.
    var scrim=0.20*clamp01(t/220)*(1-clamp01((t-LOCK_AT)/500));
    if(scrim>0.005){
      ctx.fillStyle='rgba(6,12,18,'+scrim.toFixed(3)+')';
      ctx.fillRect(0,0,w,h);
    }

    // ── Mesh + scan beam ────────────────────────────────────────────────────
    var meshAlpha=clamp01((t-MESH_START)/260)*(1-clamp01((t-MESH_FADE_START)/(MESH_FADE_END-MESH_FADE_START)));
    // After the beam has passed, the settled mesh pulses gently so the
    // measuring/matching beat still reads as live work.
    if(t>BEAM_END)meshAlpha*=0.78+0.22*Math.sin((t-BEAM_END)/300);
    if(meshAlpha>0.01){
      var beamP=clamp01((t-MESH_START)/(BEAM_END-MESH_START));
      var beamY=(t<BEAM_END)?easeOut(beamP)*h:h*2;
      var band=h*0.075;
      ctx.save();
      ctx.lineWidth=Math.max(0.6,0.8*S);
      // Two passes only — one path for the settled mesh, one for the sliver
      // lit by the beam — so a ~2600-edge wireframe still runs at frame rate.
      ctx.strokeStyle='rgba(95,233,255,'+(0.16*meshAlpha).toFixed(3)+')';
      ctx.beginPath();
      for(k=0;k<edges.length;k++){
        var e=edges[k];
        if(e.my>beamY)continue;
        if(Math.abs(e.my-beamY)<band)continue;
        ctx.moveTo(e.ax,e.ay);ctx.lineTo(e.bx,e.by);
      }
      ctx.stroke();
      if(t<BEAM_END){
        ctx.strokeStyle='rgba(215,250,255,'+(0.85*meshAlpha).toFixed(3)+')';
        ctx.lineWidth=Math.max(0.8,1.1*S);
        ctx.shadowColor='rgba(95,233,255,0.9)';
        ctx.shadowBlur=6*S;
        ctx.beginPath();
        for(k=0;k<edges.length;k++){
          var e2=edges[k];
          if(e2.my>beamY||Math.abs(e2.my-beamY)>=band)continue;
          ctx.moveTo(e2.ax,e2.ay);ctx.lineTo(e2.bx,e2.by);
        }
        ctx.stroke();
        ctx.shadowBlur=0;
      }
      // Landmark dots — every point once revealed, brighter under the beam.
      for(k=0;k<dots.length;k++){
        var d=dots[k];
        if(d.y>beamY)continue;
        var near=Math.abs(d.y-beamY)<band;
        if(!near&&(k%3))continue;
        ctx.fillStyle=near
          ?'rgba(234,251,255,'+(0.95*meshAlpha).toFixed(3)+')'
          :'rgba(111,227,174,'+(0.38*meshAlpha).toFixed(3)+')';
        var r=(near?1.9:1.2)*S;
        ctx.fillRect(d.x-r,d.y-r,r*2,r*2);
      }
      ctx.restore();

      // The beam itself, plus the glow trailing behind it.
      if(t<BEAM_END){
        ctx.save();
        ctx.globalAlpha=meshAlpha*(1-clamp01((beamP-0.88)/0.12));
        var g=ctx.createLinearGradient(0,beamY-band*1.6,0,beamY);
        g.addColorStop(0,'rgba(95,233,255,0)');
        g.addColorStop(1,'rgba(95,233,255,0.22)');
        ctx.fillStyle=g;
        ctx.fillRect(0,beamY-band*1.6,w,band*1.6);
        var g2=ctx.createLinearGradient(0,beamY-3*S,0,beamY+3*S);
        g2.addColorStop(0,'rgba(95,233,255,0)');
        g2.addColorStop(0.5,'rgba(234,251,255,0.95)');
        g2.addColorStop(1,'rgba(95,233,255,0)');
        ctx.fillStyle=g2;
        ctx.fillRect(0,beamY-3*S,w,6*S);
        ctx.restore();
      }
    }

    // ── Lock-on reticle ─────────────────────────────────────────────────────
    if(t>MATCH_END-260){
      var lp=clamp01((t-(MATCH_END-260))/420);
      var off=(1-easeOutBack(lp))*bw*0.16;
      var arm=Math.min(bw,bh)*0.16;
      ctx.save();
      ctx.globalAlpha=clamp01(lp*1.4);
      ctx.strokeStyle='rgba(111,227,174,0.9)';
      ctx.lineWidth=Math.max(2,2.4*S);
      ctx.lineCap='round';
      var cs=[[bx0-off,by0-off,1,1],[bx1+off,by0-off,-1,1],[bx0-off,by1+off,1,-1],[bx1+off,by1+off,-1,-1]];
      ctx.beginPath();
      for(k=0;k<4;k++){
        var c4=cs[k];
        ctx.moveTo(c4[0]+c4[2]*arm,c4[1]);
        ctx.lineTo(c4[0],c4[1]);
        ctx.lineTo(c4[0],c4[1]+c4[3]*arm);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Lock flash — a single frame-wide pulse the moment the shape is called.
    if(t>=LOCK_AT&&t<LOCK_AT+260){
      var fa=(1-(t-LOCK_AT)/260)*0.3;
      ctx.fillStyle='rgba(180,255,225,'+fa.toFixed(3)+')';
      ctx.fillRect(0,0,w,h);
    }

    if(t>=BADGE_AT && !badgeShown){
      badgeShown=true;
      shapeBadgeText.textContent=shapeName+' Face';
      shapeBadge.classList.add('show');
      analyzeBar.classList.remove('show');
    }

    if(t<REVEAL_END){
      requestAnimationFrame(frame);
    } else {
      onDone();
    }
  }
  requestAnimationFrame(frame);
}

// The analyzed frame, downscaled, as a data URL to hand to RN so the results
// sheet can show the user the photo their result came from. This crosses the
// WebView bridge as a string, so it is capped — but it has to stay big enough
// to survive the sheet's full-screen pinch-zoom preview.
function snapshotDataUrl(maxW){
  try{
    var sw=snapCanvas.width,sh=snapCanvas.height;
    if(!sw||!sh)return null;
    var sc=Math.min(1,maxW/sw);
    var c=document.createElement('canvas');
    c.width=Math.round(sw*sc);c.height=Math.round(sh*sc);
    c.getContext('2d').drawImage(snapCanvas,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',0.8);
  }catch(e){return null;}
}

// ── Capture → Review (Retake / Analyze) → Analyze flow ──────────────────────
var capturedPhoto=null,capturedLm=null,capturedMirror=true;
// The analyzed result, held until the user taps Continue.
var pendingResult=null;

// Freeze the current frame into a still photo and show it for review, without
// running any analysis yet — the user decides whether to keep it or retake.
function freezeFrame(lm){
  if(video.pause) video.pause();
  var w=(video.videoWidth||640),h=(video.videoHeight||480);
  var photo=document.createElement('canvas');
  photo.width=w;photo.height=h;
  var pctx=photo.getContext('2d');
  if(MIRROR){pctx.save();pctx.translate(w,0);pctx.scale(-1,1);pctx.drawImage(video,0,0,w,h);pctx.restore();}
  else{pctx.drawImage(video,0,0,w,h);}
  if(SMOOTH)applySoftFocus(pctx,photo,w,h,lm,MIRROR);
  capturedPhoto=photo;
  capturedLm=lm;
  capturedMirror=MIRROR;

  snapCanvas.width=w;snapCanvas.height=h;
  snapCanvas.getContext('2d').drawImage(photo,0,0);
  video.style.display='none';
  softLayer.classList.remove('on');
  softBox=null;
  softLayer.style.display='none';
  snapCanvas.style.display='block';
}

captureBtn.addEventListener('click',function(){
  if(done||!aligned||!lastLm)return;
  done=true;
  freezeFrame(lastLm);
  captureBtn.style.display='none';
  captureHint.style.display='none';
  flipBtn.style.display='none';
  smoothBtn.style.display='none';
  oval.className='guide-oval locked';
  hint.className='success';
  hint.textContent='Nice! Retake or analyze this photo';
  reviewRow.classList.add('show');
});

// Back to a live, unanalyzed scan — shared by Retake (before analysis) and
// Rescan (from the result hold).
function resetScan(){
  reviewRow.classList.remove('show');
  resultRow.classList.remove('show');resultRow.classList.remove('visible');
  pendingResult=null;
  capturedPhoto=null;capturedLm=null;
  recentMetrics=[];recentShapes=[];
  lastLm=null;
  snapCanvas.style.display='none';
  video.style.display='block';
  softLayer.style.display='';
  if(video.play) video.play();
  captureBtn.style.display='';
  captureBtn.disabled=true;
  captureBtn.classList.remove('enabled');
  captureHint.style.display='';
  flipBtn.style.display='';
  smoothBtn.style.display='';
  overlay.classList.remove('analyzing');
  shapeBadge.classList.remove('show');
  analyzeBar.classList.remove('show');
  analyzeBarFill.style.width='0%';
  oval.className='guide-oval';
  hint.className='';
  hint.textContent=idleHint();
  done=false;
  aligned=false;
}

retakeBtn.addEventListener('click',resetScan);
rescanBtn.addEventListener('click',resetScan);

// Hand the finished result over to RN — only ever from the Continue tap.
continueBtn.addEventListener('click',function(){
  if(!pendingResult)return;
  var r=pendingResult;
  pendingResult=null;
  continueBtn.disabled=true;
  post(r);
});

analyzeBtn.addEventListener('click',function(){
  if(!capturedLm||!capturedPhoto)return;
  reviewRow.classList.remove('show');
  // Clear the scanning HUD so the reveal happens over a clean photo.
  overlay.classList.add('analyzing');

  // Compute the result now, from the buffered samples, so the reveal
  // animation shows the shape that actually gets sent to RN.
  // Classify once on the average of the buffered measurements rather than
  // voting per frame — averaging the measurements first cancels tracker jitter
  // that a per-frame vote would just carry into the tally.
  var rawAvg=avgRaw(recentMetrics)||computeMetrics(capturedLm);
  var result=rawAvg?bestOf(scoreShapes(rawAvg)):null;
  var modal=result?result.shape:'Oval';

  // Confidence blends how cleanly this face fits one shape (margin over the
  // runner-up) with how steady the reading was across frames. The old version
  // used agreement alone, which read ~98% even when every frame agreed on a
  // shape only because they all shared the same measurement bug.
  var margin=result&&result.top>0?(result.top-result.second)/result.top:0;
  var agreeN=0;
  for(var i=0;i<recentShapes.length;i++){if(recentShapes[i]===modal)agreeN++;}
  var agree=recentShapes.length?agreeN/recentShapes.length:0.7;
  var confidence=Math.max(58,Math.min(97,
    Math.round((0.55*agree+0.45*Math.min(1,margin*1.8))*100)));
  var metricsAvg=avgMetrics(recentMetrics);

  runCaptureAnimation(capturedLm,modal,capturedPhoto,capturedMirror,function(){
    // Hold on the traced photo with the shape badge visible. The result is
    // parked here until the user taps Continue.
    pendingResult={
      type:'faceShape',shape:modal,confidence:confidence,
      metrics:metricsAvg,
      photo:snapshotDataUrl(900),
      debug:{raw:rawAvg,scores:result?scoreShapes(rawAvg):null,samples:recentShapes.length}
    };
    hint.className='success';
    hint.textContent=modal+' face detected · '+confidence+'% match';
    continueBtn.disabled=false;
    resultRow.classList.add('show');
    requestAnimationFrame(function(){resultRow.classList.add('visible');});
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
    updateSoftMask(null);
    setCaptureEnabled(false);
    oval.className='guide-oval';
    hint.className='';
    hint.textContent=idleHint();
    if(hudStatus){hudStatus.textContent='Searching';hudStatus.className='hud hud-tr searching';}
    if(hudCoord){hudCoord.textContent='Yaw --  Sz --';}
    return;
  }

  var lm=lms[0];
  lastLm=lm;
  updateSoftMask(lm);
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
    hint.textContent='Center '+faceWord()+' in the frame';return;
  }
  if(Math.abs(yaw)>FRONT_MAX){
    setCaptureEnabled(false);
    oval.className='guide-oval';hint.className='warn';
    hint.textContent=facing==='user'?'Look straight at the camera':'Ask them to look straight at the camera';return;
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
var loading=document.getElementById('loading');
var cam=null,switching=false;

// Keep everything that depends on which lens is live in one place: the preview
// mirror, the yaw sign (via MIRROR) and the header copy.
function applyFacing(){
  MIRROR=(facing==='user');
  if(MIRROR)video.classList.add('mirrored');else video.classList.remove('mirrored');
  topchipText.textContent=MIRROR?'Biometric Face Scan':'Rear Camera Scan';
}

function stopCamera(){
  try{if(cam&&cam.stop)cam.stop();}catch(e){}
  var s=video.srcObject;
  if(s&&s.getTracks){var tr=s.getTracks();for(var i=0;i<tr.length;i++){try{tr[i].stop();}catch(e2){}}}
  video.srcObject=null;
  cam=null;
}

function startCamera(){
  applyFacing();
  cam=new Camera(video,{
    onFrame:async function(){await faceMesh.send({image:video});},
    width:640,height:480,facingMode:facing
  });
  return cam.start();
}

startCamera()
  .then(function(){loading.style.display='none';})
  .catch(function(err){
    post({type:'cameraError',reason:String(err)});
    loading.innerHTML='<p style="color:rgba(255,255,255,.7);padding:20px;text-align:center">Camera access denied.<br>Please allow camera permission and try again.</p>';
  });

// ── Front / rear camera toggle ───────────────────────────────────────────────
// Switching lenses invalidates the sample buffer (different focal length and
// mirroring), so alignment restarts from scratch. If the requested camera can't
// be opened — no rear lens, or it's held by another app — we fall back to the
// one that was already working instead of leaving a dead preview.
flipBtn.addEventListener('click',function(){
  if(done||switching)return;
  switching=true;
  flipBtn.classList.add('busy');
  flipBtn.classList.toggle('spin');

  var prev=facing;
  facing=(facing==='user')?'environment':'user';

  recentMetrics=[];recentShapes=[];lastLm=null;
  softLayer.classList.remove('on');softBox=null;
  setCaptureEnabled(false);
  oval.className='guide-oval';
  hint.className='';
  loading.style.display='';
  loading.innerHTML='<div class="spinner"></div>Switching camera…';

  stopCamera();
  startCamera().then(function(){
    loading.style.display='none';
    hint.textContent=idleHint();
    switching=false;flipBtn.classList.remove('busy');
  }).catch(function(){
    facing=prev;
    stopCamera();
    startCamera().then(function(){loading.style.display='none';}).catch(function(e){
      post({type:'cameraError',reason:String(e)});
    });
    flipBtn.classList.toggle('spin');
    hint.className='warn';
    hint.textContent='That camera is unavailable';
    switching=false;flipBtn.classList.remove('busy');
  });
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
    photo: string | null,
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
            typeof d.photo === 'string' ? d.photo : null,
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

// ─── Face Scan — Idle ─────────────────────────────────────────────────────────

// The intro is a preview of the scanner itself: a dark HUD panel with the same
// cyan wireframe and sweeping beam the camera shows, so tapping Start feels
// like stepping into something the user has already seen.

// Stage geometry, kept explicit: the pulse ring and the beam are absolutely
// positioned, and relying on the parent's centring for insetless absolute
// children left them off-centre. Every layer is placed from these numbers.
const STAGE_W = 240;
const STAGE_H = 210;
const FACE_W = 160;
const FACE_H = 196;
const RETICLE_W = 152; // portrait, so the brackets frame the face, not the
const RETICLE_H = 198; // full width of the stage
const RING_D = 160;

// Abstract face wireframe — a contour, a light mesh over it and the landmark
// vertices, in the scanner's palette.
const FaceWireframe: React.FC = () => (
  <Svg
    width={FACE_W}
    height={FACE_H}
    viewBox="0 0 200 220"
    style={idleStyles.face}
  >
    {/* Face contour */}
    <Path
      d="M100 26 C132 26 152 52 154 92 C156 126 140 160 116 182 C110 190 104 194 100 194 C96 194 90 190 84 182 C60 160 44 126 46 92 C48 52 68 26 100 26 Z"
      stroke="rgba(95,233,255,0.85)"
      strokeWidth={1.6}
      fill="rgba(95,233,255,0.05)"
    />
    {/* Mesh — brow, eye, cheek and jaw lines plus the tie-ins between them */}
    <G stroke="rgba(95,233,255,0.36)" strokeWidth={1} fill="none">
      <Path d="M62 88 L100 80 L138 88" />
      <Path d="M56 106 L100 99 L144 106" />
      <Path d="M54 126 L100 134 L146 126" />
      <Path d="M70 164 L100 177 L130 164" />
      <Path d="M100 80 L100 134 L100 177" />
      <Path d="M62 88 L100 134 L138 88" />
      <Path d="M56 106 L70 164" />
      <Path d="M144 106 L130 164" />
      <Path d="M54 126 L70 164" />
      <Path d="M146 126 L130 164" />
    </G>
    {/* Landmark vertices */}
    <G fill="rgba(234,251,255,0.92)">
      {[
        [100, 80],
        [62, 88],
        [138, 88],
        [56, 106],
        [144, 106],
        [54, 126],
        [146, 126],
        [100, 134],
        [70, 164],
        [130, 164],
        [100, 177],
        [100, 194],
        [46, 92],
        [154, 92],
      ].map(([cx, cy]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.4} />
      ))}
    </G>
    {/* Eyes — the only solid marks, so the wireframe still reads as a face */}
    <G fill="rgba(111,227,174,0.95)">
      <Circle cx={76} cy={106} r={4} />
      <Circle cx={124} cy={106} r={4} />
    </G>
  </Svg>
);

const FaceScanIdle: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const beam = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = [
      // The beam sweeps the panel the way it sweeps the photo during analysis.
      Animated.loop(
        Animated.sequence([
          Animated.timing(beam, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(420),
        ]),
      ),
      Animated.loop(
        Animated.timing(ring, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(blink, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(blink, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [beam, ring, blink]);

  const beamY = beam.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, STAGE_H],
  });
  const beamOpacity = beam.interpolate({
    inputRange: [0, 0.08, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });
  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.28],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.55, 0],
  });

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: a window into the scanner ────────────────────────────────── */}
      <LinearGradient
        colors={['#241C18', '#3A2C25', '#221A16']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={idleStyles.hero}
      >
        {/* Ambient glows behind the wireframe */}
        <View style={[idleStyles.glow, idleStyles.glowTop]} />
        <View style={[idleStyles.glow, idleStyles.glowBottom]} />

        <View style={idleStyles.heroChip}>
          <Animated.View style={[idleStyles.chipDot, { opacity: blink }]} />
          <AppText style={idleStyles.chipText}>AI Face Analysis</AppText>
        </View>

        <View style={idleStyles.stage}>
          <Animated.View
            style={[
              idleStyles.ring,
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <FaceWireframe />

          {/* Sweeping beam, clipped to the stage */}
          <Animated.View
            style={[
              idleStyles.beam,
              { opacity: beamOpacity, transform: [{ translateY: beamY }] },
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(95,233,255,0)',
                'rgba(95,233,255,0.16)',
                'rgba(234,251,255,0.95)',
              ]}
              style={idleStyles.beamFill}
            />
          </Animated.View>

          {/* Reticle corners — on their own box so they frame the face */}
          <View style={idleStyles.reticle} pointerEvents="none">
            <View style={[idleStyles.corner, idleStyles.cornerTL]} />
            <View style={[idleStyles.corner, idleStyles.cornerTR]} />
            <View style={[idleStyles.corner, idleStyles.cornerBL]} />
            <View style={[idleStyles.corner, idleStyles.cornerBR]} />
          </View>
        </View>

        <AppText style={idleStyles.heroTitle}>Face Shape Scan</AppText>
        <AppText style={idleStyles.heroSub}>
          Map your face in seconds and get the frames that suit its shape.
        </AppText>
      </LinearGradient>

      {/* ── What the scan does ─────────────────────────────────────────────── */}
      <View style={idleStyles.statsRow}>
        {[
          { icon: 'grid-outline', value: '468', label: 'Landmarks' },
          { icon: 'timer-outline', value: '~5s', label: 'To scan' },
          { icon: 'shapes-outline', value: '7', label: 'Face shapes' },
        ].map(s => (
          <View key={s.label} style={idleStyles.statCard}>
            <Ionicons name={s.icon as any} size={17} color={Colors.primary} />
            <AppText style={idleStyles.statValue}>{s.value}</AppText>
            <AppText style={idleStyles.statLabel}>{s.label}</AppText>
          </View>
        ))}
      </View>

      {/* ── Steps ──────────────────────────────────────────────────────────── */}
      <AppText style={idleStyles.sectionLabel}>How it works</AppText>
      <View style={idleStyles.stepList}>
        {[
          {
            icon: 'sunny-outline',
            title: 'Find good light',
            text: 'Face a window or a lamp and hold the phone at eye level.',
          },
          {
            icon: 'person-outline',
            title: 'Fill the frame',
            text: 'Put your whole face inside the frame and look straight ahead.',
          },
          {
            icon: 'scan-outline',
            title: 'Capture',
            text: 'When the frame turns green, tap the shutter to analyse.',
          },
        ].map((step, i, arr) => (
          <View key={step.title} style={idleStyles.stepRow}>
            <View style={idleStyles.stepRail}>
              <View style={idleStyles.stepBadge}>
                <Ionicons
                  name={step.icon as any}
                  size={16}
                  color={Colors.primary}
                />
              </View>
              {i < arr.length - 1 && <View style={idleStyles.stepLine} />}
            </View>
            <View style={idleStyles.stepBody}>
              <AppText style={idleStyles.stepTitle}>{step.title}</AppText>
              <AppText style={idleStyles.stepCopy}>{step.text}</AppText>
            </View>
          </View>
        ))}
      </View>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <TouchableOpacity onPress={onStart} activeOpacity={0.85}>
        <LinearGradient
          colors={[Colors.primaryMid, Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={idleStyles.cta}
        >
          <Ionicons name="scan-outline" size={20} color={Colors.white} />
          <AppText style={idleStyles.ctaText}>Start Face Scan</AppText>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="rgba(255,255,255,0.85)"
          />
        </LinearGradient>
      </TouchableOpacity>

      <View style={idleStyles.privacy}>
        <Ionicons name="lock-closed-outline" size={13} color={Colors.gray500} />
        <AppText style={idleStyles.privacyText}>
          Your photo is analysed on your device — it is never uploaded.
        </AppText>
      </View>
    </ScrollView>
  );
};

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
// The reason a frame shape works, as a fallback for a face/frame pair that
// SHAPE_FRAME_REASON does not cover. The icon field is gone — the cards draw
// the real frame silhouette now (components/ui/Frame/FrameShapeIcon).
const FRAME_INFO: Record<string, { reason: string }> = {
  Wayfarer: {
    reason:
      'Bold angular lines add structure and definition to softer features.',
  },
  Aviator: {
    reason:
      'Teardrop curves balance an angular jaw and gently elongate the face.',
  },
  Round: {
    reason: 'Soft circular frames offset strong angles and a wide jawline.',
  },
  'Cat-Eye': {
    reason: 'Upswept outer corners lift the face and draw the eye upward.',
  },
  Rectangle: {
    reason: 'Straight, wider lines add definition and slim a rounder face.',
  },
  Square: {
    reason: 'Sharp geometric edges contrast soft curves for a balanced look.',
  },
  Browline: {
    reason:
      'Weight on the top frame widens the forehead and offsets a strong jaw.',
  },
  Geometric: {
    reason: 'Distinct angles add a modern, structured edge to your look.',
  },
  Oval: {
    reason: 'Gently rounded frames flatter almost any face and soften angles.',
  },
  Rimless: {
    reason: 'Minimal, light frames keep the focus on your eyes and cheekbones.',
  },
  Oversized: {
    reason: 'Larger frames add width and shorten the look of a longer face.',
  },
  Decorative: {
    reason: 'Detailing and depth add width and visual interest to a long face.',
  },
  // Keyed with a hyphen to match the names used in FACE_SHAPE_INFO.frames —
  // an underscore here never matched, so the card fell back to the generic
  // reason and FrameShapeIcon drew its Rectangle default.
  'Soft-Square': {
    reason: 'Rounded corners soften a strong jawline and angular features.',
  },
  'Narrow-Rectangle': {
    reason: 'Slim, low lenses keep the frame light and never widen the face.',
  },
};

// Why a frame flatters THIS face. FRAME_INFO's reason is written per frame
// shape, so the same sentence was being shown to every face — telling an oval
// face that aviators "balance an angular jaw", or a heart face that round
// frames "offset a wide jawline", when neither has one. These are keyed by the
// pair, so each card argues from the features the scan actually found.
const SHAPE_FRAME_REASON: Record<FaceShape, Record<string, string>> = {
  Oval: {
    'Soft-Square':
      'Softly squared lenses add gentle structure while keeping your proportions balanced.',
    'Narrow-Rectangle':
      'Slim, low lenses follow your natural line and keep an oval face from looking longer.',
    Wayfarer:
      'Clean angular lines add structure without upsetting your balanced proportions.',
    Aviator:
      'Soft teardrop curves follow your natural proportions for an effortless look.',
    Round:
      'Gentle curves echo the soft lines of an oval face without widening it.',
    'Cat-Eye':
      'Upswept corners add lift and character to already balanced features.',
  },
  Round: {
    Rectangle:
      'Straight horizontal lines make a round face read longer and slimmer.',
    Square:
      'Sharp corners contrast your soft curves and add definition to the cheeks.',
    Browline:
      'Weight along the top draws the eye upward, lengthening a round face.',
    Geometric:
      'Distinct angles break up soft curves and give a round face definition.',
  },
  Square: {
    Round: 'Circular curves soften a strong jawline and a broad forehead.',
    Oval: 'Rounded edges take the hardness off angular features.',
    Aviator:
      'Teardrop curves soften the jaw and gently elongate a square face.',
    'Cat-Eye':
      'Upswept corners lift attention from the jaw up toward your eyes.',
  },
  Heart: {
    'Narrow-Rectangle':
      'A slim, low frame stays clear of your wider forehead and keeps the balance on your chin.',
    'Soft-Square':
      'Rounded corners and a squared base add fullness where your face tapers to the chin.',
    Aviator:
      'Curved lower edges add width where your face narrows toward the chin.',
    Round:
      'Soft curves add fullness around a narrow chin and offset a wider forehead.',
    Rimless:
      'Light, frameless styling keeps the top of the face from looking wider.',
    Oval: 'Even, rounded lines balance a wide forehead against a narrow chin.',
  },
  Oblong: {
    Wayfarer:
      'Deep lenses and a strong brow line break up the length of a long face.',
    Round:
      'Curves add width across the middle of the face and shorten it visually.',
    Oversized:
      'Large frames cover more of the face height, making it look shorter.',
    Decorative: 'Detail on the temples draws the eye sideways and adds width.',
  },
  Diamond: {
    'Cat-Eye':
      'Upswept corners widen the brow line and balance prominent cheekbones.',
    Oval: 'Soft curves ease the angle of high cheekbones without narrowing the face.',
    Rimless: 'Minimal frames keep wide cheekbones from looking any wider.',
    Browline:
      'Weight along the top broadens a narrow forehead against wide cheekbones.',
  },
  Triangle: {
    Browline:
      'Weight along the top widens a narrow forehead to balance a strong jaw.',
    'Cat-Eye':
      'Upswept corners lift attention up and away from a wider jawline.',
    Aviator: 'A wide top bar broadens the brow line to match a strong jaw.',
    Round:
      'Soft curves take the edge off an angular jaw while adding width up top.',
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

  // Compare on letters only, so a catalogue shape stored as "Soft Square" or
  // "soft_square" still matches the "Soft-Square" name used here. A plain
  // lowercase compare made the separator significant and failed silently.
  const canon = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const wanted = recommendedFrames.map(canon);
  const isRecommended = (p: Product) =>
    !!p.frame_shape?.name && wanted.includes(canon(p.frame_shape.name));
  const matched = products.filter(isRecommended);
  // Fall back to the general catalogue if nothing matches the face shape.
  const recommended = (matched.length ? matched : products).slice(0, 6);

  const reasonFor = (p: Product): string => {
    const fs = p.frame_shape?.name?.toLowerCase();
    if (mode === 'hair' && hairStyle) {
      return fs
        ? `Its ${fs} shape complements ${hairStyle.toLowerCase()} hair.`
        : `A great match for ${hairStyle.toLowerCase()} hair.`;
    }
    // Only claim a face-shape benefit for frames that actually carry one of
    // the recommended shapes — a fallback product gets a neutral line instead
    // of a reason that does not apply to it.
    if (!isRecommended(p)) {
      return fs
        ? `A ${fs} frame from our current range.`
        : 'From our current range.';
    }
    return `Its ${fs} shape ${SHAPE_EFFECT[shape]}`;
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
          <AppImage
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
  photo?: string | null;
  onClose: () => void;
}> = ({ visible, shape, confidence, metrics, debug, photo, onClose }) => {
  const navigation = useNavigation<any>();
  const info = FACE_SHAPE_INFO[shape];
  const [showMeasure, setShowMeasure] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(false);
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
      // Don't leave the preview armed for the next scan's sheet.
      setPhotoPreview(false);
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
          {/* Hero — face shape + confidence, compact. The scan itself sits in
              place of the generic shape icon when we have it, so the user can
              see the photo the result came from. */}
          <View style={gsStyles.heroCard}>
            {photo ? (
              <TouchableOpacity
                onPress={() => setPhotoPreview(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="View scan photo full screen"
              >
                <Image
                  source={{ uri: photo }}
                  style={gsStyles.heroPhoto}
                  resizeMode="cover"
                />
                <View style={gsStyles.heroPhotoExpand}>
                  <Ionicons name="expand" size={11} color={Colors.white} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={gsStyles.heroIcon}>
                <Ionicons
                  name={info.icon as any}
                  size={26}
                  color={Colors.primary}
                />
              </View>
            )}
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
              const fallbackReason = `A flattering match for your ${shape.toLowerCase()} face.`;
              const reason =
                SHAPE_FRAME_REASON[shape]?.[frame] ??
                FRAME_INFO[frame]?.reason ??
                fallbackReason;
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
                      <FrameShapeIcon
                        shape={frame}
                        size={22}
                        color={best ? Colors.white : Colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={gsStyles.recName}>{frame}</AppText>
                      <AppText style={gsStyles.recReason}>{reason}</AppText>
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

      {/* Full-screen scan preview. Nested inside the sheet's own Modal so the
          sheet stays mounted underneath and is still there on dismiss.
          GestureHandlerRootView is required for pinch/pan to reach ImageZoom —
          a RN Modal renders outside the root view the app wraps in App.tsx. */}
      {photo && (
        <Modal
          visible={photoPreview}
          transparent={false}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setPhotoPreview(false)}
        >
          <GestureHandlerRootView style={gsStyles.previewRoot}>
            <ImageZoom
              uri={photo}
              minScale={1}
              maxScale={4}
              doubleTapScale={2.5}
              isDoubleTapEnabled
              isPanEnabled
              isPinchEnabled
              resizeMode="contain"
              style={gsStyles.previewImage}
            />
            <SafeAreaView style={gsStyles.previewBar} pointerEvents="box-none">
              <TouchableOpacity
                style={gsStyles.previewClose}
                onPress={() => setPhotoPreview(false)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Close preview"
              >
                <Ionicons name="close" size={22} color={Colors.white} />
              </TouchableOpacity>
            </SafeAreaView>
            <SafeAreaView
              style={gsStyles.previewCaptionWrap}
              pointerEvents="none"
            >
              <AppText style={gsStyles.previewCaption}>
                {shape} face
                {typeof confidence === 'number'
                  ? ` · ${confidence}% match`
                  : ''}
              </AppText>
              <AppText style={gsStyles.previewHint}>
                Pinch or double-tap to zoom
              </AppText>
            </SafeAreaView>
          </GestureHandlerRootView>
        </Modal>
      )}
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
        desc: `Cover one eye at a time and tap where the gap is on each of ${ACUITY_TRIALS} rings. No time limit.`,
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

// ─── Refraction — Per-Test Instructions ──────────────────────────────────────
// Shown immediately before each of the three tests (so the user learns what
// they're about to do right when it's relevant, rather than all at once up
// front): what the test looks for, then how to answer it.

type TestInfo = {
  stepNum: string;
  name: string;
  icon: string;
  purpose: string;
  steps: string[];
  note: string;
};

const TEST_INFO: Record<'acuity' | 'color' | 'astigmatism', TestInfo> = {
  acuity: {
    stepNum: '1',
    name: 'Visual Acuity',
    icon: 'compass-outline',
    purpose:
      'Measures how much fine detail your eye can resolve — the sharpness of your sight. Trouble here often points to short- or long-sightedness.',
    steps: [
      'Cover one eye with your free hand — each eye is tested on its own.',
      "Hold the phone at arm's length and look at the small broken ring (a “C”).",
      'Tap the spot on the big ring below where you saw the gap.',
      `You'll do this ${ACUITY_TRIALS} times per eye. Get one right and the next ring shrinks; get one wrong and it grows back.`,
    ],
    note: "There's no timer — take as long as you need on each ring.",
  },
  color: {
    stepNum: '2',
    name: 'Colour Vision',
    icon: 'color-palette-outline',
    purpose:
      'Checks how well you tell colours apart, especially reds and greens. This is an Ishihara-style test, the standard screen for colour vision deficiency.',
    steps: [
      'Both eyes stay open for this one — nothing to cover.',
      'Each plate is a circle of coloured dots with a number hidden inside.',
      `Tap the number you can see. If no number stands out, tap “${CANT_SEE}”.`,
      'Keep your screen brightness up and avoid strong coloured lighting.',
    ],
    note: 'Answer with your first impression — guessing at a blurry plate is fine, and there is no timer.',
  },
  astigmatism: {
    stepNum: '3',
    name: 'Astigmatism Check',
    icon: 'radio-button-off-outline',
    purpose:
      'Looks for an unevenly curved cornea, which makes some directions focus more sharply than others. It shows up as lines that look darker or blurrier in one direction.',
    steps: [
      'Cover one eye with your free hand — again, one eye at a time.',
      "Hold the phone at arm's length and look at the centre dot of the fan.",
      'Let your eyes relax and notice the spokes with your side vision.',
      'Tell us whether all the lines look equally sharp, or some stand out.',
    ],
    note: 'Some lines looking bolder than others is exactly what this test is designed to catch — answer honestly.',
  },
};

const TestInstructions: React.FC<{
  info: TestInfo;
  onStart: () => void;
}> = ({ info, onStart }) => (
  <ScrollView
    contentContainerStyle={styles.contentPad}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.stepHeader}>
      <AppText style={styles.stepCounter}>
        Step {info.stepNum} of 3 — {info.name}
      </AppText>
    </View>

    <View style={styles.heroCard}>
      <View style={styles.heroIconRing}>
        <Ionicons name={info.icon as any} size={56} color={Colors.primary} />
      </View>
      <AppText style={styles.heroTitle}>{info.name}</AppText>
      <AppText style={styles.heroSub}>{info.purpose}</AppText>
    </View>

    <AppText style={styles.sectionLabel}>How it works</AppText>
    {info.steps.map((step, i) => (
      <View key={step} style={styles.featureRow}>
        <View style={styles.featureIconBox}>
          <AppText style={rfStyles.instructionStepNum}>{i + 1}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.featureDesc}>{step}</AppText>
        </View>
      </View>
    ))}

    <View style={rfStyles.oneHandBanner}>
      <Ionicons
        name="information-circle-outline"
        size={20}
        color={Colors.primaryDark}
      />
      <AppText style={rfStyles.oneHandBannerText}>{info.note}</AppText>
    </View>

    <TouchableOpacity
      style={[styles.primaryBtn, { marginTop: Spacing.lg }]}
      onPress={onStart}
      activeOpacity={0.82}
    >
      <Ionicons name="play-outline" size={20} color={Colors.white} />
      <AppText style={styles.primaryBtnText}>Start {info.name}</AppText>
    </TouchableOpacity>
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
  // Snap the stroke to a half-pixel so the smallest rings stay crisp instead
  // of smearing across a subpixel boundary — the ring must read as small, not
  // as blurry, or the gap becomes unfindable for the wrong reason.
  const stroke = Math.round(size * 0.22 * 2) / 2;
  // A standard Landolt C is built on a 5-unit grid: 1 unit of stroke and a gap
  // exactly as wide as the stroke. The gap used to be 1.2x the stroke, which
  // made it easier to spot than the optotype it is modelled on.
  const gapWidth = stroke;
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

// Answer picker — a black ring cut into the 8 Landolt directions. The wedge
// sitting where the C's gap was IS the button, so the tap and the answer are
// literally the same place on the circle: no arrows, no labels to read, and a
// target big enough to hit with the phone held at arm's length.
const PICKER_BOX = 260;
const PICKER_R_OUT = 120;
const PICKER_R_IN = 66;
// The wedges meet edge to edge; a hairline stroke is all that divides them.
// Strokes are centred on the path, so neighbours each contribute half and the
// seam between any two reads as one even line.
const PICKER_DIVIDER = 2;
// Touch targets are plain RN views laid over the drawing rather than SVG press
// handlers: hit-testing a <Path> is the sort of thing that quietly stops
// working on one platform, and a broken answer button breaks the whole test.
const PICKER_HIT = 60;

// Angle convention matches LANDOLT_ANGLES and the LandoltC ring itself:
// 0 = up, growing clockwise.
const polarPoint = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};

// One wedge of the donut: out along the outer arc, in across, back along the
// inner arc. Sweep flags are 1 then 0 because the return trip runs the other
// way round the circle.
const wedgePath = (
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  deg: number,
  span: number,
) => {
  const a0 = deg - span / 2;
  const a1 = deg + span / 2;
  const o0 = polarPoint(cx, cy, rOut, a0);
  const o1 = polarPoint(cx, cy, rOut, a1);
  const i1 = polarPoint(cx, cy, rIn, a1);
  const i0 = polarPoint(cx, cy, rIn, a0);
  return (
    `M ${o0.x} ${o0.y} ` +
    `A ${rOut} ${rOut} 0 0 1 ${o1.x} ${o1.y} ` +
    `L ${i1.x} ${i1.y} ` +
    `A ${rIn} ${rIn} 0 0 0 ${i0.x} ${i0.y} Z`
  );
};

const DirectionPicker: React.FC<{
  selected: number | null;
  correctAngle: number;
  onSelect: (angle: number) => void;
}> = ({ selected, correctAngle, onSelect }) => {
  const center = PICKER_BOX / 2;
  const span = 360 / LANDOLT_DIRECTIONS.length;
  // Middle of the wedge's thickness — where the touch target and the
  // correct/wrong icon sit.
  const hitRadius = (PICKER_R_OUT + PICKER_R_IN) / 2;

  return (
    <View style={rfStyles.pickerContainer}>
      <Svg width={PICKER_BOX} height={PICKER_BOX}>
        {LANDOLT_DIRECTIONS.map(dir => {
          const isSelected = selected === dir.angle;
          const revealCorrect = selected !== null && dir.angle === correctAngle;
          const showWrong = isSelected && dir.angle !== correctAngle;
          const fill = revealCorrect
            ? Colors.success
            : showWrong
            ? Colors.error
            : Colors.black;
          return (
            <Path
              key={dir.angle}
              d={wedgePath(
                center,
                center,
                PICKER_R_OUT,
                PICKER_R_IN,
                dir.angle,
                span,
              )}
              fill={fill}
              stroke={Colors.white}
              strokeWidth={PICKER_DIVIDER}
            />
          );
        })}
      </Svg>

      <AppText style={rfStyles.pickerHint}>Tap the gap</AppText>

      {LANDOLT_DIRECTIONS.map(dir => {
        const pt = polarPoint(center, center, hitRadius, dir.angle);
        const isSelected = selected === dir.angle;
        const revealCorrect = selected !== null && dir.angle === correctAngle;
        const showWrong = isSelected && dir.angle !== correctAngle;
        return (
          <TouchableOpacity
            key={dir.angle}
            accessibilityRole="button"
            accessibilityLabel={dir.label}
            disabled={selected !== null}
            style={[
              rfStyles.pickerHit,
              { left: pt.x - PICKER_HIT / 2, top: pt.y - PICKER_HIT / 2 },
            ]}
            onPress={() => onSelect(dir.angle)}
            activeOpacity={0.6}
          >
            {revealCorrect || showWrong ? (
              <Ionicons
                name={revealCorrect ? 'checkmark' : 'close'}
                size={22}
                color={Colors.white}
              />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const AcuityStep: React.FC<{
  eye: 'left' | 'right';
  angles: number[];
  onComplete: (passCount: number) => void;
}> = ({ eye, angles, onComplete }) => {
  const [trialIndex, setTrialIndex] = useState(0);
  const [levelIndex, setLevelIndex] = useState(ACUITY_START_LEVEL);
  const [passCount, setPassCount] = useState(0);
  const [selectedAngle, setSelectedAngle] = useState<number | null>(null);

  const level = ACUITY_LADDER[levelIndex];
  const correctAngle = angles[trialIndex];

  // Untimed two-way staircase: correct → the next ring is one step smaller,
  // wrong → one step bigger, and either way the user is asked again until all
  // ACUITY_TRIALS rings are done. A miss never ends the test early.
  const handleSelect = (angle: number) => {
    if (selectedAngle !== null) return;
    setSelectedAngle(angle);
    const isCorrect = angle === correctAngle;
    const newCount = isCorrect ? passCount + 1 : passCount;
    setTimeout(() => {
      if (trialIndex + 1 >= ACUITY_TRIALS) {
        onComplete(newCount);
        return;
      }
      setPassCount(newCount);
      setLevelIndex(prev =>
        Math.min(
          ACUITY_LADDER.length - 1,
          Math.max(0, prev + (isCorrect ? 1 : -1)),
        ),
      );
      setSelectedAngle(null);
      setTrialIndex(prev => prev + 1);
      // Long enough to read the green tick / red cross before the next ring.
    }, 900);
  };

  const progress = (trialIndex / ACUITY_TRIALS) * 100;
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
          Ring {trialIndex + 1}/{ACUITY_TRIALS}
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
          Hold the phone at arm's length. Find the gap in the ring below — take
          as long as you need.
        </AppText>
        <View style={styles.acuityLetterBox}>
          <LandoltC size={level.size} angle={correctAngle} />
          <AppText style={styles.acuityLabel}>{level.label} line</AppText>
        </View>
        <AppText style={styles.acuityQuestion}>
          Tap the spot on the ring below where you saw the gap.
        </AppText>
      </View>

      <DirectionPicker
        selected={selectedAngle}
        correctAngle={correctAngle}
        onSelect={handleSelect}
      />
    </ScrollView>
  );
};

// ─── Refraction — Step 2: Astigmatism ────────────────────────────────────────

// Untimed — the user answers at their own pace.
// 36 spokes at 5° spacing — finer than the eye can lazily eyeball at a glance.
const ASTIGMATISM_SPOKES = 36;

const AstigmatismStep: React.FC<{
  eye: 'left' | 'right';
  onComplete: (result: 'equal' | 'unequal') => void;
}> = ({ eye, onComplete }) => {
  const [answered, setAnswered] = useState(false);
  const coverEye = eye === 'left' ? 'right' : 'left';
  const stepNum = eye === 'left' ? '3a' : '3b';

  const handleAnswer = (result: 'equal' | 'unequal') => {
    if (answered) return;
    setAnswered(true);
    onComplete(result);
  };

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

// No time limit here — plates are untimed so answers aren't rushed.

const ColorVisionStep: React.FC<{
  plates: CvPlate[];
  onComplete: (result: ColorResult) => void;
}> = ({ plates, onComplete }) => {
  const [plateIndex, setPlateIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);

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
  const [branches, setBranches] = useState<StoreLocation[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState(false);

  const loadBranches = useCallback(async () => {
    setBranchLoading(true);
    setBranchError(false);
    try {
      setBranches(await fetchBranches());
    } catch (err: any) {
      console.warn('[Booking] branches failed:', err?.message);
      setBranchError(true);
    } finally {
      setBranchLoading(false);
    }
  }, []);

  // Fetched when the sheet opens rather than on mount, so a user who never
  // books never pays for the request, and a reopen picks up branch edits.
  useEffect(() => {
    if (visible) loadBranches();
  }, [visible, loadBranches]);

  const branch = branches.find(b => b.id === branchId);
  const slots = useMemo(() => slotsFor(branch, date), [branch, date]);
  const canConfirm = branchId && date && timeSlot;

  // A slot only means anything for the branch and day it was picked under —
  // switching either can make it invalid (different hours, or now in the past).
  useEffect(() => {
    if (timeSlot && !slots.includes(timeSlot)) setTimeSlot(null);
  }, [slots, timeSlot]);

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
                { icon: 'call-outline', text: branch.phone },
                {
                  icon: 'calendar-outline',
                  text: `${DAY_SHORT[date.getDay()]}, ${date.getDate()} ${
                    MONTH_SHORT[date.getMonth()]
                  }`,
                },
                { icon: 'time-outline', text: timeSlot },
              ]
                .filter(row => !!row.text)
                .map(row => (
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

            {!!branch.phone && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() =>
                  Linking.openURL(`tel:${branch.phone.replace(/[\s-]/g, '')}`)
                }
                activeOpacity={0.82}
              >
                <Ionicons name="call-outline" size={18} color={Colors.white} />
                <AppText style={styles.primaryBtnText}>Call to Confirm</AppText>
              </TouchableOpacity>
            )}

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
              {branchLoading && !branches.length && (
                <View style={bkStyles.branchState}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}
              {branchError && !branches.length && (
                <TouchableOpacity
                  style={bkStyles.branchState}
                  onPress={loadBranches}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={18}
                    color={Colors.primary}
                  />
                  <AppText style={bkStyles.branchStateText}>
                    Couldn't load our stores. Tap to retry.
                  </AppText>
                </TouchableOpacity>
              )}
              {!branchLoading && !branchError && !branches.length && (
                <View style={bkStyles.branchState}>
                  <AppText style={bkStyles.branchStateText}>
                    No stores are listed right now.
                  </AppText>
                </View>
              )}
              {branches.map(b => {
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
                      {!!(b.address || b.phone) && (
                        <AppText style={bkStyles.branchAddress}>
                          {b.address || b.phone}
                        </AppText>
                      )}
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
              {!branch && (
                <AppText style={bkStyles.timeHint}>
                  Pick a store first to see its opening times.
                </AppText>
              )}
              {!!branch && !slots.length && (
                <AppText style={bkStyles.timeHint}>
                  No times left on this day — try another date.
                </AppText>
              )}
              <View style={bkStyles.timeGrid}>
                {slots.map(slot => {
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

  const acuityOk =
    acuityLeftPass >= ACUITY_PASS_MARK && acuityRightPass >= ACUITY_PASS_MARK;
  const colorOk = colorVision === 'normal';
  const astigmatismOk = astigmatism === 'equal';

  const results: { key: string; label: string; ok: boolean; detail: string }[] =
    [
      {
        key: 'acuity',
        label: 'Visual Acuity',
        ok: acuityOk,
        detail: `Left eye: ${
          acuityLeftPass >= ACUITY_PASS_MARK ? 'Good' : 'Needs attention'
        }. Right eye: ${
          acuityRightPass >= ACUITY_PASS_MARK ? 'Good' : 'Needs attention'
        }. ${
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
      acuityAnglesLeft: genAcuityAngles(),
      acuityAnglesRight: genAcuityAngles(),
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
    setStage('colorIntro');
  };

  const handleColorVisionDone = (result: ColorResult) => {
    setColorVision(result);
    setStage('astigmatismIntro');
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
    return <RefractionIntro onStart={() => setStage('acuityIntro')} />;
  if (stage === 'acuityIntro')
    return (
      <TestInstructions
        info={TEST_INFO.acuity}
        onStart={() => setStage('acuityLeftReady')}
      />
    );
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
        angles={testSet.acuityAnglesLeft}
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
        angles={testSet.acuityAnglesRight}
        onComplete={handleAcuityRightDone}
      />
    );
  if (stage === 'colorIntro')
    return (
      <TestInstructions
        info={TEST_INFO.color}
        onStart={() => setStage('colorVision')}
      />
    );
  if (stage === 'colorVision')
    return (
      <ColorVisionStep
        plates={testSet.cvPlates}
        onComplete={handleColorVisionDone}
      />
    );
  if (stage === 'astigmatismIntro')
    return (
      <TestInstructions
        info={TEST_INFO.astigmatism}
        onStart={() => setStage('astigmatismLeftReady')}
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
  const route = useRoute<RouteProp<RootStackParamList, 'Scan'>>();

  // The home screen sends the user straight into one experience, so there is
  // no picker here — the mode is fixed for the life of the screen.
  const mode: Tab = route.params?.mode ?? 'face';

  // Face scan and the eye test are both the user's own result to keep, so this
  // screen lifts the app-wide screenshot / screen-recording block while it is
  // focused. Everything outside these features stays blocked.
  useAllowScreenCapture();

  // The eye test is a self-screening tool, not a medical exam, so it stays
  // behind an explicit consent gate. Re-asked on every entry rather than
  // remembered — consent to a health disclaimer shouldn't be sticky.
  const [testConsent, setTestConsent] = useState(false);
  const [faceScanStage, setFaceScanStage] = useState<FaceScanStage>('idle');
  const [faceShape, setFaceShape] = useState<FaceShape | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<FaceMetrics | null>(null);
  const [debug, setDebug] = useState<FaceDebug | null>(null);
  // The analyzed frame, kept so the results sheet can show the user the photo
  // the recommendation was actually derived from.
  const [scanPhoto, setScanPhoto] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const isScanning =
    mode === 'face' &&
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
    photo: string | null,
  ) => {
    setFaceShape(shape);
    setConfidence(conf);
    setMetrics(m);
    setDebug(dbg);
    setScanPhoto(photo);
    // The scanner already holds on the result until the user taps Continue,
    // so this only needs long enough for the button press to register before
    // the camera closes and the recommendations sheet opens.
    setTimeout(() => {
      setFaceScanStage('idle');
      setSheetVisible(true);
    }, 180);
  };

  const handleSheetClose = () => {
    setSheetVisible(false);
    setFaceShape(null);
    setConfidence(null);
    setMetrics(null);
    setScanPhoto(null);
    setFaceScanStage('idle');
  };

  return (
    <View style={[styles.root, { paddingTop: isScanning ? 0 : insets.top }]}>
      {mode === 'face' ? (
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
              photo={scanPhoto}
              onClose={handleSheetClose}
            />
          )}
        </>
      ) : (
        <>
          <EyeTestDisclaimerModal
            visible={!testConsent}
            onAccept={() => setTestConsent(true)}
            onDecline={() => navigation.goBack()}
          />

          {/* Mounted only once consent is given, so the test cannot be
              started behind the dialog. */}
          {testConsent && <RefractionFlow />}
        </>
      )}
    </View>
  );
};

// ─── Face Scan Idle Styles ────────────────────────────────────────────────────

const idleStyles = StyleSheet.create({
  // Hero — dark HUD panel, deliberately off-palette so it reads as a live
  // viewport rather than another card.
  hero: {
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(95,233,255,0.18)',
    ...Shadow.lg,
  },
  glow: { position: 'absolute', left: '50%', borderRadius: 999 },
  glowTop: {
    width: 280,
    height: 280,
    top: -130,
    marginLeft: -140,
    backgroundColor: 'rgba(95,233,255,0.10)',
  },
  glowBottom: {
    width: 240,
    height: 240,
    bottom: -130,
    marginLeft: -120,
    backgroundColor: 'rgba(111,227,174,0.09)',
  },
  heroChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(95,233,255,0.28)',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5FE9FF',
  },
  chipText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  // Wireframe stage — the beam is clipped to this box.
  stage: {
    alignSelf: 'center',
    width: STAGE_W,
    height: STAGE_H,
    marginTop: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    top: (STAGE_H - RING_D) / 2,
    left: (STAGE_W - RING_D) / 2,
    width: RING_D,
    height: RING_D,
    borderRadius: RING_D / 2,
    borderWidth: 1,
    borderColor: 'rgba(95,233,255,0.5)',
  },
  face: {
    position: 'absolute',
    top: (STAGE_H - FACE_H) / 2,
    left: (STAGE_W - FACE_W) / 2,
  },
  reticle: {
    position: 'absolute',
    top: (STAGE_H - RETICLE_H) / 2,
    left: (STAGE_W - RETICLE_W) / 2,
    width: RETICLE_W,
    height: RETICLE_H,
  },
  beam: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
  beamFill: { flex: 1, borderRadius: 2 },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(95,233,255,0.75)',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },

  heroTitle: {
    alignSelf: 'stretch',
    marginTop: Spacing.md,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSub: {
    alignSelf: 'stretch',
    marginTop: 6,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.sm,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.66)',
    textAlign: 'center',
  },

  // Stat strip
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.glassSurface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },

  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },

  // Steps — a rail of badges joined by a hairline, so the three read as a
  // sequence rather than three loose rows.
  stepList: {
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  stepRow: { flexDirection: 'row', gap: Spacing.md },
  stepRail: { alignItems: 'center', width: 34 },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    width: 1.5,
    marginVertical: 4,
    borderRadius: 1,
    backgroundColor: Colors.divider,
  },
  stepBody: { flex: 1, paddingBottom: Spacing.md },
  stepTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
    marginTop: 6,
  },
  stepCopy: {
    marginTop: 2,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.gray600,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    ...Shadow.md,
  },
  ctaText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.2,
  },

  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  privacyText: {
    flexShrink: 1,
    fontSize: FontSize.xs,
    color: Colors.gray500,
    textAlign: 'center',
  },
});

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
  heroPhoto: {
    width: 56,
    height: 68,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray200,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  heroPhotoExpand: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: 'rgba(10,14,18,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  previewClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCaptionWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  previewCaption: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  previewHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    marginTop: 3,
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
    width: 58,
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

  // Answer picker (Landolt C acuity test) — a segmented ring, one wedge per
  // direction. The wedges themselves are drawn in SVG; these are the frame,
  // the centre hint, and the invisible touch targets laid over each wedge.
  pickerContainer: {
    width: PICKER_BOX,
    height: PICKER_BOX,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  pickerHint: {
    position: 'absolute',
    fontSize: 13,
    color: Colors.gray400,
  },
  pickerHit: {
    position: 'absolute',
    width: PICKER_HIT,
    height: PICKER_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Numbered badge in the per-test instruction list
  instructionStepNum: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
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
  branchState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  branchStateText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
  },
  timeHint: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },
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
