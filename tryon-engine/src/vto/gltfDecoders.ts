/**
 * gltfDecoders.ts — wires the compressed-geometry decoders onto the GLTFLoader
 * used by useGLTF, so eyewear GLBs (which are almost always Draco- or Meshopt-
 * compressed) decode into real meshes instead of parsing to ZERO meshes.
 *
 * WHY THIS EXISTS: drei's useGLTF enables Draco by default but points DRACOLoader
 * at the gstatic CDN (https://www.gstatic.com/draco/…). This project self-hosts
 * everything (see MediaPipe) and can't depend on that CDN, so we disable drei's
 * built-ins (useGLTF(url, false, false, …)) and attach our own SELF-HOSTED
 * decoders here:
 *   • Draco   → /public/draco/ (copied from three/examples/jsm/libs/draco).
 *   • Meshopt → bundled MeshoptDecoder (no network).
 *
 * Decoders are imported from `three/examples/jsm/*` (three is a direct dep; the
 * GLTFLoader drei uses is structurally identical, so the instances interoperate).
 *
 * KTX2/Basis textures (KHR_texture_basisu) are NOT wired here — that needs the
 * live WebGLRenderer for support detection and only affects TEXTURES, not whether
 * meshes appear. Glasses.tsx logs a warning if a model declares it.
 */

import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Minimal GLTFLoader surface we configure. Typed structurally (params `unknown`)
 * so it's assignable from BOTH three's and three-stdlib's GLTFLoader — drei's
 * useGLTF passes a three-stdlib instance, while our decoders come from three.
 */
interface DecoderConfigurableLoader {
  setDRACOLoader(loader: unknown): unknown;
  setMeshoptDecoder(decoder: unknown): unknown;
}

/** Self-hosted Draco decoder directory (draco_wasm_wrapper.js + draco_decoder.wasm). */
const DRACO_DECODER_PATH = '/draco/';

// One shared DRACOLoader (decoder workers are reusable across models).
let dracoLoader: DRACOLoader | null = null;
function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    // Prefer the wasm decoder (smaller + faster than the asm.js fallback).
    dracoLoader.setDecoderConfig({ type: 'wasm' });
  }
  return dracoLoader;
}

/**
 * Stable (module-level) GLTFLoader extender passed to useGLTF. Identity must NOT
 * change per render — drei runs it once when the loader for a URL is created.
 */
export function extendGltfLoader(loader: DecoderConfigurableLoader): void {
  loader.setDRACOLoader(getDracoLoader());
  // three's MeshoptDecoder is an object; some builds expose it as a factory.
  const meshopt =
    typeof MeshoptDecoder === 'function'
      ? (MeshoptDecoder as () => unknown)()
      : MeshoptDecoder;
  loader.setMeshoptDecoder(meshopt);
}
