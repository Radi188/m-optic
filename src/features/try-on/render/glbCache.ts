/* eslint-disable no-bitwise -- FNV-1a URL hash. */
/**
 * On-disk cache for try-on GLBs — download + prepare, no three.js, so screens
 * that only warm the cache (the product page) stay light.
 *
 *   download   — straight from the catalog URL (no CORS on native, so no
 *                /api/vto-glb proxy), with progress, keyed by URL.
 *   prepare    — once per model: the GLB's embedded textures (~25 per catalog
 *                frame) are written out as files and the glTF points at them,
 *                so expo-gl decodes them natively from disk instead of every
 *                texture going through base64 strings on the JS thread on
 *                every open (R3F native's Blob path). WebP textures are
 *                converted to PNG: expo-gl decodes texture files with
 *                stb_image, which has no WebP (every catalog GLB is WebP).
 */

import './polyfills';
import { Directory, File, Paths } from 'expo-file-system';
import { transcodeToPng } from 'react-native-moptic-vto';

export type Progress = (fraction: number | null) => void;

/** Bump to invalidate every prepared model (e.g. if `prepare` changes). */
const CACHE_ROOT = 'vto-glb-v2';
const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

/** FNV-1a, twice with different seeds — a stable, filesystem-safe URL key. */
function urlKey(url: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < url.length; i++) {
    const c = url.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

export function modelDir(url: string): Directory {
  const root = new Directory(Paths.cache, CACHE_ROOT);
  if (!root.exists) root.create({ intermediates: true, idempotent: true });
  const dir = new Directory(root, urlKey(url));
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function isGlb(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 20) return false;
  return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true) === GLB_MAGIC;
}

// ── Download ────────────────────────────────────────────────────────────────

const downloads = new Map<string, Promise<File>>();

export function download(url: string, dir: Directory, onProgress: Progress): Promise<File> {
  const target = new File(dir, 'source.glb');
  if (target.exists && (target.size ?? 0) > 0) return Promise.resolve(target);

  const pending = downloads.get(url);
  if (pending) return pending;

  const run = (async () => {
    const part = new File(dir, 'source.glb.part');
    if (part.exists) part.delete();
    // Foreground session: iOS defaults download tasks to a background
    // URLSession (run by nsurlsessiond, throttled and slow to start), which
    // the try-on, waiting on screen, has no use for.
    const task = File.createDownloadTask(url, part, { sessionType: 'foreground' });
    const sub = task.addListener('progress', ({ bytesWritten, totalBytes }) => {
      onProgress(totalBytes > 0 ? Math.min(1, bytesWritten / totalBytes) : null);
    });
    try {
      const done = await task.downloadAsync();
      if (!done || !part.exists) throw new Error(`GLB download did not complete: ${url}`);
    } finally {
      sub.remove();
      task.release();
    }
    // A server error page saved as the model must never be cached.
    const head = await part.bytes();
    if (!isGlb(head)) {
      part.delete();
      throw new Error(`Not a GLB (server returned something else): ${url}`);
    }
    if (target.exists) target.delete();
    part.moveSync(target);
    return target;
  })();

  downloads.set(url, run);
  run.finally(() => downloads.delete(url)).catch(() => {});
  return run;
}

// ── Prepare (textures → files) ──────────────────────────────────────────────

export interface GltfJson {
  images?: { bufferView?: number; mimeType?: string; uri?: string; name?: string }[];
  textures?: { source?: number; sampler?: number; extensions?: Record<string, { source?: number }> }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
}

const EXT_WEBP = 'EXT_texture_webp';

/** A File's plain filesystem path (native APIs take no file:// URI). */
function plainPath(file: File): string {
  return decodeURIComponent(file.uri.replace(/^file:\/\//, ''));
}

const EXT_BY_MIME: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
};

/** Read a GLB's JSON and BIN chunks without copying the BIN. */
export function readChunks(bytes: Uint8Array): { json: GltfJson; bin: Uint8Array | null } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let json: GltfJson | null = null;
  let bin: Uint8Array | null = null;
  const decoder = new TextDecoder();
  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (type === CHUNK_JSON) {
      json = JSON.parse(decoder.decode(bytes.subarray(start, start + length)));
    } else if (type === CHUNK_BIN) {
      bin = bytes.subarray(start, start + length);
    }
    offset = start + length;
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { json, bin };
}

function encodeUtf8(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
  // escape/encodeURIComponent round-trip: tiny and good enough for glTF JSON.
  const s = unescape(encodeURIComponent(text));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** A GLB with this JSON and the original BIN chunk. */
function packGlb(json: GltfJson, bin: Uint8Array | null): Uint8Array {
  let jsonBytes = encodeUtf8(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
  const binPad = bin ? (4 - (bin.byteLength % 4)) % 4 : 0;
  const total = 12 + 8 + jsonBytes.byteLength + jsonPad + (bin ? 8 + bin.byteLength + binPad : 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.byteLength + jsonPad, true);
  view.setUint32(16, CHUNK_JSON, true);
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.byteLength, 20 + jsonBytes.byteLength + jsonPad); // spaces
  if (bin) {
    const o = 20 + jsonBytes.byteLength + jsonPad;
    view.setUint32(o, bin.byteLength + binPad, true);
    view.setUint32(o + 4, CHUNK_BIN, true);
    out.set(bin, o + 8);
  }
  jsonBytes = new Uint8Array(0);
  return out;
}

const preparing = new Map<string, Promise<Uint8Array>>();

/** The prepared GLB bytes (textures as sibling files), cached on disk. */
export function prepare(url: string, dir: Directory, source: File): Promise<Uint8Array> {
  const pending = preparing.get(url);
  if (pending) return pending;

  const run = (async () => {
    const prepared = new File(dir, 'prepared.glb');
    if (prepared.exists && (prepared.size ?? 0) > 0) return prepared.bytes();

    const bytes = await source.bytes();
    const { json, bin } = readChunks(bytes);
    const views = json.bufferViews ?? [];
    const conversions: Promise<void>[] = [];
    (json.images ?? []).forEach((image, i) => {
      if (image.bufferView == null || !bin) return;
      const bv = views[image.bufferView];
      if (!bv || bv.buffer !== 0) return;
      const start = bv.byteOffset ?? 0;
      const ext = EXT_BY_MIME[image.mimeType ?? ''] ?? 'bin';
      const name = `tex_${i}.${ext}`;
      const file = new File(dir, name);
      if (file.exists) file.delete();
      file.create();
      file.write(bin.subarray(start, start + bv.byteLength));
      // The bufferView stays in BIN (harmless); the image now loads by URI.
      delete image.bufferView;
      if (ext === 'png' || ext === 'jpg') {
        image.uri = name;
        return;
      }
      const png = new File(dir, `tex_${i}.png`);
      if (png.exists) png.delete();
      image.uri = png.name;
      image.mimeType = 'image/png';
      conversions.push(
        transcodeToPng(plainPath(file), plainPath(png)).then(() => file.delete()),
      );
    });
    await Promise.all(conversions);

    // The images are PNG now: point textures at them directly and drop the
    // WebP extension, so nothing downstream expects WebP.
    for (const texture of json.textures ?? []) {
      const webp = texture.extensions?.[EXT_WEBP];
      if (!webp) continue;
      if (webp.source != null) texture.source = webp.source;
      delete texture.extensions![EXT_WEBP];
      if (Object.keys(texture.extensions!).length === 0) delete texture.extensions;
    }
    json.extensionsUsed = json.extensionsUsed?.filter(e => e !== EXT_WEBP);
    json.extensionsRequired = json.extensionsRequired?.filter(e => e !== EXT_WEBP);
    if (json.extensionsRequired?.length === 0) delete json.extensionsRequired;

    const out = packGlb(json, bin);
    const part = new File(dir, 'prepared.glb.part');
    if (part.exists) part.delete();
    part.create();
    part.write(out);
    if (prepared.exists) prepared.delete();
    part.moveSync(prepared);
    return out;
  })();

  preparing.set(url, run);
  run.finally(() => preparing.delete(url)).catch(() => {});
  return run;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Download (if needed) and prepare a model without parsing it — used to warm
 * the cache for the product page and for the other colourways.
 */
export async function prefetchGlb(url: string): Promise<void> {
  const dir = modelDir(url);
  const source = await download(url, dir, () => {});
  await prepare(url, dir, source);
}

/** True once the model is on disk and prepared (opening it needs no network). */
export function isGlbCached(url: string): boolean {
  try {
    const dir = new Directory(new Directory(Paths.cache, CACHE_ROOT), urlKey(url));
    const prepared = new File(dir, 'prepared.glb');
    return prepared.exists && (prepared.size ?? 0) > 0;
  } catch {
    return false;
  }
}

