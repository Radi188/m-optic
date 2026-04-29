import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
} from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'face' | 'refraction';
type FaceScanStage = 'idle' | 'scanning' | 'result';
type RefractionStage = 'intro' | 'acuity' | 'astigmatism' | 'nearVision' | 'result';
type FaceShape = 'Oval' | 'Round' | 'Square' | 'Heart' | 'Oblong';
type RiskLevel = 'low' | 'medium' | 'high';

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
    description: 'Similar width and height, with soft curved lines and fuller cheeks.',
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
    description: 'Face is longer than it is wide, with a long straight cheek line.',
    frames: ['Wayfarer', 'Round', 'Oversized', 'Decorative'],
    tip: "Wider frames with depth add width and shorten the face's appearance.",
  },
};

// ─── Refraction Test Data ─────────────────────────────────────────────────────

const ACUITY_ROWS = [
  { size: 36, letters: 'F  P  Z',       label: '20/200' },
  { size: 28, letters: 'T  O  Z  L',   label: '20/100' },
  { size: 22, letters: 'L  P  E  D',   label: '20/70'  },
  { size: 17, letters: 'P  E  C  F  D', label: '20/50' },
  { size: 13, letters: 'E  D  F  C  Z  P', label: '20/40' },
];

const NEAR_VISION_TEXT =
  'The quick brown fox jumps over the lazy dog. ' +
  'Please read this paragraph at a comfortable reading distance (~30 cm) ' +
  'without moving the phone closer to your eyes.';

function computeRisk(
  acuityPassCount: number,
  astigmatism: 'equal' | 'unequal',
  nearVision: 'clear' | 'blurry',
): RiskLevel {
  let score = 0;
  if (acuityPassCount <= 1) score += 4;
  else if (acuityPassCount <= 3) score += 2;
  else if (acuityPassCount === 4) score += 1;
  if (astigmatism === 'unequal') score += 2;
  if (nearVision === 'blurry') score += 2;
  if (score >= 5) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

const RISK_CONFIG: Record<
  RiskLevel,
  { color: string; bg: string; label: string; icon: string; summary: string; advice: string }
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
  { id: 'b1', name: 'M Optic Centre', address: 'Boulevard Zerktouni, Casablanca' },
  { id: 'b2', name: 'M Optic Maarif', address: 'Maarif District, Casablanca' },
  { id: 'b3', name: 'M Optic Ain Sebaa', address: 'Ain Sebaa, Casablanca' },
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

// ─── Scanner WebView HTML ─────────────────────────────────────────────────────

const SCAN_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#000;font-family:-apple-system,sans-serif}
    #video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
    #overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
    .guide-oval{width:200px;height:260px;border:3px solid rgba(156,129,120,0.85);border-radius:50%;box-shadow:0 0 0 2000px rgba(0,0,0,0.42);transition:border-color .4s}
    .guide-oval.locked{border-color:#2DBD7E;box-shadow:0 0 0 2000px rgba(0,0,0,0.42),0 0 24px rgba(45,189,126,0.45)}
    .corners{position:absolute;width:200px;height:260px}
    .corner{position:absolute;width:22px;height:22px;border-color:rgba(255,255,255,0.9);border-style:solid}
    .corner.tl{top:-2px;left:-2px;border-width:3px 0 0 3px;border-radius:4px 0 0 0}
    .corner.tr{top:-2px;right:-2px;border-width:3px 3px 0 0;border-radius:0 4px 0 0}
    .corner.bl{bottom:-2px;left:-2px;border-width:0 0 3px 3px;border-radius:0 0 0 4px}
    .corner.br{bottom:-2px;right:-2px;border-width:0 3px 3px 0;border-radius:0 0 4px 0}
    .scan-line{position:absolute;left:-2px;right:-2px;height:2px;background:linear-gradient(90deg,transparent,rgba(156,129,120,0.9),transparent);animation:scan 2s linear infinite;border-radius:1px}
    @keyframes scan{0%{top:0}100%{top:100%}}
    #hint{margin-top:28px;background:rgba(0,0,0,0.55);color:rgba(255,255,255,0.92);font-size:13px;font-weight:600;padding:7px 20px;border-radius:20px;letter-spacing:0.2px}
    #hint.success{background:rgba(45,189,126,0.75)}
    #progress{margin-top:12px;width:160px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden}
    #progress-bar{height:100%;width:0%;background:rgba(156,129,120,0.9);border-radius:2px;transition:width .1s}
    #loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:rgba(255,255,255,.75);font-size:14px;text-align:center;line-height:2}
    .spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.15);border-top-color:rgba(255,255,255,.8);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 8px}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
<video id="video" autoplay playsinline muted></video>
<div id="overlay">
  <div style="position:relative">
    <div class="guide-oval" id="oval"></div>
    <div class="corners"><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div></div>
    <div class="scan-line" id="scanLine"></div>
  </div>
  <div id="hint">Position your face in the oval</div>
  <div id="progress"><div id="progress-bar"></div></div>
</div>
<div id="loading"><div class="spinner"></div>Loading scanner…</div>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js" crossorigin="anonymous"></script>
<script>
(function(){
'use strict';
var video=document.getElementById('video'),loading=document.getElementById('loading'),oval=document.getElementById('oval'),hint=document.getElementById('hint'),progBar=document.getElementById('progress-bar');
var stableFrames=0,NEEDED=45,done=false;
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy)}
function computeShape(lm){
  var faceH=dist(lm[10],lm[152]),faceW=dist(lm[234],lm[454]),jawW=dist(lm[172],lm[397]),fhW=dist(lm[54],lm[284]);
  if(faceH<0.01)return null;
  var whr=faceW/faceH,jawRatio=jawW/faceW,fhRatio=fhW/faceW;
  if(whr>0.88&&jawRatio>0.82)return 'Square';
  if(whr>0.83)return 'Round';
  if(whr<0.66)return 'Oblong';
  if(fhRatio>jawRatio+0.10)return 'Heart';
  return 'Oval';
}
function post(shape){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'faceShape',shape:shape}))}
var faceMesh=new FaceMesh({locateFile:function(f){return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/'+f}});
faceMesh.setOptions({maxNumFaces:1,refineLandmarks:false,minDetectionConfidence:0.6,minTrackingConfidence:0.6});
faceMesh.onResults(function(results){
  if(done)return;
  if(!results.multiFaceLandmarks||!results.multiFaceLandmarks[0]){
    stableFrames=0;oval.className='guide-oval';hint.className='';
    hint.textContent='Position your face in the oval';progBar.style.width='0%';return;
  }
  var lm=results.multiFaceLandmarks[0],shape=computeShape(lm);
  if(!shape){stableFrames=0;return;}
  stableFrames++;
  var pct=Math.min(100,Math.round(stableFrames/NEEDED*100));
  progBar.style.width=pct+'%';oval.className='guide-oval locked';
  hint.className='success';hint.textContent='Hold still… '+pct+'%';
  if(stableFrames>=NEEDED){done=true;hint.textContent='Scan complete!';post(shape);}
});
var cam=new Camera(video,{onFrame:async function(){await faceMesh.send({image:video})},width:640,height:480,facingMode:'user'});
cam.start().then(function(){loading.style.display='none'}).catch(function(){loading.innerHTML='<p style="color:rgba(255,255,255,.7);padding:20px">Camera access denied.<br>Please allow camera permission.</p>'});
})();
</script>
</body>
</html>`;

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TabBar: React.FC<{ active: Tab; onChange: (t: Tab) => void }> = ({
  active,
  onChange,
}) => (
  <View style={styles.tabBar}>
    {([
      { key: 'face', icon: 'scan-outline', label: 'Face Scan' },
      { key: 'refraction', icon: 'eye-outline', label: 'Eye Test' },
    ] as { key: Tab; icon: string; label: string }[]).map(tab => {
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
      { n: '2', text: 'Position your face inside the oval guide on screen.' },
      { n: '3', text: 'Hold still for a moment — the scan takes about 2 seconds.' },
    ].map(step => (
      <View key={step.n} style={styles.stepRow}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepNum}>{step.n}</Text>
        </View>
        <Text style={styles.stepText}>{step.text}</Text>
      </View>
    ))}

    <TouchableOpacity style={styles.primaryBtn} onPress={onStart} activeOpacity={0.82}>
      <Ionicons name="scan-outline" size={20} color={Colors.white} />
      <Text style={styles.primaryBtnText}>Start Scan</Text>
    </TouchableOpacity>
  </ScrollView>
);

// ─── Face Scan — Result ───────────────────────────────────────────────────────

const FaceScanResult: React.FC<{ shape: FaceShape; onRetry: () => void }> = ({
  shape,
  onRetry,
}) => {
  const info = FACE_SHAPE_INFO[shape];
  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroIconRing}>
          <Ionicons name={info.icon as any} size={44} color={Colors.primary} />
        </View>
        <Text style={styles.overlineLabel}>Your face shape</Text>
        <Text style={styles.shapeName}>{shape}</Text>
        <Text style={styles.heroSub}>{info.description}</Text>
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
        <Text style={styles.tipText}>{info.tip}</Text>
      </View>

      <Text style={styles.sectionLabel}>Recommended Frames</Text>
      <View style={styles.framesGrid}>
        {info.frames.map(name => (
          <View key={name} style={styles.frameCard}>
            <View style={styles.frameIconBox}>
              <Ionicons name="glasses-outline" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.frameName}>{name}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.outlineBtn} onPress={onRetry} activeOpacity={0.8}>
        <Ionicons name="refresh-outline" size={17} color={Colors.primary} />
        <Text style={styles.outlineBtnText}>Scan Again</Text>
      </TouchableOpacity>
    </ScrollView>
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
        A quick 3-step screening to help identify potential refractive errors
        such as myopia, hyperopia, or astigmatism.
      </Text>
      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: Spacing.md, alignSelf: 'stretch' }]}
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
        icon: 'radio-button-off-outline',
        title: 'Astigmatism Check',
        desc: 'View a radial pattern to detect uneven focus in the eye.',
      },
      {
        icon: 'book-outline',
        title: 'Near Vision',
        desc: 'Read a short paragraph to assess your close-up focus.',
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
      <Ionicons name="information-circle-outline" size={16} color={Colors.gray400} />
      <Text style={styles.disclaimerText}>
        This is a preliminary screening only and does not replace a professional
        eye examination by a qualified optometrist.
      </Text>
    </View>

  </ScrollView>
);

// ─── Refraction — Step 1: Visual Acuity ──────────────────────────────────────

const AcuityStep: React.FC<{ onComplete: (passCount: number) => void }> = ({
  onComplete,
}) => {
  const [rowIndex, setRowIndex] = useState(0);
  const [passCount, setPassCount] = useState(0);

  const handleAnswer = (canRead: boolean) => {
    const newCount = canRead ? passCount + 1 : passCount;
    if (rowIndex + 1 >= ACUITY_ROWS.length) {
      onComplete(newCount);
    } else {
      setPassCount(newCount);
      setRowIndex(prev => prev + 1);
    }
  };

  const row = ACUITY_ROWS[rowIndex];
  const progress = ((rowIndex) / ACUITY_ROWS.length) * 100;

  return (
    <ScrollView
      contentContainerStyle={styles.contentPad}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>Step 1 of 3 — Distance Vision</Text>
        <Text style={styles.stepCounterRight}>
          Row {rowIndex + 1}/{ACUITY_ROWS.length}
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
        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
        <Text style={styles.primaryBtnText}>Yes, clearly</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.outlineBtn, { marginTop: Spacing.sm }]}
        onPress={() => handleAnswer(false)}
        activeOpacity={0.8}
      >
        <Ionicons name="close-circle-outline" size={18} color={Colors.gray600} />
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
      <Text style={styles.stepCounter}>Step 2 of 3 — Astigmatism Check</Text>
    </View>
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: '40%' }]} />
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
      <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
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
  onComplete: (result: 'clear' | 'blurry') => void;
}> = ({ onComplete }) => (
  <ScrollView
    contentContainerStyle={styles.contentPad}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.stepHeader}>
      <Text style={styles.stepCounter}>Step 3 of 3 — Near Vision</Text>
    </View>
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: '80%' }]} />
    </View>

    <View style={styles.acuityCard}>
      <Text style={styles.acuityInstruction}>
        Hold your phone at a comfortable reading distance (~30 cm). Do not move
        the phone closer.
      </Text>
      <View style={rfStyles.nearTextBox}>
        <Text style={rfStyles.nearText}>{NEAR_VISION_TEXT}</Text>
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
      <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
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
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
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
          <TouchableOpacity onPress={handleClose} style={bkStyles.closeBtn} activeOpacity={0.7}>
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
              Call the store to confirm your slot. Our team will be happy to assist you.
            </Text>

            <View style={bkStyles.summaryCard}>
              {[
                { icon: 'location-outline', text: branch.name },
                { icon: 'map-outline', text: branch.address },
                {
                  icon: 'calendar-outline',
                  text: `${DAY_SHORT[date.getDay()]}, ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`,
                },
                { icon: 'time-outline', text: timeSlot },
              ].map(row => (
                <View key={row.icon} style={bkStyles.summaryRow}>
                  <Ionicons name={row.icon as any} size={16} color={Colors.primary} />
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
                    style={[bkStyles.branchCard, selected && bkStyles.branchCardActive]}
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
                      <Text style={[bkStyles.branchName, selected && { color: Colors.primary }]}>
                        {b.name}
                      </Text>
                      <Text style={bkStyles.branchAddress}>{b.address}</Text>
                    </View>
                    <View style={[bkStyles.radio, selected && bkStyles.radioActive]}>
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
                      style={[bkStyles.dateChip, selected && bkStyles.dateChipActive]}
                      onPress={() => setDate(d)}
                      activeOpacity={0.8}
                    >
                      <Text style={[bkStyles.dateDay, selected && bkStyles.dateTextActive]}>
                        {DAY_SHORT[d.getDay()]}
                      </Text>
                      <Text style={[bkStyles.dateNum, selected && bkStyles.dateTextActive]}>
                        {d.getDate()}
                      </Text>
                      <Text style={[bkStyles.dateMon, selected && bkStyles.dateTextActive]}>
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
                      style={[bkStyles.timeChip, selected && bkStyles.timeChipActive]}
                      onPress={() => setTimeSlot(slot)}
                      activeOpacity={0.8}
                    >
                      <Text style={[bkStyles.timeText, selected && bkStyles.timeTextActive]}>
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
                <Ionicons name="checkmark-circle-outline" size={19} color={Colors.white} />
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
  astigmatism: 'equal' | 'unequal';
  nearVision: 'clear' | 'blurry';
  onRetry: () => void;
}> = ({ risk, acuityPass, astigmatism, nearVision, onRetry }) => {
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
      label: 'Astigmatism',
      ok: astigmatism === 'equal',
      detail:
        astigmatism === 'equal'
          ? 'No irregularity detected'
          : 'Uneven line clarity detected',
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

  return (
    <ScrollView
      contentContainerStyle={[styles.contentPad, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Risk badge */}
      <View style={[rfStyles.riskCard, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
        <Ionicons name={cfg.icon as any} size={40} color={cfg.color} />
        <Text style={[rfStyles.riskLabel, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={rfStyles.riskSummary}>{cfg.summary}</Text>
      </View>

      {/* Per-test breakdown */}
      <Text style={styles.sectionLabel}>Test Results</Text>
      {checks.map(c => (
        <View key={c.label} style={rfStyles.checkRow}>
          <View
            style={[
              rfStyles.checkIcon,
              { backgroundColor: c.ok ? 'rgba(45,189,126,0.12)' : 'rgba(231,76,60,0.12)' },
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

      {/* Advice card */}
      <View style={[rfStyles.adviceCard, { borderLeftColor: cfg.color }]}>
        <Text style={rfStyles.adviceTitle}>Our Recommendation</Text>
        <Text style={rfStyles.adviceText}>{cfg.advice}</Text>
      </View>

      <BookingModal visible={showBooking} onClose={() => setShowBooking(false)} />

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
        style={[styles.outlineBtn, { marginTop: risk !== 'low' ? Spacing.sm : 0 }]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={17} color={Colors.primary} />
        <Text style={styles.outlineBtnText}>Retake Test</Text>
      </TouchableOpacity>

      <View style={rfStyles.footerNote}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.gray400} />
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
  const [astigmatism, setAstigmatism] = useState<'equal' | 'unequal'>('equal');
  const [nearVision, setNearVision] = useState<'clear' | 'blurry'>('clear');

  const handleAcuityDone = (passCount: number) => {
    setAcuityPass(passCount);
    setStage('astigmatism');
  };

  const handleAstigmatismDone = (result: 'equal' | 'unequal') => {
    setAstigmatism(result);
    setStage('nearVision');
  };

  const handleNearVisionDone = (result: 'clear' | 'blurry') => {
    setNearVision(result);
    setStage('result');
  };

  const handleRetry = () => {
    setAcuityPass(0);
    setAstigmatism('equal');
    setNearVision('clear');
    setStage('intro');
  };

  if (stage === 'intro') return <RefractionIntro onStart={() => setStage('acuity')} />;
  if (stage === 'acuity') return <AcuityStep onComplete={handleAcuityDone} />;
  if (stage === 'astigmatism') return <AstigmatismStep onComplete={handleAstigmatismDone} />;
  if (stage === 'nearVision') return <NearVisionStep onComplete={handleNearVisionDone} />;

  return (
    <RefractionResult
      risk={computeRisk(acuityPass, astigmatism, nearVision)}
      acuityPass={acuityPass}
      astigmatism={astigmatism}
      nearVision={nearVision}
      onRetry={handleRetry}
    />
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const ScanScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('face');
  const [faceScanStage, setFaceScanStage] = useState<FaceScanStage>('idle');
  const [faceShape, setFaceShape] = useState<FaceShape | null>(null);

  const onWebMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === 'faceShape' && d.shape) {
        setFaceShape(d.shape as FaceShape);
        setFaceScanStage('result');
      }
    } catch {}
  }, []);

  const isScanning = tab === 'face' && faceScanStage === 'scanning';

  return (
    <SafeAreaView style={styles.root}>
      {!isScanning && (
        <TabBar active={tab} onChange={t => { setTab(t); }} />
      )}

      {tab === 'face' ? (
        <>
          {faceScanStage === 'idle' && (
            <FaceScanIdle onStart={() => setFaceScanStage('scanning')} />
          )}

          {faceScanStage === 'scanning' && (
            <View style={StyleSheet.absoluteFillObject}>
              <WebView
                source={{ html: SCAN_HTML }}
                style={StyleSheet.absoluteFill}
                javaScriptEnabled
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                originWhitelist={['*']}
                mixedContentMode="always"
                onMessage={onWebMessage}
              />
              <SafeAreaView style={styles.cancelArea} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFaceScanStage('idle')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={20} color={Colors.gray600} />
                </TouchableOpacity>
              </SafeAreaView>
            </View>
          )}

          {faceScanStage === 'result' && faceShape && (
            <FaceScanResult
              shape={faceShape}
              onRetry={() => { setFaceShape(null); setFaceScanStage('idle'); }}
            />
          )}
        </>
      ) : (
        <RefractionFlow />
      )}
    </SafeAreaView>
  );
};

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
    ...Shadow.glow,
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
  stepCounter: { fontSize: FontSize.xs, color: Colors.gray500, fontWeight: '600' },
  stepCounterRight: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
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

  // Tip card (face scan result)
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
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
  dateDay: { fontSize: 10, fontWeight: '600', color: Colors.gray400, textTransform: 'uppercase' },
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
