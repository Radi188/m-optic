/**
 * Try-on GLB loading for React Native: the cached, prepared GLB (glbCache.ts)
 * parsed by three's GLTFLoader. The second open of a frame is disk-only.
 *
 * Draco / Meshopt: none of the catalog GLBs use them (checked across the whole
 * catalog), and Hermes has no WebAssembly, so the web build's decoders cannot
 * run here. A model that REQUIRES one is rejected with a clear error instead
 * of rendering an empty frame — see the try-on README.
 */

import '@react-three/fiber/native'; // installs the expo-gl TextureLoader
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { download, modelDir, prepare, readChunks, type Progress } from './glbCache';

export type { GLTF, Progress };
export { prefetchGlb, isGlbCached } from './glbCache';

const UNSUPPORTED_ON_NATIVE = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];

/**
 * The parsed glTF. `onProgress` gets 0–1 while downloading (null when the
 * server sends no length); a cached model resolves without calling it.
 */
export async function loadGlb(url: string, onProgress: Progress = () => {}): Promise<GLTF> {
  const dir = modelDir(url);
  const source = await download(url, dir, onProgress);
  const bytes = await prepare(url, dir, source);

  const { json } = readChunks(bytes);
  const required = json.extensionsRequired ?? [];
  const unsupported = required.filter(e => UNSUPPORTED_ON_NATIVE.includes(e));
  if (unsupported.length > 0) {
    throw new Error(
      `GLB requires ${unsupported.join(', ')}, which needs WebAssembly decoders that ` +
        `Hermes cannot run. Re-export it without compression. ${url}`,
    );
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  // Texture URIs are relative, resolved against the model's own folder, so the
  // cache survives the app container moving on update.
  const base = dir.uri.endsWith('/') ? dir.uri : `${dir.uri}/`;
  return new Promise<GLTF>((resolve, reject) => {
    new GLTFLoader().parse(buffer, base, resolve, err => reject(err instanceof Error ? err : new Error(String(err))));
  });
}
