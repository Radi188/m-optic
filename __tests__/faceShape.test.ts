// Declared rather than imported: the app's tsconfig carries no Node types (it
// is a React Native project), and pulling @types/node in for one test file
// would put Node's globals in scope for the whole app.
declare const __dirname: string;

const fs: { readFileSync(p: string, enc: string): string } = require('fs');
const path: { join(...parts: string[]): string } = require('path');

/**
 * The face-shape classifier runs inside the scanner's WebView, so it lives in
 * a template literal in ScanScreen and nothing in the normal build ever looks
 * at it — not TypeScript, not the linter. This suite pulls the scoring core
 * back out and exercises it, which is the only automated check that code gets.
 *
 * It tests the SHAPE LOGIC, not the calibration: every case states its facial
 * index as a multiple of FI2_REF, so retuning that constant against real scans
 * (which is expected — see its comment in ScanScreen) moves the whole suite
 * with it instead of breaking it.
 */

type Features = {
  aspect: number;
  aspect2: number;
  fVc: number;
  jVc: number;
  chinTaper: number;
  jawDeg: number;
  jawBow: number;
  lowerFull: number;
};

type Scores = Record<string, number>;
type Winner = { shape: string; top: number; second: number };

const SOURCE = path.join(__dirname, '..', 'src', 'screens', 'ScanScreen.tsx');

function loadClassifier(): {
  scoreShapes: (m: Features) => Scores;
  bestOf: (s: Scores) => Winner;
  FI2_REF: number;
} {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const start = src.indexOf('const SCAN_HTML = `');
  const end = src.indexOf('</html>`;', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  const grab = (re: RegExp, label: string): string => {
    const m = src.slice(start, end).match(re);
    if (!m) throw new Error(`face-shape classifier: could not find ${label}`);
    return m[0];
  };

  const core = [
    grab(/var FI_REF=[\s\S]*?var GON_REF=\d+;/, 'reference constants'),
    grab(/function up\(v,a,b\)\{[\s\S]*?\n\}/, 'up()'),
    grab(/function down\(v,a,b\)\{.*?\}/, 'down()'),
    grab(/function band\(v,a,b,c,d\)\{.*?\}/, 'band()'),
    grab(/function wsum\(terms\)\{[\s\S]*?\n\}/, 'wsum()'),
    grab(/function scoreShapes\(m\)\{[\s\S]*?\n\}/, 'scoreShapes()'),
    grab(/function bestOf\(scores\)\{[\s\S]*?\n\}/, 'bestOf()'),
  ].join('\n');

  // eslint-disable-next-line no-new-func
  return new Function(`${core}; return {scoreShapes, bestOf, FI2_REF};`)();
}

const { scoreShapes, bestOf, FI2_REF } = loadClassifier();

/**
 * One face, described the way the scanner measures it.
 *
 * @param rel      brow→chin ÷ cheekbone width, as a multiple of the reference
 * @param fVc      forehead ÷ cheekbone
 * @param jVc      jaw ÷ cheekbone
 * @param chin     chin ÷ jaw — low is a pointed chin
 * @param jawDeg   gonial angle; low is a sharp, squared jaw
 * @param bow      how far the jaw line bows out; low is straight, high is round
 * @param lower    width at the mouth line ÷ cheekbone
 */
const face = (
  rel: number,
  fVc: number,
  jVc: number,
  chin: number,
  jawDeg: number,
  bow: number,
  lower: number,
): Features => ({
  aspect2: rel * FI2_REF,
  aspect: rel * FI2_REF * 1.5,
  fVc,
  jVc,
  chinTaper: chin,
  jawDeg,
  jawBow: bow,
  lowerFull: lower,
});

// The textbook profile for each shape, as optical dispensing guidance defines
// them. If one of these stops classifying as itself, the scanner is telling
// users the wrong thing about their face.
const TEXTBOOK: Array<[string, Features]> = [
  ['Round', face(0.93, 0.9, 0.92, 0.75, 140, 0.13, 0.94)],
  ['Square', face(0.93, 0.95, 0.97, 0.75, 118, 0.03, 0.95)],
  ['Oval', face(1.0, 0.9, 0.84, 0.62, 132, 0.08, 0.86)],
  ['Oblong', face(1.16, 0.93, 0.92, 0.68, 138, 0.11, 0.9)],
  ['Rectangle', face(1.16, 0.95, 0.95, 0.72, 117, 0.03, 0.93)],
  ['Heart', face(1.05, 0.98, 0.8, 0.45, 134, 0.09, 0.82)],
  ['Inverted Triangle', face(1.05, 0.98, 0.8, 0.78, 124, 0.05, 0.82)],
  ['Diamond', face(1.08, 0.8, 0.78, 0.52, 130, 0.08, 0.74)],
  ['Triangle', face(1.02, 0.82, 0.98, 0.72, 128, 0.07, 0.95)],
];

describe('face shape classifier', () => {
  it.each(TEXTBOOK)('calls a textbook %s face %s', (expected, features) => {
    expect(bestOf(scoreShapes(features)).shape).toBe(expected);
  });

  it('offers every shape the scanner claims to know', () => {
    expect(Object.keys(scoreShapes(TEXTBOOK[0][1])).sort()).toEqual(
      TEXTBOOK.map(([name]) => name).sort(),
    );
  });

  it('separates the two shapes that differ only by jaw angularity', () => {
    // Oblong and Rectangle share a gate; the jaw is the whole difference.
    const soft = face(1.16, 0.94, 0.93, 0.7, 140, 0.12, 0.91);
    const sharp = { ...soft, jawDeg: 116, jawBow: 0.03 };
    expect(bestOf(scoreShapes(soft)).shape).toBe('Oblong');
    expect(bestOf(scoreShapes(sharp)).shape).toBe('Rectangle');
  });

  it('separates the two shapes that differ only by chin taper', () => {
    // Heart and Inverted Triangle share a gate; the chin is the difference.
    const pointed = face(1.05, 0.98, 0.8, 0.44, 130, 0.08, 0.82);
    const blunt = { ...pointed, chinTaper: 0.8 };
    expect(bestOf(scoreShapes(pointed)).shape).toBe('Heart');
    expect(bestOf(scoreShapes(blunt)).shape).toBe('Inverted Triangle');
  });

  it('still finds a round face round when the length reads a little long', () => {
    // The bug this replaced: a face with every round feature came back as Oval
    // because the length axis — the one measurement needing an outside
    // reference — put it just over the line. A few per cent of reference error
    // must not cost the user the right answer.
    const round = face(1.0, 0.9, 0.92, 0.75, 140, 0.13, 0.94);
    expect(bestOf(scoreShapes(round)).shape).toBe('Round');
  });

  it('survives a sample with none of the newer features', () => {
    // Older buffered samples, or a frame where the contour slice for the mouth
    // line came back empty, reach the scorer without bow/lowerFull.
    const sparse = {
      aspect: 1.32,
      aspect2: 0.93 * FI2_REF,
      fVc: 0.9,
      jVc: 0.92,
      chinTaper: 0.75,
      jawDeg: 140,
    } as Features;
    const winner = bestOf(scoreShapes(sparse));
    expect(TEXTBOOK.map(([n]) => n)).toContain(winner.shape);
    expect(Number.isFinite(winner.top)).toBe(true);
  });
});
