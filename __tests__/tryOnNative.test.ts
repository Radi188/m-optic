import * as THREE from 'three';
import { coverGeometry } from '../src/features/try-on/core/coverGeometry';
import { OneEuroFilter } from '../src/features/try-on/core/oneEuroFilter';
import { RunningMedian, solveSplayRad } from '../src/features/try-on/core/templeSplay';
import {
  classifyFaceShape,
  measureFace,
  type NormalizedLandmark,
} from '../src/features/try-on/core/faceShape';
import {
  FACE_MESH_TRIANGLES,
  FACE_OVAL_INDICES,
} from '../src/features/try-on/core/faceMeshTopology.generated';
import { useVtoStore } from '../src/features/try-on/store';
import { DEFAULT_CALIBRATION } from '../src/features/try-on/core/frames';

describe('cover-box geometry (camera matching / photo crop)', () => {
  it('crops the sides of a 4:3 frame on a tall phone, centred', () => {
    const g = coverGeometry(390, 844, 3 / 4);
    expect(g.coverHeight).toBe(844);
    expect(g.coverWidth).toBeCloseTo(633);
    expect(g.viewX).toBeCloseTo((633 - 390) / 2);
    expect(g.viewY).toBe(0);
    expect(g.coverWidth / g.coverHeight).toBeCloseTo(3 / 4);
  });

  it('crops top/bottom when the view is wider than the frame', () => {
    const g = coverGeometry(800, 600, 9 / 16);
    expect(g.coverWidth).toBe(800);
    expect(g.viewY).toBeGreaterThan(0);
    expect(g.viewX).toBe(0);
  });

  it('matches three.js setViewOffset to the website cover-box projection', () => {
    // A point projected by a full-frame camera, then cropped, must land where
    // the view-offset camera puts it.
    const aspect = 3 / 4;
    const g = coverGeometry(390, 844, aspect);
    const full = new THREE.PerspectiveCamera(63, aspect, 1, 10000);
    const offset = new THREE.PerspectiveCamera(63, aspect, 1, 10000);
    offset.setViewOffset(g.coverWidth, g.coverHeight, g.viewX, g.viewY, g.viewWidth, g.viewHeight);
    full.updateMatrixWorld();
    offset.updateMatrixWorld();
    const p = new THREE.Vector3(3, -2, -45);
    const a = p.clone().project(full); // NDC in the cover box
    const b = p.clone().project(offset); // NDC in the visible window
    const coverPx = ((a.x + 1) / 2) * g.coverWidth - g.viewX;
    const viewPx = ((b.x + 1) / 2) * g.viewWidth;
    expect(viewPx).toBeCloseTo(coverPx, 3);
    expect(offset.aspect).toBeCloseTo(aspect);
  });
});

describe('1€ filter (ported verbatim)', () => {
  it('passes the first sample through and smooths jitter', () => {
    const f = new OneEuroFilter(1.0, 0.5, 1.0);
    expect(f.filter(10, 1 / 30)).toBe(10);
    const out = f.filter(10.5, 1 / 30);
    expect(out).toBeGreaterThan(10);
    expect(out).toBeLessThan(10.5);
  });

  it('snaps on reset', () => {
    const f = new OneEuroFilter();
    f.filter(0, 1 / 30);
    f.reset(5);
    expect(f.filter(5, 1 / 30)).toBe(5);
  });
});

describe('temple splay (ported verbatim)', () => {
  it('keeps the arm behind the hinge, same splay for a symmetric head', () => {
    // The solver returns the angle already sign-corrected per side (the
    // renderer applies +s to the left pivot and −s to the right).
    const left = solveSplayRad('left', -7, 0, -12, -7.5);
    const right = solveSplayRad('right', 7, 0, -12, 7.5);
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(Math.abs(left!)).toBeLessThan(Math.PI / 2);
    expect(left).toBeCloseTo(right!);
    expect(left!).toBeGreaterThan(0); // opens outward to reach the wider head
  });

  it('holds a running median', () => {
    const m = new RunningMedian(3);
    [1, 100, 2, 3].forEach(v => m.push(v));
    expect(m.value).toBe(3);
  });
});

describe('MediaPipe topology tables', () => {
  it('has the 852-triangle face mesh and the closed face oval', () => {
    expect(FACE_MESH_TRIANGLES.length).toBe(852 * 3);
    expect(Math.max(...FACE_MESH_TRIANGLES)).toBeLessThan(468);
    expect(FACE_OVAL_INDICES.length).toBe(36);
  });
});

describe('face shape (ported maths)', () => {
  it('measures and classifies a synthetic frontal face', () => {
    // An ellipse of landmarks, 1.4× taller than wide, facing the camera.
    const lms: NormalizedLandmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    FACE_OVAL_INDICES.forEach((idx, i) => {
      const a = (i / FACE_OVAL_INDICES.length) * Math.PI * 2;
      lms[idx] = { x: 0.5 + 0.1 * Math.cos(a), y: 0.5 + 0.14 * Math.sin(a), z: 0 };
    });
    const camera = new THREE.PerspectiveCamera(63, 3 / 4, 1, 10000);
    const pose = new THREE.Matrix4().makeTranslation(0, 0, -45);
    const m = measureFace(lms, camera, pose);
    expect(m).not.toBeNull();
    expect(m!.lengthRatio).toBeGreaterThan(1);
    expect(['oval', 'oblong', 'diamond', 'round', 'square', 'heart']).toContain(classifyFaceShape(m!));
  });
});

describe('calibration store (website vtoStore without dev fields)', () => {
  it('loads a frame and hardens a malformed calibration', () => {
    useVtoStore.getState().loadFrame({
      id: '1',
      name: 'x',
      glbPath: 'https://x/a.glb',
      calibration: { ...DEFAULT_CALIBRATION, scaleMultiplier: NaN, positionOffset: [1, NaN, 2] as any },
      bridgeOffset: [0, 2.9, -0.12],
      frameWidthMm: 138,
    });
    const s = useVtoStore.getState();
    expect(s.scaleMultiplier).toBe(1);
    expect(s.positionOffset).toEqual([1, DEFAULT_CALIBRATION.positionOffset[1], 2]);
    expect(s.bridgeOffset).toEqual([0, 2.9, -0.12]);
    expect(s.frameWidthMm).toBe(138);
    expect(s.templeArmsMode).toBe('fade');
    expect(s.oneEuroMinCutoff).toBe(1.0);
    expect(s.oneEuroBeta).toBe(0.5);
  });

  it('falls back to face-width fit when the width is missing', () => {
    useVtoStore.getState().loadFrame({
      id: '2',
      name: 'y',
      glbPath: 'https://x/b.glb',
      calibration: DEFAULT_CALIBRATION,
    });
    expect(useVtoStore.getState().frameWidthMm).toBeNull();
  });
});
