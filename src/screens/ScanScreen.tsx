import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
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
const SCREEN_WIDTH = Dimensions.get('window').width;
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import { useProductList } from '../hook/useProductList';
import type { Product } from '../types/glasses';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'face' | 'refraction';
type FaceScanStage = 'idle' | 'countdown' | 'scanning' | 'selecting';
type RefractionStage =
  | 'intro'
  | 'acuity'
  | 'contrast'
  | 'astigmatism'
  | 'colorVision'
  | 'nearVision'
  | 'visualField'
  | 'eyeMuscle'
  | 'pupil'
  | 'eyeHealth'
  | 'result';
type ContrastResult = 'good' | 'reduced' | 'poor';
type ColorResult = 'normal' | 'mild' | 'deficient';
type VisualFieldResult = 'full' | 'mild' | 'reduced';
type EyeMuscleResult = 'aligned' | 'misaligned';
type PupilResult = 'normal' | 'sensitive';
type FaceShape = 'Oval' | 'Round' | 'Square' | 'Heart' | 'Oblong';
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
      'Face is longer than it is wide, with a long straight cheek line.',
    frames: ['Wayfarer', 'Round', 'Oversized', 'Decorative'],
    tip: "Wider frames with depth add width and shorten the face's appearance.",
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

// Sloan optotypes — the standard letter set used on real acuity charts.
const SLOAN = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];
const randLetters = (count: number) => pick(SLOAN, count).join('  ');

type AcuityRow = { size: number; letters: string; label: string };

// Sizes/labels are fixed (they define the acuity line); only letters vary.
const ACUITY_SPEC = [
  { size: 36, count: 3, label: '20/200' },
  { size: 28, count: 4, label: '20/100' },
  { size: 22, count: 4, label: '20/70' },
  { size: 17, count: 5, label: '20/50' },
  { size: 13, count: 6, label: '20/40' },
];
const genAcuityRows = (): AcuityRow[] =>
  ACUITY_SPEC.map(s => ({
    size: s.size,
    label: s.label,
    letters: randLetters(s.count),
  }));

const NEAR_TEXTS = [
  'The quick brown fox jumps over the lazy dog while the bright autumn sun ' +
    'sets slowly behind the distant rolling hills near the quiet village.',
  'A journey of a thousand miles begins with a single step, and every small ' +
    'effort you make today gently shapes the person you become tomorrow.',
  'Reading clearly at a close distance is an everyday skill we rarely notice ' +
    'until a favourite book or a short message becomes harder to focus on.',
  'The five boxing wizards jump quickly over the lazy brown dog as the calm ' +
    'evening breeze carries the faint scent of fresh rain across the meadow.',
];
const genNearText = () => NEAR_TEXTS[randInt(NEAR_TEXTS.length)];

function computeRisk(
  acuityPassCount: number,
  astigmatism: 'equal' | 'unequal',
  nearVision: 'clear' | 'blurry',
  contrast: ContrastResult,
  colorVision: ColorResult,
  visualField: VisualFieldResult,
  eyeMuscle: EyeMuscleResult,
  pupil: PupilResult,
  healthRiskFactors: number,
): RiskLevel {
  let score = 0;
  if (acuityPassCount <= 1) score += 4;
  else if (acuityPassCount <= 3) score += 2;
  else if (acuityPassCount === 4) score += 1;
  if (astigmatism === 'unequal') score += 2;
  if (nearVision === 'blurry') score += 2;
  if (contrast === 'poor') score += 3;
  else if (contrast === 'reduced') score += 1;
  if (colorVision === 'deficient') score += 3;
  else if (colorVision === 'mild') score += 1;
  // ── Eye-health screening tests ──
  if (visualField === 'reduced') score += 3;
  else if (visualField === 'mild') score += 1;
  if (eyeMuscle === 'misaligned') score += 2;
  if (pupil === 'sensitive') score += 1;
  // Self-reported risk factors (family history, diabetes, etc.) nudge the
  // recommendation but are capped so they can't dominate the measured tests.
  score += Math.min(healthRiskFactors, 3);
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

// ─── Contrast Sensitivity Data ────────────────────────────────────────────────

type ContrastLevel = { opacity: number; letters: string; size: number };

const CONTRAST_OPACITIES = [1.0, 0.55, 0.28, 0.12];
const genContrastLevels = (): ContrastLevel[] =>
  CONTRAST_OPACITIES.map(opacity => ({
    opacity,
    size: 22,
    letters: randLetters(5),
  }));

// ─── Ishihara-style Plate Data & HTML Generator ───────────────────────────────

const CANT_SEE = "I can't see a number";
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
  '2', '3', '5', '6', '7', '8', '12', '15', '16',
  '26', '29', '42', '45', '57', '73', '74',
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
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
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
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
#overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}

/* Top brand chip */
.topbar{position:absolute;top:max(22px,env(safe-area-inset-top));left:0;right:0;display:flex;justify-content:center;z-index:6}
.topchip{display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:30px;background:rgba(20,16,14,0.45);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.14)}
.topchip .pulse{width:7px;height:7px;border-radius:50%;background:#6FE3AE;box-shadow:0 0 8px #2DBD7E;animation:blink 1.4s ease-in-out infinite}
.topchip span{color:rgba(255,255,255,0.92);font-size:12px;font-weight:600;letter-spacing:0.4px}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}

.oval-wrap{position:relative;width:280px;height:280px}

/* Dim everything outside the circle */
.guide-oval{
  width:280px;height:280px;border-radius:50%;position:absolute;inset:0;z-index:2;
  border:2px solid rgba(255,255,255,0.30);
  box-shadow:0 0 0 2000px rgba(10,8,7,0.60);
  transition:border-color .35s ease, box-shadow .35s ease;
}
.guide-oval.locked{
  border-color:rgba(45,189,126,0.55);
  box-shadow:0 0 0 2000px rgba(10,8,7,0.60), inset 0 0 36px rgba(45,189,126,0.22), 0 0 30px rgba(45,189,126,0.45);
}
/* Expanding pulse ring on lock */
.guide-oval::after{content:'';position:absolute;inset:-2px;border-radius:50%;border:2px solid rgba(45,189,126,0.7);opacity:0;pointer-events:none}
.guide-oval.locked::after{animation:pulsering 1.7s ease-out infinite}
@keyframes pulsering{0%{transform:scale(1);opacity:.7}70%{transform:scale(1.12);opacity:0}100%{opacity:0}}

/* iOS-style circular progress ring — fills around the circle as it scans */
.ring-progress{position:absolute;top:-11px;left:-11px;z-index:3;transform:rotate(-90deg);pointer-events:none}
.ring-track{fill:none;stroke:rgba(255,255,255,0.16);stroke-width:5}
.ring-bar{fill:none;stroke:${Colors.primary};stroke-width:5;stroke-linecap:round;filter:drop-shadow(0 0 6px ${Colors.primaryGlow});transition:stroke-dashoffset .2s ease}

#hint{
  position:relative;z-index:6;
  margin-top:34px;display:inline-flex;align-items:center;
  background:rgba(20,16,14,0.78);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  color:#fff;font-size:14px;font-weight:600;
  padding:10px 22px;border-radius:30px;border:1px solid rgba(255,255,255,0.16);
  letter-spacing:0.2px;transition:background .3s,border-color .3s
}
#hint.success{background:rgba(45,189,126,0.85);border-color:rgba(255,255,255,0.25)}
#hint.warn{background:rgba(244,168,48,0.90);border-color:rgba(255,255,255,0.25)}

/* Stage indicator */
.stages{position:relative;z-index:6;margin-top:18px;display:flex;gap:9px}
.stage-dot{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);transition:all .3s ease}
.stage-dot .ic{width:15px;height:15px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;transition:all .3s ease}
.stage-dot span{color:rgba(255,255,255,0.6);font-size:11px;font-weight:600;letter-spacing:0.3px}
.stage-dot.active{background:rgba(45,189,126,0.18);border-color:rgba(45,189,126,0.6)}
.stage-dot.active .ic{border-color:#2DBD7E;box-shadow:0 0 8px rgba(45,189,126,0.55)}
.stage-dot.active span{color:#9affc9}
.stage-dot.done{background:rgba(45,189,126,0.92);border-color:rgba(45,189,126,0.92)}
.stage-dot.done .ic{background:#fff;border-color:#fff;color:#2DBD7E}
.stage-dot.done span{color:#fff}

#loading{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  color:rgba(255,255,255,.78);font-size:14px;text-align:center;line-height:2
}
.spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,.15);border-top-color:${Colors.primaryMid};border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 10px}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<video id="video" autoplay playsinline muted></video>
<div id="overlay">
  <div class="topbar"><div class="topchip"><span class="pulse"></span><span>AI Face Analysis</span></div></div>
  <div class="oval-wrap">
    <div class="guide-oval" id="oval"></div>
    <svg class="ring-progress" width="302" height="302" viewBox="0 0 302 302">
      <circle class="ring-track" cx="151" cy="151" r="144"></circle>
      <circle class="ring-bar" id="ring" cx="151" cy="151" r="144"></circle>
    </svg>
  </div>
  <div id="hint">Position your face in the circle</div>
  <div class="stages">
    <div class="stage-dot" data-i="0"><span class="ic"></span><span>Front</span></div>
    <div class="stage-dot" data-i="1"><span class="ic"></span><span>Left</span></div>
    <div class="stage-dot" data-i="2"><span class="ic"></span><span>Right</span></div>
  </div>
</div>
<div id="loading"><div class="spinner"></div>Starting camera…</div>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js" crossorigin="anonymous"></script>
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

var oval=document.getElementById('oval'),hint=document.getElementById('hint'),ring=document.getElementById('ring');
var RING_C=2*Math.PI*144;
ring.style.strokeDasharray=RING_C;
ring.style.strokeDashoffset=RING_C;
function setRing(pct){ring.style.strokeDashoffset=RING_C*(1-pct/100);}
var stageEls=[].slice.call(document.querySelectorAll('.stage-dot'));
function setStages(){
  for(var i=0;i<stageEls.length;i++){
    var el=stageEls[i],ic=el.querySelector('.ic');
    el.classList.remove('active','done');
    if(i<stageIdx){el.classList.add('done');if(ic)ic.textContent='✓';}
    else{if(ic)ic.textContent='';if(i===stageIdx)el.classList.add('active');}
  }
}

// ── Multi-angle capture flow: look straight, then turn left, then right ──────
var STAGES=['front','left','right'];
var stageIdx=0,stableFrames=0,done=false,capturedShape=null;
// Frames to hold per stage. Front/straight is intentionally longer so the
// shape capture isn't rushed; the side turns stay quick.
var NEEDED_BY={front:44,left:22,right:22};
function NEEDED(){return NEEDED_BY[STAGES[stageIdx]]||22;}
// Detection stays paused until RN "arms" it (after the 3-2-1 countdown), so the
// camera can warm up behind the countdown overlay without capturing anything.
var armed=false;
window.armScan=function(){armed=true;};
var frontShapes=[];        // shape samples collected during the front stage
var MIRROR=true;           // front-camera preview is mirrored
var FRONT_MAX=0.10;        // max yaw to count as "looking straight"
var TURN=0.16;             // yaw magnitude to count as a head turn

// ── Landmark helpers ────────────────────────────────────────────────────────
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}

// ── Face shape from landmarks ───────────────────────────────────────────────
// Landmark coords are normalized 0..1 separately by frame width and height, so
// a width/height ratio is distorted unless we convert back to real pixels using
// the actual video dimensions. Otherwise every face collapses to one shape.
function computeShape(lm){
  var W=(video&&video.videoWidth)||640, H=(video&&video.videoHeight)||480;
  function pd(a,b){var dx=(a.x-b.x)*W,dy=(a.y-b.y)*H;return Math.sqrt(dx*dx+dy*dy);}
  var faceH=pd(lm[10],lm[152]),faceW=pd(lm[234],lm[454]);
  var jawW=pd(lm[172],lm[397]),fhW=pd(lm[54],lm[284]);
  if(faceH<1)return null;
  var whr=faceW/faceH,jawRatio=jawW/faceW,fhRatio=fhW/faceW;
  if(whr>0.88&&jawRatio>0.82)return 'Square';
  if(whr>0.83)return 'Round';
  if(whr<0.66)return 'Oblong';
  if(fhRatio>jawRatio+0.10)return 'Heart';
  return 'Oval';
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

function setProgress(){
  var per=100/STAGES.length;
  var pct=Math.round(per*stageIdx + per*Math.min(1,stableFrames/NEEDED()));
  setRing(pct);
  setStages();
}

// ── MediaPipe face mesh ──────────────────────────────────────────────────────
var faceMesh=new FaceMesh({locateFile:function(f){return'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/'+f;}});
faceMesh.setOptions({maxNumFaces:1,refineLandmarks:false,minDetectionConfidence:0.55,minTrackingConfidence:0.55});

faceMesh.onResults(function(results){
  if(done||!armed)return;
  var lms=results.multiFaceLandmarks;

  // ── No face detected ──
  if(!lms||!lms[0]){
    stableFrames=Math.max(0,stableFrames-3);
    oval.className='guide-oval';
    hint.className='';
    hint.textContent='Position your face in the circle';
    setProgress();
    return;
  }

  var lm=lms[0];
  var sz=faceSize(lm);

  // ── Distance checks (apply to every stage) ──
  if(sz<0.16){
    stableFrames=Math.max(0,stableFrames-2);
    oval.className='guide-oval';hint.className='warn';
    hint.textContent='Move closer';setProgress();return;
  }
  if(sz>0.80){
    stableFrames=Math.max(0,stableFrames-2);
    oval.className='guide-oval';hint.className='warn';
    hint.textContent='Move farther away';setProgress();return;
  }

  var yaw=yawOf(lm);
  var stage=STAGES[stageIdx];
  var ok=false,msg='';

  if(stage==='front'){
    if(!centeredEnough(lm)) msg='Center your face in the circle';
    else if(Math.abs(yaw)>FRONT_MAX) msg='Look straight at the camera';
    else {ok=true;msg='Hold still…';}
  } else if(stage==='left'){
    ok=yaw<-TURN;
    msg=ok?'Hold…':'Slowly turn your head LEFT';
  } else {
    ok=yaw>TURN;
    msg=ok?'Hold…':'Slowly turn your head RIGHT';
  }

  if(ok){
    stableFrames++;
    if(stage==='front'){var s=computeShape(lm);if(s)frontShapes.push(s);}
    oval.className='guide-oval locked';
    hint.className='success';
    var pct=Math.min(100,Math.round(stableFrames/NEEDED()*100));
    hint.textContent=msg+' '+pct+'%';
  } else {
    stableFrames=Math.max(0,stableFrames-1);
    oval.className='guide-oval';
    hint.className='warn';
    hint.textContent=msg;
  }
  setProgress();

  // ── Stage complete ──
  if(stableFrames>=NEEDED()){
    if(stage==='front') capturedShape=modeOf(frontShapes)||computeShape(lm)||'Oval';
    stageIdx++;
    stableFrames=0;
    if(stageIdx>=STAGES.length){
      done=true;
      oval.className='guide-oval locked';
      hint.className='success';
      hint.textContent='Scan complete!';
      setRing(100);
      setStages();
      post({type:'faceShape',shape:capturedShape||'Oval'});
    } else {
      hint.className='success';
      hint.textContent=stageIdx===1?'Great! Now turn your head LEFT':'Now turn your head RIGHT';
    }
  }
});

// ── Start camera ─────────────────────────────────────────────────────────────
var video=document.getElementById('video');
var cam=new Camera(video,{
  onFrame:async function(){await faceMesh.send({image:video});},
  width:640,height:480,facingMode:'user'
});
setStages();
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
      <Text style={cdStyles.heading}>Get ready</Text>
      <Animated.View
        style={[
          cdStyles.ring,
          { opacity, transform: [{ scale }] },
          !isNumber && cdStyles.ringText,
        ]}
      >
        <Text style={isNumber ? cdStyles.number : cdStyles.readyText}>
          {value}
        </Text>
      </Animated.View>
      <Text style={cdStyles.sub}>
        Hold your phone at eye level and look straight ahead.
      </Text>
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
    borderRadius: 90,
    borderWidth: 3,
    borderColor: 'rgba(45,189,126,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,189,126,0.10)',
  },
  ringText: {
    width: 230,
    height: 230,
    borderRadius: 115,
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
  onShapeDetected: (shape: FaceShape) => void;
  onCameraError: () => void;
  onCancel: () => void;
}> = ({ armed, onShapeDetected, onCameraError, onCancel }) => {
  const webViewRef = useRef<WebView>(null);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const d = JSON.parse(e.nativeEvent.data);
        if (d.type === 'faceShape' && d.shape) {
          onShapeDetected(d.shape as FaceShape);
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
      webViewRef.current?.injectJavaScript('window.armScan&&window.armScan();true;');
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
        onMessage={onMessage}
      />
      <SafeAreaView style={styles.cancelArea} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color={Colors.gray600} />
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
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSub}>{subtitle}</Text>
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
          <Text style={scanStyles.shapeName}>{shape}</Text>
          <Text style={scanStyles.shapeDesc} numberOfLines={2}>
            {info.description}
          </Text>
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
      <Text style={styles.outlineBtnText}>Go Back</Text>
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
          <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
            {tab.label}
          </Text>
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
      <Text style={styles.heroTitle}>Face Shape Scan</Text>
      <Text style={styles.heroSub}>
        We'll analyse your face shape using your front camera and recommend the
        perfect frames for you.
      </Text>
    </View>

    {[
      { n: '1', text: 'Find good lighting and hold your phone at eye level.' },
      {
        n: '2',
        text: 'Position your face inside the circle and look straight ahead.',
      },
      {
        n: '3',
        text: 'Follow the prompts to slowly turn your head left, then right.',
      },
    ].map(step => (
      <View key={step.n} style={styles.stepRow}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepNum}>{step.n}</Text>
        </View>
        <Text style={styles.stepText}>{step.text}</Text>
      </View>
    ))}

    <TouchableOpacity
      style={styles.primaryBtn}
      onPress={onStart}
      activeOpacity={0.82}
    >
      <Ionicons name="scan-outline" size={20} color={Colors.white} />
      <Text style={styles.primaryBtnText}>Start Scan</Text>
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
        <Text style={prStyles.emptyText}>
          No matching frames available right now.
        </Text>
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
            <Text style={prStyles.name} numberOfLines={1}>
              {p.name}
            </Text>
            {p.brand?.name ? (
              <Text style={prStyles.brand}>{p.brand.name}</Text>
            ) : null}
            <View style={prStyles.reasonRow}>
              <Ionicons
                name="sparkles-outline"
                size={12}
                color={Colors.primary}
              />
              <Text style={prStyles.reason} numberOfLines={2}>
                {reasonFor(p)}
              </Text>
            </View>
            <Text style={prStyles.price}>${p.price}</Text>
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
  onClose: () => void;
}> = ({ visible, shape, onClose }) => {
  const navigation = useNavigation<any>();
  const info = FACE_SHAPE_INFO[shape];
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

        {/* Header */}
        <View style={gsStyles.header}>
          <View style={gsStyles.headerLeft}>
            <View style={gsStyles.shapeIconSmall}>
              <Ionicons
                name={info.icon as any}
                size={18}
                color={Colors.primary}
              />
            </View>
            <View>
              <Text style={gsStyles.headerOverline}>Your face shape</Text>
              <Text style={gsStyles.headerShape}>{shape}</Text>
            </View>
          </View>
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
          {/* Face insight — description + frame tip combined */}
          <View style={gsStyles.insightCard}>
            <Text style={gsStyles.insightDesc}>{info.description}</Text>
            <View style={gsStyles.insightDivider} />
            <View style={gsStyles.insightTipRow}>
              <Ionicons name="bulb" size={15} color={Colors.primary} />
              <Text style={gsStyles.insightTip}>{info.tip}</Text>
            </View>
          </View>

          {/* Recommended products — the focal point */}
          <View style={gsStyles.recHeader}>
            <View style={gsStyles.recBadge}>
              <Ionicons name="sparkles" size={14} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={gsStyles.recTitle}>Picked For You</Text>
              <Text style={gsStyles.recSub}>
                Frames that flatter your {shape.toLowerCase()} face
              </Text>
            </View>
          </View>
          <ProductRecommendations
            shape={shape}
            recommendedFrames={info.frames}
            mode="face"
            hairStyle={null}
            onPickProduct={id => {
              onClose();
              navigation.navigate('GlassDetail', { id });
            }}
          />

          {/* CTAs */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onClose}
            activeOpacity={0.82}
          >
            <Ionicons name="refresh-outline" size={19} color={Colors.white} />
            <Text style={styles.primaryBtnText}>Scan Again</Text>
          </TouchableOpacity>

          <View style={gsStyles.footerNote}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={Colors.gray400}
            />
            <Text style={gsStyles.footerNoteText}>
              Frame recommendations are based on your face shape analysis and
              are indicative only. Visit an M Optic store to try on frames in
              person.
            </Text>
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
      <Text style={styles.heroTitle}>Eye Refraction Test</Text>
      <Text style={styles.heroSub}>
        A comprehensive 9-step screening to help identify potential refractive
        errors, contrast and colour issues, and other eye-health risk factors.
      </Text>
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { marginTop: Spacing.md, alignSelf: 'stretch' },
        ]}
        onPress={onStart}
        activeOpacity={0.82}
      >
        <Ionicons name="play-outline" size={20} color={Colors.white} />
        <Text style={styles.primaryBtnText}>Begin Test</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.sectionLabel}>What we'll test</Text>
    {[
      {
        icon: 'text-outline',
        title: 'Distance Vision',
        desc: 'Read rows of letters at decreasing sizes to check visual acuity.',
      },
      {
        icon: 'contrast-outline',
        title: 'Contrast Sensitivity',
        desc: 'Identify fading letters to detect contrast perception issues.',
      },
      {
        icon: 'radio-button-off-outline',
        title: 'Astigmatism Check',
        desc: 'View a radial pattern to detect uneven focus in the eye.',
      },
      {
        icon: 'color-palette-outline',
        title: 'Colour Vision',
        desc: 'Identify numbers hidden in coloured dot plates (Ishihara-style).',
      },
      {
        icon: 'book-outline',
        title: 'Near Vision',
        desc: 'Read a short paragraph to assess your close-up focus.',
      },
      {
        icon: 'scan-outline',
        title: 'Visual Field',
        desc: 'Tap dots that flash in your side vision to check peripheral awareness.',
      },
      {
        icon: 'git-compare-outline',
        title: 'Eye Alignment',
        desc: 'Follow a moving dot to check eye-muscle coordination.',
      },
      {
        icon: 'flash-outline',
        title: 'Light Response',
        desc: 'A brief flash to gauge how comfortably your eyes adjust to light.',
      },
      {
        icon: 'heart-outline',
        title: 'Eye Health',
        desc: 'A few questions on risk factors for pressure and retinal health.',
      },
    ].map(item => (
      <View key={item.title} style={styles.featureRow}>
        <View style={styles.featureIconBox}>
          <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.featureTitle}>{item.title}</Text>
          <Text style={styles.featureDesc}>{item.desc}</Text>
        </View>
      </View>
    ))}

    <View style={styles.disclaimerCard}>
      <Ionicons
        name="information-circle-outline"
        size={16}
        color={Colors.gray400}
      />
      <Text style={styles.disclaimerText}>
        This is a preliminary screening only and does not replace a professional
        eye examination by a qualified optometrist.
      </Text>
    </View>
  </ScrollView>
);

// ─── Refraction — Step 1: Visual Acuity ──────────────────────────────────────

const AcuityStep: React.FC<{
  rows: AcuityRow[];
  onComplete: (passCount: number) => void;
}> = ({ rows, onComplete }) => {
  const [rowIndex, setRowIndex] = useState(0);
  const [passCount, setPassCount] = useState(0);

  const handleAnswer = (canRead: boolean) => {
    const newCount = canRead ? passCount + 1 : passCount;
    if (rowIndex + 1 >= rows.length) {
      onComplete(newCount);
    } else {
      setPassCount(newCount);
      setRowIndex(prev => prev + 1);
    }
  };

  const row = rows[rowIndex];
  const progress = (rowIndex / rows.length) * 100;

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>Step 1 of 9 — Distance Vision</Text>
        <Text style={styles.stepCounterRight}>
          Row {rowIndex + 1}/{rows.length}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.acuityCard}>
        <Text style={styles.acuityInstruction}>
          Look at the letters below from normal reading distance.
        </Text>
        <View style={styles.acuityLetterBox}>
          <Text style={[styles.acuityLetters, { fontSize: row.size }]}>
            {row.letters}
          </Text>
          <Text style={styles.acuityLabel}>{row.label} line</Text>
        </View>
        <Text style={styles.acuityQuestion}>
          Can you read these letters clearly without squinting?
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => handleAnswer(true)}
        activeOpacity={0.82}
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={20}
          color={Colors.white}
        />
        <Text style={styles.primaryBtnText}>Yes, clearly</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
        onPress={() => handleAnswer(false)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="close-circle-outline"
          size={18}
          color={Colors.gray600}
        />
        <Text style={[styles.outlineBtnText, { color: Colors.gray600 }]}>
          Blurry / Hard to read
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Refraction — Step 2: Astigmatism ────────────────────────────────────────

const AstigmatismStep: React.FC<{
  onComplete: (result: 'equal' | 'unequal') => void;
}> = ({ onComplete }) => (
  <ScrollView
    contentContainerStyle={styles.contentPad}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.stepHeader}>
      <Text style={styles.stepCounter}>Step 3 of 9 — Astigmatism Check</Text>
    </View>
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: '33%' }]} />
    </View>

    <View style={styles.acuityCard}>
      <Text style={styles.acuityInstruction}>
        Look at the center dot of the pattern below. Keep your eyes relaxed.
      </Text>

      {/* Radial fan rendered with rotated views */}
      <View style={rfStyles.wheelContainer}>
        {Array.from({ length: 18 }, (_, i) => (
          <View
            key={i}
            style={[
              rfStyles.wheelSpoke,
              { transform: [{ rotate: `${i * 10}deg` }] },
            ]}
          />
        ))}
        <View style={rfStyles.wheelDot} />
      </View>

      <Text style={styles.acuityQuestion}>
        Do all the lines appear equally dark and the same thickness?
      </Text>
    </View>

    <TouchableOpacity
      style={styles.primaryBtn}
      onPress={() => onComplete('equal')}
      activeOpacity={0.82}
    >
      <Ionicons
        name="checkmark-circle-outline"
        size={20}
        color={Colors.white}
      />
      <Text style={styles.primaryBtnText}>Yes, all lines look equal</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
      onPress={() => onComplete('unequal')}
      activeOpacity={0.8}
    >
      <Ionicons name="close-circle-outline" size={18} color={Colors.gray600} />
      <Text style={[styles.outlineBtnText, { color: Colors.gray600 }]}>
        Some lines look darker / thicker
      </Text>
    </TouchableOpacity>
  </ScrollView>
);

// ─── Refraction — Step 3: Near Vision ────────────────────────────────────────

const NearVisionStep: React.FC<{
  text: string;
  onComplete: (result: 'clear' | 'blurry') => void;
}> = ({ text, onComplete }) => (
  <ScrollView
    contentContainerStyle={styles.contentPad}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.stepHeader}>
      <Text style={styles.stepCounter}>Step 5 of 9 — Near Vision</Text>
    </View>
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: '78%' }]} />
    </View>

    <View style={styles.acuityCard}>
      <Text style={styles.acuityInstruction}>
        Hold your phone at a comfortable reading distance (~30 cm). Do not move
        the phone closer.
      </Text>
      <View style={rfStyles.nearTextBox}>
        <Text style={rfStyles.nearText}>{text}</Text>
      </View>
      <Text style={styles.acuityQuestion}>
        Can you read the paragraph above clearly without straining?
      </Text>
    </View>

    <TouchableOpacity
      style={styles.primaryBtn}
      onPress={() => onComplete('clear')}
      activeOpacity={0.82}
    >
      <Ionicons
        name="checkmark-circle-outline"
        size={20}
        color={Colors.white}
      />
      <Text style={styles.primaryBtnText}>Yes, clearly</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
      onPress={() => onComplete('blurry')}
      activeOpacity={0.8}
    >
      <Ionicons name="close-circle-outline" size={18} color={Colors.gray600} />
      <Text style={[styles.outlineBtnText, { color: Colors.gray600 }]}>
        Blurry / I had to bring it closer
      </Text>
    </TouchableOpacity>
  </ScrollView>
);

// ─── Refraction — Step 2: Contrast Sensitivity ───────────────────────────────

const ContrastStep: React.FC<{
  levels: ContrastLevel[];
  onComplete: (result: ContrastResult) => void;
}> = ({ levels, onComplete }) => {
  const [levelIndex, setLevelIndex] = useState(0);

  const handleAnswer = (canRead: boolean) => {
    if (!canRead) {
      if (levelIndex === 0) onComplete('poor');
      else if (levelIndex <= 2) onComplete('reduced');
      else onComplete('good');
      return;
    }
    if (levelIndex + 1 >= levels.length) {
      onComplete('good');
    } else {
      setLevelIndex(prev => prev + 1);
    }
  };

  const level = levels[levelIndex];
  const progress = (levelIndex / levels.length) * 100;

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>
          Step 2 of 9 — Contrast Sensitivity
        </Text>
        <Text style={styles.stepCounterRight}>
          Level {levelIndex + 1}/{levels.length}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.acuityCard}>
        <Text style={styles.acuityInstruction}>
          Letters will progressively fade. Read them at arm's length without
          squinting or adjusting the screen brightness.
        </Text>
        <View style={styles.acuityLetterBox}>
          <Text
            style={[
              styles.acuityLetters,
              { fontSize: level.size, opacity: level.opacity },
            ]}
          >
            {level.letters}
          </Text>
          <Text style={styles.acuityLabel}>
            Contrast level {levelIndex + 1}
          </Text>
        </View>
        <Text style={styles.acuityQuestion}>
          Can you clearly read all the letters above?
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => handleAnswer(true)}
        activeOpacity={0.82}
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={20}
          color={Colors.white}
        />
        <Text style={styles.primaryBtnText}>Yes, I can read them</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
        onPress={() => handleAnswer(false)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="close-circle-outline"
          size={18}
          color={Colors.gray600}
        />
        <Text style={[styles.outlineBtnText, { color: Colors.gray600 }]}>
          Too faint / Hard to see
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Refraction — Step 4: Colour Vision ──────────────────────────────────────

const ColorVisionStep: React.FC<{
  plates: CvPlate[];
  onComplete: (result: ColorResult) => void;
}> = ({ plates, onComplete }) => {
  const [plateIndex, setPlateIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const plate = plates[plateIndex];

  const handleAnswer = (answer: string) => {
    const isCorrect = answer === plate.correct;
    const newCorrect = isCorrect ? correctCount + 1 : correctCount;

    if (plateIndex + 1 >= plates.length) {
      if (newCorrect === plates.length) onComplete('normal');
      else if (newCorrect >= 1) onComplete('mild');
      else onComplete('deficient');
    } else {
      setCorrectCount(newCorrect);
      setPlateIndex(prev => prev + 1);
    }
  };

  const progress = (plateIndex / plates.length) * 100;

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>Step 4 of 9 — Colour Vision</Text>
        <Text style={styles.stepCounterRight}>
          Plate {plateIndex + 1}/{plates.length}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={[styles.acuityCard, { paddingBottom: Spacing.md }]}>
        <Text style={styles.acuityInstruction}>{plate.hint}</Text>

        <View style={rfStyles.plateContainer}>
          <WebView
            source={{ html: makeIshiharaHtml(plate.number) }}
            style={rfStyles.plateWebView}
            scrollEnabled={false}
            javaScriptEnabled
            originWhitelist={['*']}
          />
        </View>

        <Text style={styles.acuityQuestion}>{plate.question}</Text>
      </View>

      {plate.options.map(opt => {
        const isNone = opt === "I can't see a number";
        return (
          <TouchableOpacity
            key={opt}
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
            <Text
              style={[
                styles.outlineBtnText,
                isNone && { color: Colors.gray500 },
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}

      <View style={rfStyles.footerNote}>
        <Ionicons
          name="information-circle-outline"
          size={13}
          color={Colors.gray400}
        />
        <Text style={rfStyles.footerNoteText}>
          This is a self-reported screening. Results may vary with screen
          brightness and ambient lighting.
        </Text>
      </View>
    </ScrollView>
  );
};

// ─── Refraction — Step 6: Visual Field (peripheral awareness) ────────────────
// Dots flash in the periphery while the user fixates on a centre point. Missed
// dots hint at blind spots. Touch-based — not a clinical perimetry test.

const VF_ROUNDS = 8;
const VF_DOT = 34;
const VF_PLAY_W = SCREEN_WIDTH - Spacing.lg * 2;
const VF_PLAY_H = 400;

const VisualFieldStep: React.FC<{
  onComplete: (result: VisualFieldResult) => void;
}> = ({ onComplete }) => {
  const [started, setStarted] = useState(false);
  const [shown, setShown] = useState(0);
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const caughtRef = useRef(0);
  const roundRef = useRef(0);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    const ratio = caughtRef.current / VF_ROUNDS;
    onComplete(ratio >= 0.85 ? 'full' : ratio >= 0.6 ? 'mild' : 'reduced');
  }, [onComplete]);

  const scheduleNext = useCallback(() => {
    if (roundRef.current >= VF_ROUNDS) {
      finish();
      return;
    }
    roundRef.current += 1;
    setShown(roundRef.current);
    // Short blank gap, then flash a dot somewhere in the peripheral ring.
    showTimer.current = setTimeout(() => {
      const cx = VF_PLAY_W / 2;
      const cy = VF_PLAY_H / 2;
      const ang = Math.random() * Math.PI * 2;
      const rad =
        (0.55 + Math.random() * 0.4) * (Math.min(VF_PLAY_W, VF_PLAY_H) / 2);
      const x = Math.max(
        4,
        Math.min(VF_PLAY_W - VF_DOT - 4, cx + Math.cos(ang) * rad - VF_DOT / 2),
      );
      const y = Math.max(
        4,
        Math.min(VF_PLAY_H - VF_DOT - 4, cy + Math.sin(ang) * rad - VF_DOT / 2),
      );
      setDot({ x, y });
      missTimer.current = setTimeout(() => {
        setDot(null);
        scheduleNext();
      }, 1100);
    }, 500 + Math.random() * 800);
  }, [finish]);

  const handleHit = () => {
    if (missTimer.current) clearTimeout(missTimer.current);
    caughtRef.current += 1;
    setDot(null);
    scheduleNext();
  };

  const start = () => {
    setStarted(true);
    scheduleNext();
  };

  useEffect(
    () => () => {
      if (missTimer.current) clearTimeout(missTimer.current);
      if (showTimer.current) clearTimeout(showTimer.current);
    },
    [],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>Step 6 of 9 — Visual Field</Text>
        {started && (
          <Text style={styles.stepCounterRight}>
            {Math.min(shown, VF_ROUNDS)}/{VF_ROUNDS}
          </Text>
        )}
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: started ? `${(shown / VF_ROUNDS) * 100}%` : '0%' },
          ]}
        />
      </View>

      <Text style={styles.acuityInstruction}>
        Keep your eyes fixed on the centre dot and hold the phone steady. Tap each
        green dot the instant it appears in your side vision — try not to move your
        eyes.
      </Text>

      <View style={etStyles.vfPlay}>
        <View style={etStyles.vfFixation} />
        {!started && (
          <TouchableOpacity
            style={etStyles.vfStartOverlay}
            onPress={start}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle" size={56} color={Colors.primary} />
            <Text style={etStyles.vfStartText}>Tap to start</Text>
          </TouchableOpacity>
        )}
        {dot && (
          <TouchableOpacity
            style={[etStyles.vfTarget, { left: dot.x, top: dot.y }]}
            onPress={handleHit}
            activeOpacity={0.7}
          />
        )}
      </View>

      <View style={rfStyles.footerNote}>
        <Ionicons
          name="information-circle-outline"
          size={13}
          color={Colors.gray400}
        />
        <Text style={rfStyles.footerNoteText}>
          A simple peripheral-awareness check. Missed dots may indicate blind
          spots but can also result from distraction — it does not replace a
          clinical visual-field exam.
        </Text>
      </View>
    </ScrollView>
  );
};

// ─── Refraction — Step 7: Eye Muscle & Alignment (follow-the-dot) ─────────────
// A target traces an H/cross/diagonal path (a classic ocular-motility pattern).
// The user follows with their eyes, then self-reports any doubling or jumping.

const EM_R = 11; // dot radius
const EM_PAD = 34;
const EM_W = SCREEN_WIDTH - Spacing.lg * 2;
const EM_H = 320;

const EyeMuscleStep: React.FC<{
  onComplete: (result: EyeMuscleResult) => void;
}> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'ready' | 'running' | 'answer'>('ready');
  const pos = useRef(
    new Animated.ValueXY({ x: EM_W / 2 - EM_R, y: EM_H / 2 - EM_R }),
  ).current;

  const run = () => {
    setPhase('running');
    const cX = EM_W / 2;
    const cY = EM_H / 2;
    const lX = EM_PAD;
    const rX = EM_W - EM_PAD;
    const tY = EM_PAD;
    const bY = EM_H - EM_PAD;
    pos.setValue({ x: cX - EM_R, y: cY - EM_R });
    const to = (x: number, y: number, d = 850) =>
      Animated.timing(pos, {
        toValue: { x: x - EM_R, y: y - EM_R },
        duration: d,
        useNativeDriver: true,
      });
    Animated.sequence([
      to(lX, cY),
      to(rX, cY),
      to(cX, cY),
      to(cX, tY),
      to(cX, bY),
      to(cX, cY),
      to(lX, tY),
      to(rX, bY),
      to(lX, bY),
      to(rX, tY),
      to(cX, cY, 650),
    ]).start(({ finished }) => {
      if (finished) setPhase('answer');
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>Step 7 of 9 — Eye Alignment</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: '70%' }]} />
      </View>

      <Text style={styles.acuityInstruction}>
        Hold your head still and follow the moving dot with your eyes only. Watch
        whether it ever splits into two, jumps, or one eye struggles to keep up.
      </Text>

      <View style={etStyles.emPlay}>
        <Animated.View
          style={[
            etStyles.emDot,
            { transform: [{ translateX: pos.x }, { translateY: pos.y }] },
          ]}
        />
        {phase === 'ready' && (
          <TouchableOpacity
            style={etStyles.vfStartOverlay}
            onPress={run}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle" size={56} color={Colors.primary} />
            <Text style={etStyles.vfStartText}>Start tracking</Text>
          </TouchableOpacity>
        )}
      </View>

      {phase === 'running' && (
        <Text style={styles.acuityQuestion}>Follow the dot…</Text>
      )}

      {phase === 'answer' && (
        <>
          <Text style={styles.acuityQuestion}>
            Did the dot stay single and move smoothly the whole time?
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: Spacing.md }]}
            onPress={() => onComplete('aligned')}
            activeOpacity={0.82}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={Colors.white}
            />
            <Text style={styles.primaryBtnText}>Yes, single and smooth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
            onPress={() => onComplete('misaligned')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color={Colors.gray600}
            />
            <Text style={[styles.outlineBtnText, { color: Colors.gray600 }]}>
              It doubled / jumped / one eye lagged
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
            onPress={run}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={17} color={Colors.primary} />
            <Text style={styles.outlineBtnText}>Replay</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

// ─── Refraction — Step 8: Light Response (pupil / photophobia screen) ─────────
// Phone cameras can't reliably measure pupil constriction, so this is framed as
// a light-sensitivity self-report: the panel flashes bright, then the user
// reports any pain or lingering afterimage.

const PupilResponseStep: React.FC<{
  onComplete: (result: PupilResult) => void;
}> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'ready' | 'running' | 'answer'>('ready');
  const bright = useRef(new Animated.Value(0)).current;

  const run = () => {
    setPhase('running');
    bright.setValue(0);
    const flash = () =>
      Animated.sequence([
        Animated.timing(bright, {
          toValue: 1,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.delay(1200),
        Animated.timing(bright, {
          toValue: 0,
          duration: 650,
          useNativeDriver: false,
        }),
        Animated.delay(600),
      ]);
    Animated.sequence([Animated.delay(500), flash(), flash()]).start(
      ({ finished }) => {
        if (finished) setPhase('answer');
      },
    );
  };

  const bg = bright.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0b0b0d', '#ffffff'],
  });

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>Step 8 of 9 — Light Response</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: '85%' }]} />
      </View>

      <Text style={styles.acuityInstruction}>
        Best done in a dim room. Look at the panel below and keep both eyes open —
        it will flash bright twice. Notice how your eyes feel as the light changes.
      </Text>

      <Animated.View style={[etStyles.ppPanel, { backgroundColor: bg }]}>
        {phase === 'ready' && (
          <TouchableOpacity
            style={etStyles.vfStartOverlay}
            onPress={run}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={48} color={Colors.primary} />
            <Text style={etStyles.vfStartText}>Start light test</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {phase === 'answer' && (
        <>
          <Text style={styles.acuityQuestion}>
            When the screen flashed bright, did your eyes adjust comfortably?
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: Spacing.md }]}
            onPress={() => onComplete('normal')}
            activeOpacity={0.82}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={Colors.white}
            />
            <Text style={styles.primaryBtnText}>Yes, adjusted comfortably</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
            onPress={() => onComplete('sensitive')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color={Colors.gray600}
            />
            <Text style={[styles.outlineBtnText, { color: Colors.gray600 }]}>
              It was painful / left an afterimage
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
            onPress={run}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={17} color={Colors.primary} />
            <Text style={styles.outlineBtnText}>Replay</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={rfStyles.footerNote}>
        <Ionicons
          name="information-circle-outline"
          size={13}
          color={Colors.gray400}
        />
        <Text style={rfStyles.footerNoteText}>
          A light-comfort screen only. True pupil-reaction testing requires a
          clinician's penlight examination.
        </Text>
      </View>
    </ScrollView>
  );
};

// ─── Refraction — Step 9: Eye Health Screening (tonometry / retinal) ──────────
// Eye pressure (tonometry) and retinal/fundus health can't be measured on a
// phone. Instead we educate and capture self-reported risk factors that feed
// into the overall recommendation.

const HEALTH_RISK_FACTORS: { key: string; label: string }[] = [
  { key: 'family', label: 'Family history of glaucoma or eye disease' },
  { key: 'systemic', label: 'Diabetes or high blood pressure' },
  { key: 'age', label: 'Age 40 or older' },
  { key: 'pain', label: 'Frequent eye pain, redness or headaches' },
  { key: 'floaters', label: 'Flashes, floaters or sudden vision changes' },
];

const EyeHealthStep: React.FC<{
  onComplete: (riskFactorCount: number) => void;
}> = ({ onComplete }) => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const toggle = (k: string) =>
    setSelected(s => ({ ...s, [k]: !s[k] }));
  const count = Object.values(selected).filter(Boolean).length;

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>Step 9 of 9 — Eye Health</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      {[
        {
          icon: 'speedometer-outline',
          title: 'Eye Pressure (Tonometry)',
          desc: 'High intraocular pressure is a key glaucoma risk and can only be measured with clinical equipment — not a phone.',
        },
        {
          icon: 'aperture-outline',
          title: 'Retinal / Fundus Health',
          desc: 'Examining the retina needs a specialised lens. We can flag your risk, but an in-store exam is required to check it.',
        },
      ].map(item => (
        <View key={item.title} style={styles.featureRow}>
          <View style={styles.featureIconBox}>
            <Ionicons
              name={item.icon as any}
              size={20}
              color={Colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.featureDesc}>{item.desc}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>
        Do any of these apply to you?
      </Text>
      {HEALTH_RISK_FACTORS.map(rf => {
        const on = !!selected[rf.key];
        return (
          <TouchableOpacity
            key={rf.key}
            style={[etStyles.ehRow, on && etStyles.ehRowOn]}
            onPress={() => toggle(rf.key)}
            activeOpacity={0.8}
          >
            <View style={[etStyles.ehCheck, on && etStyles.ehCheckOn]}>
              {on && <Ionicons name="checkmark" size={14} color={Colors.white} />}
            </View>
            <Text style={[etStyles.ehLabel, on && { color: Colors.primary }]}>
              {rf.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: Spacing.md }]}
        onPress={() => onComplete(count)}
        activeOpacity={0.82}
      >
        <Ionicons
          name="arrow-forward-circle-outline"
          size={20}
          color={Colors.white}
        />
        <Text style={styles.primaryBtnText}>See My Results</Text>
      </TouchableOpacity>

      <View style={rfStyles.footerNote}>
        <Ionicons
          name="information-circle-outline"
          size={13}
          color={Colors.gray400}
        />
        <Text style={rfStyles.footerNoteText}>
          These factors help tailor your recommendation. They are not a diagnosis
          of glaucoma or retinal disease.
        </Text>
      </View>
    </ScrollView>
  );
};

// ─── New-test Styles ──────────────────────────────────────────────────────────

const etStyles = StyleSheet.create({
  // Visual field play area
  vfPlay: {
    width: VF_PLAY_W,
    height: VF_PLAY_H,
    alignSelf: 'center',
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    marginVertical: Spacing.md,
    overflow: 'hidden',
  },
  vfFixation: {
    position: 'absolute',
    left: VF_PLAY_W / 2 - 5,
    top: VF_PLAY_H / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gray600,
  },
  vfTarget: {
    position: 'absolute',
    width: VF_DOT,
    height: VF_DOT,
    borderRadius: VF_DOT / 2,
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  vfStartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  vfStartText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Eye-muscle play area
  emPlay: {
    width: EM_W,
    height: EM_H,
    alignSelf: 'center',
    backgroundColor: '#101012',
    borderRadius: BorderRadius.xl,
    marginVertical: Spacing.md,
    overflow: 'hidden',
  },
  emDot: {
    position: 'absolute',
    width: EM_R * 2,
    height: EM_R * 2,
    borderRadius: EM_R,
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },

  // Pupil / light panel
  ppPanel: {
    width: VF_PLAY_W,
    height: 280,
    alignSelf: 'center',
    borderRadius: BorderRadius.xl,
    marginVertical: Spacing.md,
    overflow: 'hidden',
  },

  // Eye-health risk rows
  ehRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ehRowOn: {
    borderColor: Colors.primaryGlow,
    backgroundColor: Colors.primaryLight,
  },
  ehCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ehCheckOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ehLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray700,
    fontWeight: '600',
    lineHeight: 18,
  },
});

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
          <Text style={bkStyles.headerTitle}>
            {confirmed ? 'Booking Summary' : 'Book Appointment'}
          </Text>
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
            <Text style={bkStyles.successTitle}>Appointment Requested</Text>
            <Text style={bkStyles.successSub}>
              Call the store to confirm your slot. Our team will be happy to
              assist you.
            </Text>

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
                  <Text style={bkStyles.summaryText}>{row.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => Linking.openURL('tel:+212')}
              activeOpacity={0.82}
            >
              <Ionicons name="call-outline" size={18} color={Colors.white} />
              <Text style={styles.primaryBtnText}>Call to Confirm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.outlineBtnText}>Done</Text>
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
              <Text style={bkStyles.sectionTitle}>Select Branch</Text>
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
                      <Text
                        style={[
                          bkStyles.branchName,
                          selected && { color: Colors.primary },
                        ]}
                      >
                        {b.name}
                      </Text>
                      <Text style={bkStyles.branchAddress}>{b.address}</Text>
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
              <Text style={[bkStyles.sectionTitle, { marginTop: Spacing.lg }]}>
                Select Date
              </Text>
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
                      <Text
                        style={[
                          bkStyles.dateDay,
                          selected && bkStyles.dateTextActive,
                        ]}
                      >
                        {DAY_SHORT[d.getDay()]}
                      </Text>
                      <Text
                        style={[
                          bkStyles.dateNum,
                          selected && bkStyles.dateTextActive,
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                      <Text
                        style={[
                          bkStyles.dateMon,
                          selected && bkStyles.dateTextActive,
                        ]}
                      >
                        {MONTH_SHORT[d.getMonth()]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Time */}
              <Text style={[bkStyles.sectionTitle, { marginTop: Spacing.lg }]}>
                Select Time
              </Text>
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
                      <Text
                        style={[
                          bkStyles.timeText,
                          selected && bkStyles.timeTextActive,
                        ]}
                      >
                        {slot}
                      </Text>
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
                <Text style={styles.primaryBtnText}>Confirm Appointment</Text>
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
  acuityPass: number;
  contrast: ContrastResult;
  astigmatism: 'equal' | 'unequal';
  colorVision: ColorResult;
  nearVision: 'clear' | 'blurry';
  visualField: VisualFieldResult;
  eyeMuscle: EyeMuscleResult;
  pupil: PupilResult;
  healthRiskFactors: number;
  onRetry: () => void;
}> = ({
  risk,
  acuityPass,
  contrast,
  astigmatism,
  colorVision,
  nearVision,
  visualField,
  eyeMuscle,
  pupil,
  healthRiskFactors,
  onRetry,
}) => {
  const cfg = RISK_CONFIG[risk];
  const [showBooking, setShowBooking] = useState(false);

  const checks: { label: string; ok: boolean; detail: string }[] = [
    {
      label: 'Distance Vision',
      ok: acuityPass >= 4,
      detail:
        acuityPass >= 5
          ? 'Excellent — 20/40 line or better'
          : acuityPass >= 4
          ? 'Good — 20/50 line'
          : acuityPass >= 3
          ? 'Fair — difficulty at smaller sizes'
          : 'Poor — significant blur detected',
    },
    {
      label: 'Contrast Sensitivity',
      ok: contrast === 'good',
      detail:
        contrast === 'good'
          ? 'Normal contrast perception'
          : contrast === 'reduced'
          ? 'Mildly reduced contrast sensitivity'
          : 'Significantly reduced contrast sensitivity',
    },
    {
      label: 'Astigmatism',
      ok: astigmatism === 'equal',
      detail:
        astigmatism === 'equal'
          ? 'No irregularity detected'
          : 'Uneven line clarity detected',
    },
    {
      label: 'Colour Vision',
      ok: colorVision === 'normal',
      detail:
        colorVision === 'normal'
          ? 'Normal colour discrimination'
          : colorVision === 'mild'
          ? 'Possible mild colour deficiency'
          : 'Signs of colour vision deficiency detected',
    },
    {
      label: 'Near Vision',
      ok: nearVision === 'clear',
      detail:
        nearVision === 'clear'
          ? 'Near focus appears normal'
          : 'Difficulty with near focus detected',
    },
  ];

  // Eye-health screening — shown as its own section (per design choice) but
  // still folded into the overall risk score above.
  const healthChecks: { label: string; ok: boolean; detail: string }[] = [
    {
      label: 'Visual Field',
      ok: visualField === 'full',
      detail:
        visualField === 'full'
          ? 'Full peripheral awareness'
          : visualField === 'mild'
          ? 'A few peripheral dots were missed'
          : 'Several peripheral dots were missed',
    },
    {
      label: 'Eye Alignment',
      ok: eyeMuscle === 'aligned',
      detail:
        eyeMuscle === 'aligned'
          ? 'Smooth, single tracking'
          : 'Possible doubling or uneven tracking',
    },
    {
      label: 'Light Response',
      ok: pupil === 'normal',
      detail:
        pupil === 'normal'
          ? 'Comfortable adjustment to light'
          : 'Light sensitivity reported',
    },
    {
      label: 'Health Risk Factors',
      ok: healthRiskFactors === 0,
      detail:
        healthRiskFactors === 0
          ? 'No risk factors reported'
          : `${healthRiskFactors} risk factor${
              healthRiskFactors > 1 ? 's' : ''
            } reported`,
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
        <Ionicons name={cfg.icon as any} size={40} color={cfg.color} />
        <Text style={[rfStyles.riskLabel, { color: cfg.color }]}>
          {cfg.label}
        </Text>
        <Text style={rfStyles.riskSummary}>{cfg.summary}</Text>
      </View>

      {/* Per-test breakdown — Vision Tests */}
      <Text style={styles.sectionLabel}>Vision Test Results</Text>
      {checks.map(c => (
        <View key={c.label} style={rfStyles.checkRow}>
          <View
            style={[
              rfStyles.checkIcon,
              {
                backgroundColor: c.ok
                  ? 'rgba(45,189,126,0.12)'
                  : 'rgba(231,76,60,0.12)',
              },
            ]}
          >
            <Ionicons
              name={c.ok ? 'checkmark' : 'close'}
              size={16}
              color={c.ok ? '#2DBD7E' : '#E74C3C'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rfStyles.checkLabel}>{c.label}</Text>
            <Text style={rfStyles.checkDetail}>{c.detail}</Text>
          </View>
        </View>
      ))}

      {/* Separate section — Eye Health Screening */}
      <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
        Eye Health Screening
      </Text>
      {healthChecks.map(c => (
        <View key={c.label} style={rfStyles.checkRow}>
          <View
            style={[
              rfStyles.checkIcon,
              {
                backgroundColor: c.ok
                  ? 'rgba(45,189,126,0.12)'
                  : 'rgba(244,168,48,0.14)',
              },
            ]}
          >
            <Ionicons
              name={c.ok ? 'checkmark' : 'alert'}
              size={16}
              color={c.ok ? '#2DBD7E' : '#F4A830'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rfStyles.checkLabel}>{c.label}</Text>
            <Text style={rfStyles.checkDetail}>{c.detail}</Text>
          </View>
        </View>
      ))}

      {/* Advice card */}
      <View style={[rfStyles.adviceCard, { borderLeftColor: cfg.color }]}>
        <Text style={rfStyles.adviceTitle}>Our Recommendation</Text>
        <Text style={rfStyles.adviceText}>{cfg.advice}</Text>
      </View>

      <BookingModal
        visible={showBooking}
        onClose={() => setShowBooking(false)}
      />

      {/* CTAs */}
      {risk !== 'low' && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setShowBooking(true)}
          activeOpacity={0.82}
        >
          <Ionicons name="calendar-outline" size={19} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.outlineBtn,
          { marginTop: risk !== 'low' ? Spacing.sm : 0 },
        ]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={17} color={Colors.primary} />
        <Text style={styles.outlineBtnText}>Retake Test</Text>
      </TouchableOpacity>

      <View style={rfStyles.footerNote}>
        <Ionicons
          name="information-circle-outline"
          size={13}
          color={Colors.gray400}
        />
        <Text style={rfStyles.footerNoteText}>
          Results are indicative only. A full clinical refraction by a licensed
          optometrist is required for a prescription.
        </Text>
      </View>
    </ScrollView>
  );
};

// ─── Refraction Flow ──────────────────────────────────────────────────────────

const RefractionFlow: React.FC = () => {
  const [stage, setStage] = useState<RefractionStage>('intro');
  const [acuityPass, setAcuityPass] = useState(0);
  const [contrast, setContrast] = useState<ContrastResult>('good');
  const [astigmatism, setAstigmatism] = useState<'equal' | 'unequal'>('equal');
  const [colorVision, setColorVision] = useState<ColorResult>('normal');
  const [nearVision, setNearVision] = useState<'clear' | 'blurry'>('clear');
  const [visualField, setVisualField] = useState<VisualFieldResult>('full');
  const [eyeMuscle, setEyeMuscle] = useState<EyeMuscleResult>('aligned');
  const [pupil, setPupil] = useState<PupilResult>('normal');
  const [healthRiskFactors, setHealthRiskFactors] = useState(0);

  // Fresh randomised content per run; `runId` bumps on retry to regenerate it.
  const [runId, setRunId] = useState(0);
  const testSet = useMemo(
    () => ({
      acuityRows: genAcuityRows(),
      contrastLevels: genContrastLevels(),
      cvPlates: genCvPlates(3),
      nearText: genNearText(),
    }),
    [runId],
  );

  const handleAcuityDone = (passCount: number) => {
    setAcuityPass(passCount);
    setStage('contrast');
  };

  const handleContrastDone = (result: ContrastResult) => {
    setContrast(result);
    setStage('astigmatism');
  };

  const handleAstigmatismDone = (result: 'equal' | 'unequal') => {
    setAstigmatism(result);
    setStage('colorVision');
  };

  const handleColorVisionDone = (result: ColorResult) => {
    setColorVision(result);
    setStage('nearVision');
  };

  const handleNearVisionDone = (result: 'clear' | 'blurry') => {
    setNearVision(result);
    setStage('visualField');
  };

  const handleVisualFieldDone = (result: VisualFieldResult) => {
    setVisualField(result);
    setStage('eyeMuscle');
  };

  const handleEyeMuscleDone = (result: EyeMuscleResult) => {
    setEyeMuscle(result);
    setStage('pupil');
  };

  const handlePupilDone = (result: PupilResult) => {
    setPupil(result);
    setStage('eyeHealth');
  };

  const handleEyeHealthDone = (riskFactorCount: number) => {
    setHealthRiskFactors(riskFactorCount);
    setStage('result');
  };

  const handleRetry = () => {
    setAcuityPass(0);
    setContrast('good');
    setAstigmatism('equal');
    setColorVision('normal');
    setNearVision('clear');
    setVisualField('full');
    setEyeMuscle('aligned');
    setPupil('normal');
    setHealthRiskFactors(0);
    setRunId(prev => prev + 1); // regenerate randomised test content
    setStage('intro');
  };

  if (stage === 'intro')
    return <RefractionIntro onStart={() => setStage('acuity')} />;
  if (stage === 'acuity')
    return <AcuityStep rows={testSet.acuityRows} onComplete={handleAcuityDone} />;
  if (stage === 'contrast')
    return (
      <ContrastStep
        levels={testSet.contrastLevels}
        onComplete={handleContrastDone}
      />
    );
  if (stage === 'astigmatism')
    return <AstigmatismStep onComplete={handleAstigmatismDone} />;
  if (stage === 'colorVision')
    return (
      <ColorVisionStep
        plates={testSet.cvPlates}
        onComplete={handleColorVisionDone}
      />
    );
  if (stage === 'nearVision')
    return (
      <NearVisionStep text={testSet.nearText} onComplete={handleNearVisionDone} />
    );
  if (stage === 'visualField')
    return <VisualFieldStep onComplete={handleVisualFieldDone} />;
  if (stage === 'eyeMuscle')
    return <EyeMuscleStep onComplete={handleEyeMuscleDone} />;
  if (stage === 'pupil')
    return <PupilResponseStep onComplete={handlePupilDone} />;
  if (stage === 'eyeHealth')
    return <EyeHealthStep onComplete={handleEyeHealthDone} />;

  return (
    <RefractionResult
      risk={computeRisk(
        acuityPass,
        astigmatism,
        nearVision,
        contrast,
        colorVision,
        visualField,
        eyeMuscle,
        pupil,
        healthRiskFactors,
      )}
      acuityPass={acuityPass}
      contrast={contrast}
      astigmatism={astigmatism}
      colorVision={colorVision}
      nearVision={nearVision}
      visualField={visualField}
      eyeMuscle={eyeMuscle}
      pupil={pupil}
      healthRiskFactors={healthRiskFactors}
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

  const handleShapeDetected = (shape: FaceShape) => {
    setFaceShape(shape);
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
          {faceScanStage === 'idle' && (
            <FaceScanIdle onStart={startFaceScan} />
          )}

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
    maxHeight: SCREEN_HEIGHT * 0.78,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shapeIconSmall: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  headerShape: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.5,
    marginTop: 1,
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
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xxl,
  },
  insightCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  insightDesc: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 20,
    fontWeight: '500',
  },
  insightDivider: {
    height: 1,
    backgroundColor: Colors.primaryGlow,
    marginVertical: Spacing.sm,
  },
  insightTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  insightTip: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.primary,
    lineHeight: 17,
    fontWeight: '600',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.2,
  },
  recSub: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
    marginTop: 1,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: Spacing.lg,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    color: Colors.gray400,
    lineHeight: 16,
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
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
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
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 2,
  },
  featureDesc: { fontSize: FontSize.xs, color: Colors.gray500, lineHeight: 16 },

  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: Colors.gray400,
    lineHeight: 16,
  },

  // Acuity / step shared
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  stepCounter: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },
  stepCounterRight: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.glassBorder,
    borderRadius: 2,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  acuityCard: {
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorderStrong,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  acuityInstruction: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  acuityLetterBox: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  acuityLetters: {
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  acuityLabel: {
    marginTop: 6,
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  acuityQuestion: {
    fontSize: FontSize.sm,
    color: Colors.gray700,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },

  // Frames grid
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    letterSpacing: 0.8,
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

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 15,
    ...Shadow.md,
  },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryGlow,
    backgroundColor: Colors.primaryLight,
  },
  outlineBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Face scan — scanning
  cancelArea: { position: 'absolute', top: 0, left: 0, right: 0 },
  cancelBtn: {
    margin: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
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

  // Near vision text box
  nearTextBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    width: '100%',
  },
  nearText: {
    fontSize: 13,
    color: Colors.black,
    lineHeight: 20,
    fontWeight: '400',
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
    fontSize: FontSize.xl,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: Spacing.xs,
  },
  riskSummary: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Per-check row
  checkRow: {
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
  checkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 2,
  },
  checkDetail: { fontSize: FontSize.xs, color: Colors.gray500, lineHeight: 16 },

  // Advice card
  adviceCard: {
    backgroundColor: Colors.glassSurfaceHigh,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginVertical: Spacing.lg,
  },
  adviceTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 6,
  },
  adviceText: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },

  // Ishihara plate
  plateContainer: {
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: 'hidden',
    alignSelf: 'center',
    marginVertical: Spacing.lg,
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
    gap: 5,
    marginTop: Spacing.lg,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    color: Colors.gray400,
    lineHeight: 16,
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
